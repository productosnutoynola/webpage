-- =====================================================================
-- Lógica transaccional: crear pedido (reserva stock), aplicar pago,
-- liberar reservas vencidas, reabastecer. Solo ejecutable por service_role.
-- =====================================================================

-- Bolsas físicas por producto de un pedido.
create or replace function public._order_needs(p_order_id uuid)
returns table (product_id uuid, qty integer)
language sql stable set search_path = '' as $$
  select c.product_id, sum(c.quantity * i.quantity)::integer
  from public.order_items i
  join public.order_item_components c on c.order_item_id = i.id
  where i.order_id = p_order_id
  group by c.product_id
  order by c.product_id;
$$;

-- Libera la reserva de un pedido pendiente.
create or replace function public._release_order_stock(p_order_id uuid, p_note text)
returns void language plpgsql set search_path = '' as $$
declare n record;
begin
  for n in select * from public._order_needs(p_order_id) loop
    update public.inventory set reserved = reserved - n.qty where product_id = n.product_id;
    insert into public.inventory_movements (product_id, reason, reserved_delta, order_id, note)
    values (n.product_id, 'release', -n.qty, p_order_id, p_note);
  end loop;
end $$;

-- Convierte la reserva en venta (descuenta del físico).
create or replace function public._commit_order_stock(p_order_id uuid)
returns void language plpgsql set search_path = '' as $$
declare n record;
begin
  for n in select * from public._order_needs(p_order_id) loop
    update public.inventory
      set on_hand = on_hand - n.qty, reserved = reserved - n.qty
      where product_id = n.product_id;
    insert into public.inventory_movements (product_id, reason, on_hand_delta, reserved_delta, order_id, note)
    values (n.product_id, 'sale', -n.qty, -n.qty, p_order_id, 'Pago aprobado');
  end loop;
end $$;

-- Venta sin reserva previa (pago aprobado después de que la reserva expiró).
create or replace function public._sell_order_stock(p_order_id uuid)
returns void language plpgsql set search_path = '' as $$
declare n record;
begin
  for n in select * from public._order_needs(p_order_id) loop
    update public.inventory set on_hand = on_hand - n.qty
      where product_id = n.product_id and on_hand - reserved >= n.qty;
    if not found then
      raise exception 'OUT_OF_STOCK' using detail = n.product_id::text;
    end if;
    insert into public.inventory_movements (product_id, reason, on_hand_delta, order_id, note)
    values (n.product_id, 'sale', -n.qty, p_order_id, 'Pago aprobado tras vencer la reserva');
  end loop;
end $$;

-- Cancela pedidos pendientes cuya reserva venció y devuelve el stock.
create or replace function public.release_expired_reservations()
returns integer language plpgsql set search_path = '' as $$
declare
  r record;
  n integer := 0;
begin
  for r in
    select id from public.orders
    where status = 'pending_payment' and reserved_until < now()
    for update skip locked
  loop
    perform public._release_order_stock(r.id, 'Reserva vencida');
    update public.orders set status = 'cancelled', cancelled_at = now() where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- create_order: valida el carrito contra el catálogo, calcula precios y
-- envío EN LA BASE (fuente de verdad), reserva stock y registra el pedido.
--
-- p_customer: {email, name, phone, legal_id}
-- p_address:  {city, region, neighborhood, address, notes}
-- p_lines:    [{kind:'flavor', flavor:'<slug>', qty}
--              | {kind:'pack', pack:'<slug>', flavors:['<slug>',...], qty}]
--
-- Errores (SQLSTATE P0001, message): EMPTY_CART, INVALID_LINE,
-- UNKNOWN_PRODUCT, UNKNOWN_BUNDLE, INVALID_FLAVORS, OUT_OF_STOCK (detail = slug).
-- ---------------------------------------------------------------------
create or replace function public.create_order(
  p_customer jsonb,
  p_address jsonb,
  p_lines jsonb,
  p_reservation_minutes integer default 60
) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_customer_id uuid;
  v_address_id uuid;
  v_order_id uuid;
  v_ref text;
  v_zone public.shipping_zones;
  v_city text := trim(p_address ->> 'city');
  v_line jsonb;
  v_qty integer;
  v_product public.products;
  v_bundle public.bundles;
  v_flavors text[];
  v_item_id uuid;
  v_comp_sum integer;
  v_unit integer;
  v_full integer;
  v_gross integer := 0;
  v_subtotal integer := 0;
  v_bags integer := 0;
  v_ship integer;
  n record;
  v_slug text;
