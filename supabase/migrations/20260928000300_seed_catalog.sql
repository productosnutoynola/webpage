-- GENERADO por scripts/gen-seed.ts desde lib/catalog.ts. No editar a mano.
-- Catálogo inicial. Inventario en 0: cargar el stock real con public.restock().

insert into public.products (slug, sku, name, short_description, description, ingredients, price_cop, image_url, color_hex, sort_order) values
  ('cinnamon-roll', 'NYN-CIN', 'Cinnamon Roll', 'Canela de Ceilán, macadamia y marañón tostados. Huele a panadería a las 7 a.m.', 'Avena tostada con canela de Ceilán, macadamia y marañón, horneada lento hasta formar clusters del tamaño de una moneda. Es la que más se repite: huele a panadería a las 7 de la mañana y desaparece de la bolsa sin que te des cuenta.', 'Avena en hojuelas, almendra, marañón, macadamia, semillas de calabaza, coco deshidratado, canela de Ceilán, aceite de coco, sal marina.', 37000, '/img/bag-table.jpg', '#DEA12C', 1),
  ('cacao-crunch', 'NYN-CAC', 'Cacao Crunch', 'Cacao colombiano 70 %, almendra tostada y nibs enteros. Postre disfrazado de desayuno.', 'Cacao colombiano al 70 % amasado con la avena antes de hornear, más almendra tostada y nibs enteros que crujen distinto. Amarga en el mejor sentido: es postre disfrazado de desayuno y funciona brutal sobre helado de vainilla.', 'Avena en hojuelas, almendra, marañón, cacao en polvo 70 %, nibs de cacao, semillas de calabaza, aceite de coco, extracto de vainilla, sal marina.', 37000, '/img/mockups.jpg', '#5F1637', 2),
  ('frutos-rojos', 'NYN-ROJ', 'Frutos Rojos', 'Arándano, fresa y uchuva deshidratados. Ácida y fresca; brutal con yogur griego.', 'Arándano, fresa y uchuva deshidratados sin azúcar, con avena tostada y almendra laminada. Ácida, fresca y con la acidez justa para cortar lo dulce del yogur griego. La favorita de quienes dicen que la granola les empalaga.', 'Avena en hojuelas, almendra laminada, marañón, arándano deshidratado, fresa deshidratada, uchuva deshidratada, semillas de girasol, aceite de coco, sal marina.', 37000, '/img/bag-honey.jpg', '#EFB0CB', 3)
on conflict (slug) do nothing;

insert into public.bundles (slug, name, description, bag_count, discount_rate, extra_fee_cop, flavors_fixed, sort_order) values
  ('duo', 'Pack Dúo', 'Dos bolsas de los sabores que elijas.', 2, 0.08, 0, false, 1),
  ('trio', 'Trío completo', 'Un sabor de cada uno.', 3, 0.15, 0, true, 2),
  ('familiar', 'Pack Familiar', 'Dos de cada sabor.', 6, 0.22, 0, true, 3),
  ('regalo', 'Caja Regalo', 'Dos sabores a elección en caja rígida con tarjeta escrita a mano.', 2, 0.08, 14000, false, 4)
on conflict (slug) do nothing;

insert into public.bundle_items (bundle_id, product_id, quantity)
select b.id, p.id, v.qty
from (values ('cinnamon-roll', 1), ('cacao-crunch', 1), ('frutos-rojos', 1)) as v(slug, qty)
join public.products p on p.slug = v.slug
cross join public.bundles b
where b.slug = 'trio'
on conflict do nothing;

insert into public.bundle_items (bundle_id, product_id, quantity)
select b.id, p.id, v.qty
from (values ('cinnamon-roll', 2), ('cacao-crunch', 2), ('frutos-rojos', 2)) as v(slug, qty)
join public.products p on p.slug = v.slug
cross join public.bundles b
where b.slug = 'familiar'
on conflict do nothing;

insert into public.shipping_zones (code, name, fee_cop, free_from_cop, eta_days) values
  ('bogota', 'Bogotá', 12000, 100000, 2),
  ('nacional', 'Resto del país', 18000, 150000, 4)
on conflict (code) do nothing;

insert into public.inventory (product_id, on_hand)
select id, 0 from public.products
on conflict (product_id) do nothing;
