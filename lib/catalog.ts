// Tipos del catálogo y valores de respaldo. La fuente real es Supabase
// (products, bundles, shipping_zones), que se edita desde /admin/tienda;
// DEFAULT_CATALOG solo se usa si la base no responde.

export type Flavor = {
  key: string;
  name: string;
  price: number;
  category: string;
  /** Color de la etiqueta y de la sombra de la tarjeta. */
  color: string;
  /** Color del texto sobre la etiqueta. */
  ink: string;
  /** Fondo detrás de la foto mientras carga / para el blend. */
  photoBg: string;
  img: string;
  objectPosition: string;
  blend: boolean;
  /** Altura (%) de la etiqueta dibujada sobre la foto; null = sin etiqueta. */
  labelTop: number | null;
  short: string;
  long: string;
  ingredients: string;
  meta: string;
  reviews: number;
  badge: string | null;
  servings: string;
  gallery: { src: string; alt: string }[];
  nutrition: [string, string][];
  /** Puede elegirse dentro de los packs de libre elección. */
  packEligible: boolean;
};

export type PackTheme = "crema" | "mostaza" | "rosa" | "ciruela";

export type Pack = {
  key: string;
  name: string;
  description: string;
  bags: number;
  /** Descuento sobre el valor de las bolsas. */
  rate: number;
  /** Cargo adicional sin descuento (caja + tarjeta del regalo). */
  extra: number;
  /** Sabores fijos; si es null el cliente elige `bags` sabores. */
  fixed: string[] | null;
  label: string | null;
  chip: string | null;
  cta: string | null;
  theme: PackTheme;
  /** Botón destacado en la portada. */
  featured: boolean;
};

export type ShippingRule = { fee: number; freeFrom: number; etaDays: number };
/** Tarifa por ciudad; las ciudades sin tarifa propia usan `default`. */
export type ShippingRules = { default: ShippingRule; cities: Record<string, ShippingRule> };

export type Catalog = { flavors: Flavor[]; packs: Pack[]; shipping: ShippingRules };

export const MAX_QTY = 20;

export function shippingFor(rules: ShippingRules, city: string): ShippingRule {
  return rules.cities[city] ?? rules.default;
}

export function findFlavor(cat: Catalog, key: string): Flavor | undefined {
  return cat.flavors.find((f) => f.key === key);
}

export function findPack(cat: Catalog, key: string): Pack | undefined {
  return cat.packs.find((p) => p.key === key);
}

/** Sabores que se pueden escoger en los packs de libre elección. */
export function packChoices(cat: Catalog): Flavor[] {
  return cat.flavors.filter((f) => f.packEligible);
}

const GALLERY = [
  { src: "/img/granola-tray.jpg", alt: "Textura de la granola" },
  { src: "/img/bowl.jpg", alt: "Servida en bowl" },
  { src: "/img/flatlay.jpg", alt: "En la mesa del desayuno" },
];
const NUTRITION: [string, string][] = [
  ["Porción", "35 g"],
  ["Calorías", "158 kcal"],
  ["Proteína", "8 g"],
  ["Grasa total", "9 g"],
  ["Fibra", "5 g"],
];
const base = { price: 37000, category: "Granola", servings: "14 porciones · IVA incluido", gallery: GALLERY, nutrition: NUTRITION, packEligible: true };