begin
  perform public.release_expired_reservations();

  if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  -- Cliente (upsert por correo) y dirección.
  insert into public.customers (email, full_name, phone, legal_id)
  values (
    lower(trim(p_customer ->> 'email')),
    trim(p_customer ->> 'name'),
    nullif(trim(p_customer ->> 'phone'), ''),
    nullif(trim(p_customer ->> 'legal_id'), '')
  )
  on conflict (email) do update set
    full_name = excluded.full_name,
    phone = coalesce(excluded.phone, public.customers.phone),
    legal_id = coalesce(excluded.legal_id, public.customers.legal_id)
  returning id into v_customer_id;

  insert into public.addresses (customer_id, city, region, neighborhood, address_line, delivery_notes)
  values (
    v_customer_id, v_city, trim(p_address ->> 'region'),
    nullif(trim(p_address ->> 'neighborhood'), ''), trim(p_address ->> 'address'),
    nullif(trim(p_address ->> 'notes'), '')
  )
  returning id into v_address_id;

  select * into v_zone from public.shipping_zones
  where code = case when v_city = 'Bogotá' then 'bogota' else 'nacional' end and active;
  if not found then raise exception 'NO_SHIPPING_ZONE'; end if;

  v_ref := 'NYN-' || to_char(now() at time zone 'America/Bogota', 'YYMMDD') || '-'
           || upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into public.orders (
    reference, customer_id, address_id, ship_name, ship_phone, ship_city, ship_region,
    ship_neighborhood, ship_address, ship_notes, shipping_zone, reserved_until
  ) values (
    v_ref, v_customer_id, v_address_id, trim(p_customer ->> 'name'), trim(p_customer ->> 'phone'),
    v_city, trim(p_address ->> 'region'), nullif(trim(p_address ->> 'neighborhood'), ''),
    trim(p_address ->> 'address'), nullif(trim(p_address ->> 'notes'), ''), v_zone.code,
    now() + make_interval(mins => p_reservation_minutes)
  ) returning id into v_order_id;

  -- Ítems
  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_qty := (v_line ->> 'qty')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 20 then raise exception 'INVALID_LINE'; end if;

    if v_line ->> 'kind' = 'flavor' then
      select * into v_product from public.products where slug = v_line ->> 'flavor' and active;
      if not found then raise exception 'UNKNOWN_PRODUCT' using detail = coalesce(v_line ->> 'flavor', ''); end if;

      insert into public.order_items (order_id, kind, product_id, name, flavors, unit_full_price_cop, unit_price_cop, quantity)
      values (v_order_id, 'product', v_product.id, v_product.name, array[v_product.slug], v_product.price_cop, v_product.price_cop, v_qty)
      returning id into v_item_id;
      insert into public.order_item_components (order_item_id, product_id, quantity) values (v_item_id, v_product.id, 1);

      v_gross := v_gross + v_product.price_cop * v_qty;
      v_subtotal := v_subtotal + v_product.price_cop * v_qty;
      v_bags := v_bags + v_qty;

    elsif v_line ->> 'kind' = 'pack' then
      select * into v_bundle from public.bundles where slug = v_line ->> 'pack' and active;
      if not found then raise exception 'UNKNOWN_BUNDLE' using detail = coalesce(v_line ->> 'pack', ''); end if;

      if v_bundle.flavors_fixed then
        select array_agg(p.slug order by p.sort_order) into v_flavors
        from public.bundle_items bi
        join public.products p on p.id = bi.product_id
        cross join lateral generate_series(1, bi.quantity)
        where bi.bundle_id = v_bundle.id;
      else
        select array_agg(x) into v_flavors from jsonb_array_elements_text(coalesce(v_line -> 'flavors', '[]')) x;
      end if;

      if coalesce(array_length(v_flavors, 1), 0) <> v_bundle.bag_count
         or exists (
           select 1 from unnest(v_flavors) s
           where not exists (select 1 from public.products p where p.slug = s and p.active)
         ) then
        raise exception 'INVALID_FLAVORS' using detail = v_bundle.slug;
      end if;

      select sum(p.price_cop)::integer into v_comp_sum
      from unnest(v_flavors) s join public.products p on p.slug = s;

      v_full := v_comp_sum + v_bundle.extra_fee_cop;
      v_unit := round(v_comp_sum * (1 - v_bundle.discount_rate))::integer + v_bundle.extra_fee_cop;

      insert into public.order_items (order_id, kind, bundle_id, name, flavors, unit_full_price_cop, unit_price_cop, quantity)
      values (v_order_id, 'bundle', v_bundle.id, v_bundle.name, v_flavors, v_full, v_unit, v_qty)
      returning id into v_item_id;
      insert into public.order_item_components (order_item_id, product_id, quantity)
      select v_item_id, p.id, count(*)::integer
      from unnest(v_flavors) s join public.products p on p.slug = s
      group by p.id;

      v_gross := v_gross + v_full * v_qty;
      v_subtotal := v_subtotal + v_unit * v_qty;
      v_bags := v_bags + v_bundle.bag_count * v_qty;
    else
      raise exception 'INVALID_LINE';
    end if;
  end loop;

  -- Reserva de stock (orden fijo de product_id para evitar deadlocks).
  for n in select * from public._order_needs(v_order_id) loop
    update public.inventory set reserved = reserved + n.qty
    where product_id = n.product_id and on_hand - reserved >= n.qty;
    if not found then
      select slug into v_slug from public.products where id = n.product_id;
      raise exception 'OUT_OF_STOCK' using detail = v_slug;
    end if;
    insert into public.inventory_movements (product_id, reason, reserved_delta, order_id, note)
    values (n.product_id, 'reservation', n.qty, v_order_id, 'Checkout ' || v_ref);
  end loop;

  v_ship := case when v_subtotal >= v_zone.free_from_cop then 0 else v_zone.fee_cop end;

  update public.orders set
    gross_cop = v_gross,
    discount_cop = v_gross - v_subtotal,
    subtotal_cop = v_subtotal,
    shipping_cop = v_ship,
    total_cop = v_subtotal + v_ship
  where id = v_order_id;

  return jsonb_build_object(
    'order_id', v_order_id,
    'reference', v_ref,
    'city', v_city,
    'eta_days', v_zone.eta_days,
    'totals', jsonb_build_object(
      'bags', v_bags,
      'gross', v_gross,
      'discount', v_gross - v_subtotal,
      'subtotal', v_subtotal,
      'shipping', v_ship,
      'freeFrom', v_zone.free_from_cop,
      'free', v_subtotal >= v_zone.free_from_cop,
      'total', v_subtotal + v_ship
    )
  );
