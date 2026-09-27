-- Índices para las llaves foráneas que señaló el asesor de rendimiento de Supabase.
create index if not exists bundle_items_product_idx on public.bundle_items (product_id);
create index if not exists order_item_components_product_idx on public.order_item_components (product_id);
create index if not exists order_items_bundle_idx on public.order_items (bundle_id);
create index if not exists order_items_product_idx on public.order_items (product_id);
create index if not exists orders_address_idx on public.orders (address_id);
create index if not exists orders_shipping_zone_idx on public.orders (shipping_zone);
