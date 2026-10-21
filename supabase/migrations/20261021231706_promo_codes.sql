-- Códigos promocionales: % de descuento sobre el subtotal o envío gratis.
-- place_order = create_order + p_promo (nombre nuevo para no crear una
-- sobrecarga ambigua de create_order; el sitio usa place_order).

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{4,24}$'),
  kind text not null check (kind in ('percent', 'free_shipping')),
  percent integer check (percent in (5, 10, 15, 20, 30, 40, 50)),
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  check ((kind = 'percent') = (percent is not null))
);
alter table public.promo_codes enable row level security;

alter table public.orders
  add column if not exists promo_code text references public.promo_codes (code) on update cascade,
  add column if not exists promo_discount_cop integer not null default 0 check (promo_discount_cop >= 0),
  add column if not exists promo_shipping_waived_cop integer not null default 0 check (promo_shipping_waived_cop >= 0);
create index if not exists orders_promo_code_idx on public.orders (promo_code) where promo_code is not null;

-- Validación para el checkout (antes de crear el pedido).
create or replace function public.check_promo(p_code text) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('code', code, 'kind', kind, 'percent', percent)
  from public.promo_codes where code = upper(trim(p_code)) and active;
$$;

-- Métricas por código para el panel.
create or replace function public.admin_promo_stats() returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(row_to_json(x) order by x.created_at desc), '[]')
  from (
    select p.code, p.kind, p.percent, p.active, p.note, p.created_at,
      count(o.id) filter (where public._is_sale(o.status))::int as uses,
      count(o.id) filter (where o.status = 'pending_payment')::int as pending,
      count(distinct o.customer_id) filter (where public._is_sale(o.status))::int as customers,
      coalesce(sum(o.total_cop) filter (where public._is_sale(o.status)), 0)::int as revenue,
      coalesce(sum(o.promo_discount_cop + o.promo_shipping_waived_cop) filter (where public._is_sale(o.status)), 0)::int as discount,
      max(o.paid_at) filter (where public._is_sale(o.status)) as last_used,
      (select coalesce(jsonb_agg(jsonb_build_object('name', it.name, 'units', it.units, 'revenue', it.revenue) order by it.units desc), '[]')
         from (select i.name, sum(i.quantity)::int as units, sum(i.line_total_cop)::int as revenue
               from public.orders o2 join public.order_items i on i.order_id = o2.id
               where o2.promo_code = p.code and public._is_sale(o2.status)
               group by i.name) it) as items,
      (select coalesce(jsonb_agg(jsonb_build_object('city', c.city, 'orders', c.n) order by c.n desc), '[]')
         from (select o3.ship_city as city, count(*)::int as n from public.orders o3
               where o3.promo_code = p.code and public._is_sale(o3.status)
               group by o3.ship_city order by n desc limit 5) c) as cities
    from public.promo_codes p
    left join public.orders o on o.promo_code = p.code
    group by p.id
  ) x;
$$;

create or replace function public.place_order(
  p_customer jsonb,
  p_address jsonb,
  p_lines jsonb,
  p_promo text default null,
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
  v_promo public.promo_codes;
  v_promo_disc integer := 0;
  v_waived integer := 0;
begin
  perform public.release_expired_reservations();

  if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  if nullif(trim(p_promo), '') is not null then
    select * into v_promo from public.promo_codes where code = upper(trim(p_promo)) and active;
    if not found then raise exception 'INVALID_PROMO'; end if;
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

  -- Código promocional: % sobre el subtotal (ya con descuento de packs) o envío gratis.
  if v_promo.code is not null then
    if v_promo.kind = 'percent' then
      v_promo_disc := round(v_subtotal * v_promo.percent / 100.0)::integer;
    else
      v_waived := v_ship;
      v_ship := 0;
    end if;
  end if;

  update public.orders set
    gross_cop = v_gross,
    discount_cop = v_gross - v_subtotal,
    subtotal_cop = v_subtotal,
    shipping_cop = v_ship,
    promo_code = v_promo.code,
    promo_discount_cop = v_promo_disc,
    promo_shipping_waived_cop = v_waived,
    total_cop = v_subtotal - v_promo_disc + v_ship
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
      'free', v_ship = 0,
      'promoCode', v_promo.code,
      'promoDiscount', v_promo_disc,
      'shippingWaived', v_waived,
      'total', v_subtotal - v_promo_disc + v_ship
    )
  );
end $$;

revoke all on function public.check_promo(text), public.admin_promo_stats(),
  public.place_order(jsonb, jsonb, jsonb, text, integer) from public, anon, authenticated;
grant execute on function public.check_promo(text), public.admin_promo_stats(),
  public.place_order(jsonb, jsonb, jsonb, text, integer) to service_role;