end $$;

-- ---------------------------------------------------------------------
-- apply_payment: registra/actualiza la transacción y mueve el pedido.
-- Idempotente: se puede llamar desde el webhook y desde la redirección.
-- Devuelve el estado resultante del pedido (null si la referencia no existe).
-- ---------------------------------------------------------------------
create or replace function public.apply_payment(
  p_reference text,
  p_provider_tx_id text,
  p_status public.payment_status,
  p_amount_in_cents bigint,
  p_payment_method text default null,
  p_raw jsonb default null
) returns public.order_status
language plpgsql set search_path = '' as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where reference = p_reference for update;
  if not found then return null; end if;

  insert into public.payments (order_id, provider, provider_tx_id, status, amount_in_cents, payment_method, raw)
  values (v_order.id, 'wompi', p_provider_tx_id, p_status, p_amount_in_cents, p_payment_method, p_raw)
  on conflict (provider, provider_tx_id) do update set
    status = excluded.status,
    amount_in_cents = excluded.amount_in_cents,
    payment_method = coalesce(excluded.payment_method, public.payments.payment_method),
    raw = coalesce(excluded.raw, public.payments.raw);

  -- Estados ya resueltos no se tocan.
  if v_order.status not in ('pending_payment', 'payment_failed', 'cancelled') then
    return v_order.status;
  end if;

  if p_status = 'APPROVED' then
    if p_amount_in_cents <> v_order.amount_in_cents then
      if v_order.status = 'pending_payment' then
        perform public._release_order_stock(v_order.id, 'Monto pagado no coincide');
      end if;
      update public.orders set status = 'needs_review',
        admin_notes = concat_ws(E'\n', admin_notes, format('Monto pagado %s ≠ esperado %s (tx %s)', p_amount_in_cents, v_order.amount_in_cents, p_provider_tx_id))
      where id = v_order.id;
      return 'needs_review';
    end if;

    if v_order.status = 'pending_payment' then
      perform public._commit_order_stock(v_order.id);
    else
      begin
        perform public._sell_order_stock(v_order.id);
      exception when others then
        update public.orders set status = 'needs_review',
          admin_notes = concat_ws(E'\n', admin_notes, 'Pago aprobado sin stock disponible: contactar al cliente o reembolsar')
        where id = v_order.id;
        return 'needs_review';
      end;
    end if;
    update public.orders set status = 'paid', paid_at = now(), reserved_until = null where id = v_order.id;
    return 'paid';

  elsif p_status in ('DECLINED', 'ERROR', 'VOIDED') and v_order.status = 'pending_payment' then
    perform public._release_order_stock(v_order.id, 'Pago ' || p_status::text);
    update public.orders set status = 'payment_failed', reserved_until = null where id = v_order.id;
    return 'payment_failed';
  end if;

  return v_order.status;
