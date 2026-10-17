-- Tienda administrable: todo lo que muestra el sitio sale de estas tablas
-- (antes vivía en lib/catalog.ts). Fotos en el bucket público "productos".

-- ---------------------------------------------------------------- productos
alter table public.products
  add column category text not null default 'Granola',
  add column ink_hex text not null default '#5F1637',
  add column photo_bg_hex text not null default '#E9D8BF',
  add column image_position text not null default '50% 50%',
  add column image_blend boolean not null default false,
  add column show_label boolean not null default true,
  add column label_top integer not null default 42 check (label_top between 10 and 90),
  add column label_meta text,
  add column badge text,
  add column reviews_count integer not null default 0 check (reviews_count >= 0),
  add column servings_label text,
  add column gallery jsonb not null default '[]' check (jsonb_typeof(gallery) = 'array'),
  add column nutrition jsonb not null default '[]' check (jsonb_typeof(nutrition) = 'array'),
  add column pack_eligible boolean not null default true;

alter table public.products
  add constraint products_color_hex check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint products_ink_hex check (ink_hex ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint products_photo_bg_hex check (photo_bg_hex ~ '^#[0-9A-Fa-f]{6}$');

-- Contenido actual del sitio (antes en lib/catalog.ts).
update public.products set
  ink_hex = '#5F1637', photo_bg_hex = '#DEA12C', image_position = '50% 45%', image_blend = true,
  label_top = 41, label_meta = 'canela', badge = 'Más vendida', reviews_count = 128
where slug = 'cinnamon-roll';
update public.products set
  ink_hex = '#EFB0CB', photo_bg_hex = '#C9AB8B', image_position = '22% 30%', image_blend = false,
  label_top = 44, label_meta = 'cacao 58 %', reviews_count = 94
where slug = 'melted-cocoa';
update public.products set
  ink_hex = '#5F1637', photo_bg_hex = '#EFB0CB', image_position = '32% 38%', image_blend = false,
  label_top = 42, label_meta = 'arándanos', reviews_count = 71
where slug = 'berries';

update public.products set
  servings_label = '14 porciones · IVA incluido',
  gallery = '[{"src":"/img/granola-tray.jpg","alt":"Textura de la granola"},{"src":"/img/bowl.jpg","alt":"Servida en bowl"},{"src":"/img/flatlay.jpg","alt":"En la mesa del desayuno"}]',
  nutrition = '[["Porción","35 g"],["Calorías","158 kcal"],["Proteína","8 g"],["Grasa total","9 g"],["Fibra","5 g"]]'
where slug in ('cinnamon-roll', 'melted-cocoa', 'berries');

-- ---------------------------------------------------------------- packs
alter table public.bundles
  add column card_label text,
  add column chip text,
  add column cta text,
  add column theme text not null default 'crema' check (theme in ('crema', 'mostaza', 'rosa', 'ciruela')),
  add column featured boolean not null default false;

update public.bundles set theme = 'crema', description = 'Dos bolsas de los sabores que elijas. Para probar de a poco.', cta = 'Agregar Pack Dúo' where slug = 'duo';
update public.bundles set theme = 'mostaza', featured = true, description = 'Un sabor de cada uno. Envío gratis en Bogotá.', cta = 'Agregar Trío' where slug = 'trio';
update public.bundles set theme = 'ciruela', description = 'Dos de cada sabor. El mejor precio por bolsa de toda la tienda.', cta = 'Agregar Familiar' where slug = 'familiar';
update public.bundles set theme = 'rosa', card_label = '2 bolsas + caja', chip = 'Regalo', cta = 'Agregar Caja Regalo',
  description = 'Dos sabores a elección en caja rígida con tarjeta escrita a mano. Llega lista para entregar.' where slug = 'regalo';

-- ---------------------------------------------------------------- envíos por ciudad
-- city = null → tarifa por defecto (código 'nacional'); city = 'Medellín' → tarifa propia.
alter table public.shipping_zones add column city text unique;
update public.shipping_zones set city = 'Bogotá' where code = 'bogota';

create or replace function public._shipping_zone_for(p_city text) returns public.shipping_zones
language sql stable set search_path = '' as $$
  select z.* from public.shipping_zones z
  where z.active and (z.city = p_city or z.code = 'nacional')
  order by (z.city = p_city) desc nulls last
  limit 1;
$$;

-- ---------------------------------------------------------------- create_order
-- Igual a la versión anterior salvo: zona de envío por ciudad y packs solo con
-- productos habilitados para packs.
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

-- ---------------------------------------------------------------- clientes (panel)
create or replace function public.admin_customers(p_q text default null)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(row_to_json(c) order by c.last_order_at desc nulls last, c.created_at desc), '[]')
  from (
    select cu.email, cu.full_name, cu.phone, cu.legal_id, cu.created_at,
           count(o.id) filter (where public._is_sale(o.status))::int as orders,
           coalesce(sum(o.total_cop) filter (where public._is_sale(o.status)), 0)::int as spent,
           max(o.paid_at) as last_order_at,
           (select o2.ship_city from public.orders o2 where o2.customer_id = cu.id order by o2.created_at desc limit 1) as city
    from public.customers cu
    left join public.orders o on o.customer_id = cu.id
    where p_q is null or p_q = ''
       or cu.email ilike '%' || p_q || '%' or cu.full_name ilike '%' || p_q || '%'
       or cu.phone ilike '%' || p_q || '%' or cu.legal_id ilike '%' || p_q || '%'
    group by cu.id
    limit 500
  ) c;
$$;

-- Ajuste de stock a un valor exacto (conteo físico).
create or replace function public.set_stock(p_slug text, p_on_hand integer, p_note text default null)
returns integer language plpgsql set search_path = '' as $$
declare v_id uuid; v_cur integer; v_res integer;
begin
  if p_on_hand < 0 then raise exception 'NEGATIVE_STOCK'; end if;
  select id into v_id from public.products where slug = p_slug;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
  insert into public.inventory (product_id, on_hand) values (v_id, 0) on conflict (product_id) do nothing;
  select on_hand, reserved into v_cur, v_res from public.inventory where product_id = v_id for update;
  if p_on_hand < v_res then raise exception 'BELOW_RESERVED' using detail = v_res::text; end if;
  if p_on_hand <> v_cur then
    update public.inventory set on_hand = p_on_hand where product_id = v_id;
    insert into public.inventory_movements (product_id, reason, on_hand_delta, note)
    values (v_id, 'adjustment', p_on_hand - v_cur, coalesce(p_note, 'Conteo desde el panel'));
  end if;
  return p_on_hand;
end $$;

revoke all on function public._shipping_zone_for(text), public.admin_customers(text), public.set_stock(text, integer, text)
  from public, anon, authenticated;
grant execute on function public._shipping_zone_for(text), public.admin_customers(text), public.set_stock(text, integer, text)
  to service_role;

-- ---------------------------------------------------------------- fotos
-- Bucket público de solo lectura; las subidas las hace el servidor con service_role.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('productos', 'productos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
  end if;
end $$;
