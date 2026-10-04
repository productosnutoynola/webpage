-- Renombra sabores: Cacao Crunch → Melted Cocoa, Frutos Rojos → Berries,
-- y actualiza ingredientes y descripciones según la receta vigente.
update public.products set
  slug = 'melted-cocoa', sku = 'NYN-MEL', name = 'Melted Cocoa',
  short_description = 'Cocoa sin azúcar y cacao amargo al 58 %. Postre disfrazado de desayuno.',
  description = 'Cocoa en polvo sin azúcar y cacao amargo al 58 % con avena, almendras y pecanas tostadas. Intensa en el mejor sentido: es postre disfrazado de desayuno y funciona brutal sobre helado de vainilla.',
  ingredients = 'Avena + almendras + pecanas + semillas de calabaza + 25 g azúcar de dátiles + 20 g miel + stevia + aceite de coco + vainilla + cocoa sin azúcar en polvo + cacao amargo al 58 %'
where slug = 'cacao-crunch';

update public.products set
  slug = 'berries', sku = 'NYN-BER', name = 'Berries',
  short_description = 'Arándanos deshidratados con un toque de canela. Fresca y brutal con yogur griego.',
  description = 'Arándanos deshidratados con avena, almendras y pecanas tostadas y un toque de canela. Fresca y con la acidez justa para cortar lo dulce del yogur griego. La favorita de quienes dicen que la granola les empalaga.',
  ingredients = 'Avena + almendras + pecanas + semillas de calabaza + 25 g azúcar de dátiles + 20 g miel + stevia + aceite de coco + canela + vainilla + arándanos deshidratados'
where slug = 'frutos-rojos';

update public.products set
  short_description = 'Canela, vainilla, almendras y pecanas tostadas. Huele a panadería a las 7 a.m.',
  description = 'Avena tostada con almendras, pecanas y semillas de calabaza, con canela y vainilla, horneada lento hasta formar clusters del tamaño de una moneda. Es la que más se repite: huele a panadería a las 7 de la mañana y desaparece de la bolsa sin que te des cuenta.',
  ingredients = 'Avena + almendras + pecanas + semillas de calabaza + 25 g azúcar de dátiles + 20 g miel + stevia + aceite de coco + canela + vainilla'
where slug = 'cinnamon-roll';

-- Slugs guardados en ítems de pedidos existentes (historial coherente).
update public.order_items set flavors = array_replace(array_replace(flavors, 'cacao-crunch', 'melted-cocoa'), 'frutos-rojos', 'berries')
where flavors && array['cacao-crunch', 'frutos-rojos'];
update public.order_items set name = 'Melted Cocoa' where kind = 'product' and name = 'Cacao Crunch';
update public.order_items set name = 'Berries' where kind = 'product' and name = 'Frutos Rojos';
