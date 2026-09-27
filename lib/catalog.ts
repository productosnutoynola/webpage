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

export type FlavorKey = "cinnamon-roll" | "cacao-crunch" | "frutos-rojos";

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
    short: "Canela de Ceilán, macadamia y marañón tostados. Huele a panadería a las 7 a.m.",
    long: "Avena tostada con canela de Ceilán, macadamia y marañón, horneada lento hasta formar clusters del tamaño de una moneda. Es la que más se repite: huele a panadería a las 7 de la mañana y desaparece de la bolsa sin que te des cuenta.",
    ingredients:
      "Avena en hojuelas, almendra, marañón, macadamia, semillas de calabaza, coco deshidratado, canela de Ceilán, aceite de coco, sal marina.",
    meta: "canela",
    reviews: 128,
    badge: "Más vendida",
  },
  "cacao-crunch": {
    key: "cacao-crunch",
    name: "Cacao Crunch",
    color: "#5F1637",
    ink: "#EFB0CB",
    photoBg: "#C9AB8B",
    img: "/img/mockups.jpg",
    objectPosition: "22% 30%",
    blend: false,
    labelTop: "44%",
    short: "Cacao colombiano 70 %, almendra tostada y nibs enteros. Postre disfrazado de desayuno.",
    long: "Cacao colombiano al 70 % amasado con la avena antes de hornear, más almendra tostada y nibs enteros que crujen distinto. Amarga en el mejor sentido: es postre disfrazado de desayuno y funciona brutal sobre helado de vainilla.",
    ingredients:
      "Avena en hojuelas, almendra, marañón, cacao en polvo 70 %, nibs de cacao, semillas de calabaza, aceite de coco, extracto de vainilla, sal marina.",
    meta: "cacao 70 %",
    reviews: 94,
  },
  "frutos-rojos": {
    key: "frutos-rojos",
    name: "Frutos Rojos",
    color: "#EFB0CB",
    ink: "#5F1637",
    photoBg: "#EFB0CB",
    img: "/img/bag-honey.jpg",
    objectPosition: "32% 38%",
    blend: false,
    labelTop: "42%",
    short: "Arándano, fresa y uchuva deshidratados. Ácida y fresca; brutal con yogur griego.",
    long: "Arándano, fresa y uchuva deshidratados sin azúcar, con avena tostada y almendra laminada. Ácida, fresca y con la acidez justa para cortar lo dulce del yogur griego. La favorita de quienes dicen que la granola les empalaga.",
    ingredients:
      "Avena en hojuelas, almendra laminada, marañón, arándano deshidratado, fresa deshidratada, uchuva deshidratada, semillas de girasol, aceite de coco, sal marina.",
    meta: "fruta deshidratada",
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
    fixed: ["cinnamon-roll", "cacao-crunch", "frutos-rojos"],
  },
  familiar: {
    key: "familiar",
    name: "Pack Familiar",
    bags: 6,
    rate: 0.22,
    extra: 0,
    fixed: ["cinnamon-roll", "cinnamon-roll", "cacao-crunch", "cacao-crunch", "frutos-rojos", "frutos-rojos"],
  },
  regalo: { key: "regalo", name: "Caja Regalo", bags: 2, rate: 0.08, extra: 14000, fixed: null },
};

export function isPackKey(v: unknown): v is PackKey {
  return typeof v === "string" && v in PACKS;
}

export const MAX_QTY = 20;
