-- El documento de identidad identifica al cliente: los pedidos con el mismo
-- documento quedan en el mismo cliente aunque cambie el correo. Se guarda sin
-- puntos ni guiones ("1.020.304-050" → "1020304050").

create or replace function public._normalize_doc(p text) returns text
language sql immutable set search_path = '' as $$
  select nullif(upper(regexp_replace(coalesce(p, ''), '[^0-9A-Za-z]', '', 'g')), '');
$$;

update public.customers set legal_id = public._normalize_doc(legal_id)
where legal_id is distinct from public._normalize_doc(legal_id);

create index if not exists customers_legal_id_idx on public.customers (legal_id);

-- Cliente del pedido: 1) por documento, 2) por correo, 3) nuevo.
create or replace function public._resolve_customer(p_customer jsonb) returns uuid
language plpgsql set search_path = '' as $$
declare
  v_id uuid;
  v_email text := lower(trim(p_customer ->> 'email'));
  v_name text := trim(p_customer ->> 'name');
  v_phone text := nullif(trim(p_customer ->> 'phone'), '');
  v_doc text := public._normalize_doc(p_customer ->> 'legal_id');
begin
  if v_doc is not null then
    select id into v_id from public.customers where legal_id = v_doc order by created_at limit 1;
  end if;

  if v_id is not null then
    update public.customers set
      full_name = v_name,
      phone = coalesce(v_phone, phone),
      -- El correo nuevo pasa a ser el de contacto si nadie más lo usa.
      email = case when exists (select 1 from public.customers c where c.email = v_email and c.id <> v_id) then email else v_email end
    where id = v_id;
    return v_id;
  end if;

  insert into public.customers (email, full_name, phone, legal_id)
  values (v_email, v_name, v_phone, v_doc)
  on conflict (email) do update set
    full_name = excluded.full_name,
    phone = coalesce(excluded.phone, public.customers.phone),
    legal_id = coalesce(excluded.legal_id, public.customers.legal_id)
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public._normalize_doc(text), public._resolve_customer(jsonb) from public, anon, authenticated;
grant execute on function public._normalize_doc(text), public._resolve_customer(jsonb) to service_role;

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

  v_customer_id := public._resolve_customer(p_customer);

  insert into public.addresses (customer_id, city, region, neighborhood, address_line, delivery_notes)
  values (
    v_customer_id, v_city, trim(p_address ->> 'region'),
    nullif(trim(p_address ->> 'neighborhood'), ''), trim(p_address ->> 'address'),
    nullif(trim(p_address ->> 'notes'), '')
  )
  returning id into v_address_id;

  v_zone := public._shipping_zone_for(v_city);
  if v_zone.code is null then raise exception 'NO_SHIPPING_ZONE'; end if;

  loop
    v_ref := (1000000000 + floor(random() * 9000000000))::bigint::text;
    exit when not exists (select 1 from public.orders where reference = v_ref);
  end loop;

  insert into public.orders (
    reference, customer_id, address_id, ship_name, ship_phone, ship_city, ship_region,
    ship_neighborhood, ship_address, ship_notes, shipping_zone, reserved_until
  ) values (
    v_ref, v_customer_id, v_address_id, trim(p_customer ->> 'name'), trim(p_customer ->> 'phone'),
    v_city, trim(p_address ->> 'region'), nullif(trim(p_address ->> 'neighborhood'), ''),
    trim(p_address ->> 'address'), nullif(trim(p_address ->> 'notes'), ''), v_zone.code,
    now() + make_interval(mins => p_reservation_minutes)
  ) returning id into v_order_id;

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
           where not exists (
             select 1 from public.products p
             where p.slug = s and p.active and (p.pack_eligible or v_bundle.flavors_fixed)
           )
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