end $$;

-- ---------------------------------------------------------------------
-- Operación: reabastecer / ajustar inventario.
--   select public.restock('cinnamon-roll', 50, 'Horneada 12 oct');
--   select public.adjust_stock('cacao-crunch', -2, 'Bolsas dañadas');
-- ---------------------------------------------------------------------
create or replace function public.restock(p_slug text, p_qty integer, p_note text default null)
returns integer language plpgsql set search_path = '' as $$
declare v_id uuid; v_on_hand integer;
begin
  if p_qty <= 0 then raise exception 'La cantidad debe ser positiva'; end if;
  select id into v_id from public.products where slug = p_slug;
  if not found then raise exception 'Producto % no existe', p_slug; end if;
  insert into public.inventory (product_id, on_hand) values (v_id, p_qty)
  on conflict (product_id) do update set on_hand = public.inventory.on_hand + p_qty
  returning on_hand into v_on_hand;
  insert into public.inventory_movements (product_id, reason, on_hand_delta, note) values (v_id, 'restock', p_qty, p_note);
  return v_on_hand;
end $$;

create or replace function public.adjust_stock(p_slug text, p_delta integer, p_note text)
returns integer language plpgsql set search_path = '' as $$
declare v_id uuid; v_on_hand integer;
begin
  select id into v_id from public.products where slug = p_slug;
  if not found then raise exception 'Producto % no existe', p_slug; end if;
  update public.inventory set on_hand = on_hand + p_delta where product_id = v_id returning on_hand into v_on_hand;
  insert into public.inventory_movements (product_id, reason, on_hand_delta, note) values (v_id, 'adjustment', p_delta, p_note);
  return v_on_hand;
end $$;

-- ---------------------------------------------------------------------
-- Vistas de operación (panel de Supabase / reportes)
-- ---------------------------------------------------------------------
create or replace view public.inventory_status with (security_invoker = true) as
select p.slug, p.name, i.on_hand, i.reserved, i.on_hand - i.reserved as available,
       (i.on_hand - i.reserved) <= i.low_stock_threshold as low_stock, i.updated_at
from public.products p
join public.inventory i on i.product_id = p.id
order by p.sort_order;

create or replace view public.orders_overview with (security_invoker = true) as
select o.reference, o.status, o.created_at, o.paid_at, c.full_name, c.email, o.ship_phone,
       o.ship_city, o.ship_address, o.total_cop,
       (select string_agg(i.quantity || '× ' || i.name
                || case when i.kind = 'bundle' then ' (' || array_to_string(i.flavors, ', ') || ')' else '' end, '; ')
        from public.order_items i where i.order_id = o.id) as items,
       (select p.payment_method from public.payments p where p.order_id = o.id and p.status = 'APPROVED' limit 1) as payment_method
from public.orders o
join public.customers c on c.id = o.customer_id
order by o.created_at desc;

create or replace view public.sales_daily with (security_invoker = true) as
select (o.paid_at at time zone 'America/Bogota')::date as day,
       count(*) as orders,
       sum(o.total_cop) as revenue_cop,
       sum(o.discount_cop) as discounts_cop,
       sum(o.shipping_cop) as shipping_cop
from public.orders o
where o.status in ('paid', 'preparing', 'shipped', 'delivered')
group by 1
order by 1 desc;

-- ---------------------------------------------------------------------
-- Permisos: nadie salvo service_role ejecuta la lógica ni lee las vistas.
-- ---------------------------------------------------------------------
revoke all on function
  public._order_needs(uuid), public._release_order_stock(uuid, text), public._commit_order_stock(uuid),
  public._sell_order_stock(uuid), public.release_expired_reservations(),
  public.create_order(jsonb, jsonb, jsonb, integer),
  public.apply_payment(text, text, public.payment_status, bigint, text, jsonb),
  public.restock(text, integer, text), public.adjust_stock(text, integer, text)
from public, anon, authenticated;

grant execute on function
  public.create_order(jsonb, jsonb, jsonb, integer),
  public.apply_payment(text, text, public.payment_status, bigint, text, jsonb),
  public.release_expired_reservations(),
  public.restock(text, integer, text), public.adjust_stock(text, integer, text)
to service_role;

revoke all on public.inventory_status, public.orders_overview, public.sales_daily from anon, authenticated;