export const DEFAULT_CATALOG: Catalog = {
  flavors: [
    {
      ...base,
      key: "cinnamon-roll",
      name: "Cinnamon Roll",
      color: "#DEA12C",
      ink: "#5F1637",
      photoBg: "#DEA12C",
      img: "/img/bag-table.jpg",
      objectPosition: "50% 45%",
      blend: true,
      labelTop: 41,
      short: "Canela, vainilla, almendras y pecanas tostadas. Huele a panadería a las 7 a.m.",
      long: "Avena tostada con almendras, pecanas y semillas de calabaza, con canela y vainilla, horneada lento hasta formar clusters del tamaño de una moneda. Es la que más se repite: huele a panadería a las 7 de la mañana y desaparece de la bolsa sin que te des cuenta.",
      ingredients:
        "Avena + almendras + pecanas + semillas de calabaza + 25 g azúcar de dátiles + 20 g miel + stevia + aceite de coco + canela + vainilla",
      meta: "canela",
      reviews: 128,
      badge: "Más vendida",
    },
    {
      ...base,
      key: "melted-cocoa",
      name: "Melted Cocoa",
      color: "#5F1637",
      ink: "#EFB0CB",
      photoBg: "#C9AB8B",
      img: "/img/mockups.jpg",
      objectPosition: "22% 30%",
      blend: false,
      labelTop: 44,
      short: "Cocoa sin azúcar y cacao amargo al 58 %. Postre disfrazado de desayuno.",
      long: "Cocoa en polvo sin azúcar y cacao amargo al 58 % con avena, almendras y pecanas tostadas. Intensa en el mejor sentido: es postre disfrazado de desayuno y funciona brutal sobre helado de vainilla.",
      ingredients:
        "Avena + almendras + pecanas + semillas de calabaza + 25 g azúcar de dátiles + 20 g miel + stevia + aceite de coco + vainilla + cocoa sin azúcar en polvo + cacao amargo al 58 %",
      meta: "cacao 58 %",
      reviews: 94,
      badge: null,
    },
    {
      ...base,
      key: "berries",
      name: "Berries",
      color: "#EFB0CB",
      ink: "#5F1637",
      photoBg: "#EFB0CB",
      img: "/img/bag-honey.jpg",
      objectPosition: "32% 38%",
      blend: false,
      labelTop: 42,
      short: "Arándanos deshidratados con un toque de canela. Fresca y brutal con yogur griego.",
      long: "Arándanos deshidratados con avena, almendras y pecanas tostadas y un toque de canela. Fresca y con la acidez justa para cortar lo dulce del yogur griego. La favorita de quienes dicen que la granola les empalaga.",
      ingredients:
        "Avena + almendras + pecanas + semillas de calabaza + 25 g azúcar de dátiles + 20 g miel + stevia + aceite de coco + canela + vainilla + arándanos deshidratados",
      meta: "arándanos",
      reviews: 71,
      badge: null,
    },
  ],
  packs: [
    { key: "duo", name: "Pack Dúo", description: "Dos bolsas de los sabores que elijas. Para probar de a poco.", bags: 2, rate: 0.08, extra: 0, fixed: null, label: null, chip: null, cta: "Agregar Pack Dúo", theme: "crema", featured: false },
    { key: "trio", name: "Trío completo", description: "Un sabor de cada uno. Envío gratis en Bogotá.", bags: 3, rate: 0.15, extra: 0, fixed: ["cinnamon-roll", "melted-cocoa", "berries"], label: null, chip: null, cta: "Agregar Trío", theme: "mostaza", featured: true },
    { key: "familiar", name: "Pack Familiar", description: "Dos de cada sabor. El mejor precio por bolsa de toda la tienda.", bags: 6, rate: 0.22, extra: 0, fixed: ["cinnamon-roll", "cinnamon-roll", "melted-cocoa", "melted-cocoa", "berries", "berries"], label: null, chip: null, cta: "Agregar Familiar", theme: "ciruela", featured: false },
    { key: "regalo", name: "Caja Regalo", description: "Dos sabores a elección en caja rígida con tarjeta escrita a mano. Llega lista para entregar.", bags: 2, rate: 0.08, extra: 14000, fixed: null, label: "2 bolsas + caja", chip: "Regalo", cta: "Agregar Caja Regalo", theme: "rosa", featured: false },
  ],
  shipping: {
    default: { fee: 18000, freeFrom: 150000, etaDays: 4 },
    cities: { Bogotá: { fee: 12000, freeFrom: 100000, etaDays: 2 } },
  },
};
