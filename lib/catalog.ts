// Catálogo y reglas comerciales. Fuente única para cliente y servidor:
// el servidor recalcula todos los montos desde aquí antes de cobrar.

export const PRICE = 37000;
export const SHIPPING = {
  bogota: { fee: 12000, freeFrom: 100000 },
  nacional: { fee: 18000, freeFrom: 150000 },
} as const;

export const CITIES = [
  "Bogotá",
  "Medellín",
  "Cali",
  "Barranquilla",
  "Cartagena",
  "Bucaramanga",
  "Pereira",
  "Otra ciudad",
] as const;
export type City = (typeof CITIES)[number];

export type FlavorKey = "cinnamon-roll" | "melted-cocoa" | "berries";

export type Flavor = {
  key: FlavorKey;
  name: string;
  /** Color de la etiqueta y de la sombra de la tarjeta. */
  color: string;
  /** Color del texto sobre la etiqueta. */
  ink: string;
  /** Fondo detrás de la foto mientras carga / para el blend. */
  photoBg: string;
  img: string;
  objectPosition: string;
  blend: boolean;
  labelTop: string;
  short: string;
  long: string;
  ingredients: string;
  meta: string;
  reviews: number;
  badge?: string;
};

export const FLAVORS: Record<FlavorKey, Flavor> = {
  "cinnamon-roll": {
    key: "cinnamon-roll",
    name: "Cinnamon Roll",
    color: "#DEA12C",
    ink: "#5F1637",
    photoBg: "#DEA12C",
    img: "/img/bag-table.jpg",
    objectPosition: "center 45%",
    blend: true,
    labelTop: "41%",
    short: "Canela, vainilla, almendras y pecanas tostadas. Huele a panadería a las 7 a.m.",
    long: "Avena tostada con almendras, pecanas y semillas de calabaza, con canela y vainilla, horneada lento hasta formar clusters del tamaño de una moneda. Es la que más se repite: huele a panadería a las 7 de la mañana y desaparece de la bolsa sin que te des cuenta.",
    ingredients:
      "Avena + almendras + pecanas + semillas de calabaza + 25 g azúcar de dátiles + 20 g miel + stevia + aceite de coco + canela + vainilla",
    meta: "canela",
    reviews: 128,
    badge: "Más vendida",
  },
  "melted-cocoa": {
    key: "melted-cocoa",
    name: "Melted Cocoa",
    color: "#5F1637",
    ink: "#EFB0CB",
    photoBg: "#C9AB8B",
    img: "/img/mockups.jpg",
    objectPosition: "22% 30%",
    blend: false,
    labelTop: "44%",
    short: "Cocoa sin azúcar y cacao amargo al 58 %. Postre disfrazado de desayuno.",
    long: "Cocoa en polvo sin azúcar y cacao amargo al 58 % con avena, almendras y pecanas tostadas. Intensa en el mejor sentido: es postre disfrazado de desayuno y funciona brutal sobre helado de vainilla.",
    ingredients:
      "Avena + almendras + pecanas + semillas de calabaza + 25 g azúcar de dátiles + 20 g miel + stevia + aceite de coco + vainilla + cocoa sin azúcar en polvo + cacao amargo al 58 %",
    meta: "cacao 58 %",
    reviews: 94,
  },
  berries: {
    key: "berries",
    name: "Berries",
    color: "#EFB0CB",
    ink: "#5F1637",
    photoBg: "#EFB0CB",
    img: "/img/bag-honey.jpg",
    objectPosition: "32% 38%",
    blend: false,
    labelTop: "42%",
    short: "Arándanos deshidratados con un toque de canela. Fresca y brutal con yogur griego.",
    long: "Arándanos deshidratados con avena, almendras y pecanas tostadas y un toque de canela. Fresca y con la acidez justa para cortar lo dulce del yogur griego. La favorita de quienes dicen que la granola les empalaga.",
    ingredients:
      "Avena + almendras + pecanas + semillas de calabaza + 25 g azúcar de dátiles + 20 g miel + stevia + aceite de coco + canela + vainilla + arándanos deshidratados",
    meta: "arándanos",
    reviews: 71,
  },
};

export const FLAVOR_KEYS = Object.keys(FLAVORS) as FlavorKey[];

export function isFlavorKey(v: unknown): v is FlavorKey {
  return typeof v === "string" && v in FLAVORS;
}

export type PackKey = "duo" | "trio" | "familiar" | "regalo";

export type Pack = {
  key: PackKey;
  name: string;
  bags: number;
  /** Descuento sobre el valor de las bolsas. */
  rate: number;
  /** Cargo adicional sin descuento (caja + tarjeta del regalo). */
  extra: number;
  /** Sabores fijos; si es null el cliente elige `bags` sabores. */
  fixed: FlavorKey[] | null;
};

export const PACKS: Record<PackKey, Pack> = {
  duo: { key: "duo", name: "Pack Dúo", bags: 2, rate: 0.08, extra: 0, fixed: null },
  trio: {
    key: "trio",
    name: "Trío completo",
    bags: 3,
    rate: 0.15,
    extra: 0,
    fixed: ["cinnamon-roll", "melted-cocoa", "berries"],
  },
  familiar: {
    key: "familiar",
    name: "Pack Familiar",
    bags: 6,
    rate: 0.22,
    extra: 0,
    fixed: ["cinnamon-roll", "cinnamon-roll", "melted-cocoa", "melted-cocoa", "berries", "berries"],
  },
  regalo: { key: "regalo", name: "Caja Regalo", bags: 2, rate: 0.08, extra: 14000, fixed: null },
};

export function isPackKey(v: unknown): v is PackKey {
  return typeof v === "string" && v in PACKS;
}

export const MAX_QTY = 20;
