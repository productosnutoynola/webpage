import { MAX_QTY, findFlavor, findPack, packChoices, shippingFor, type Catalog, type Pack } from "./catalog.ts";

export type CartLine =
  | { kind: "flavor"; flavor: string; qty: number }
  | { kind: "pack"; pack: string; flavors: string[]; qty: number };

/** Identificador estable: dos packs con los mismos sabores se agrupan en una línea. */
export function lineId(line: CartLine): string {
  if (line.kind === "flavor") return line.flavor;
  return `${line.pack}:${[...line.flavors].sort().join("+")}`;
}

const priceOf = (cat: Catalog, key: string) => findFlavor(cat, key)?.price ?? 0;

/** Sabores con los que se calcula el precio de un pack (fijos, elegidos o, si no hay, los más económicos). */
function packFlavors(cat: Catalog, p: Pack, flavors?: string[]): string[] {
  if (p.fixed) return p.fixed;
  if (flavors?.length === p.bags) return flavors;
  const cheapest = [...packChoices(cat)].sort((a, b) => a.price - b.price)[0];
  return cheapest ? Array(p.bags).fill(cheapest.key) : [];
}

export function packUnitFull(cat: Catalog, p: Pack, flavors?: string[]): number {
  return packFlavors(cat, p, flavors).reduce((a, k) => a + priceOf(cat, k), 0) + p.extra;
}

export function packUnitPrice(cat: Catalog, p: Pack, flavors?: string[]): number {
  const sum = packFlavors(cat, p, flavors).reduce((a, k) => a + priceOf(cat, k), 0);
  return Math.round(sum * (1 - p.rate)) + p.extra;
}

/** true si el precio del pack depende de los sabores elegidos. */
export function packPriceVaries(cat: Catalog, p: Pack): boolean {
  if (p.fixed) return false;
  return new Set(packChoices(cat).map((f) => f.price)).size > 1;
}

export function lineName(cat: Catalog, line: CartLine): string {
  return line.kind === "flavor"
    ? findFlavor(cat, line.flavor)?.name ?? line.flavor
    : findPack(cat, line.pack)?.name ?? line.pack;
}

export function lineMeta(cat: Catalog, line: CartLine): string {
  if (line.kind === "flavor") return findFlavor(cat, line.flavor)?.meta ?? "";
  const p = findPack(cat, line.pack);
  const names = countFlavors(line.flavors)
    .map(([k, n]) => {
      const name = findFlavor(cat, k)?.name ?? k;
      return n > 1 ? `${n}× ${name}` : name;
    })
    .join(" · ");
  return p && p.rate > 0 ? `${names} · −${Math.round(p.rate * 100)} %` : names;
}

export function lineImage(cat: Catalog, line: CartLine): string {
  return findFlavor(cat, line.kind === "flavor" ? line.flavor : line.flavors[0])?.img ?? "/img/logo.png";
}

function countFlavors(flavors: string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const f of flavors) m.set(f, (m.get(f) ?? 0) + 1);
  return [...m.entries()];
}

export function lineUnitPrice(cat: Catalog, line: CartLine): number {
  if (line.kind === "flavor") return priceOf(cat, line.flavor);
  const p = findPack(cat, line.pack);
  return p ? packUnitPrice(cat, p, line.flavors) : 0;
}

export function lineUnitFull(cat: Catalog, line: CartLine): number {
  if (line.kind === "flavor") return priceOf(cat, line.flavor);
  const p = findPack(cat, line.pack);
  return p ? packUnitFull(cat, p, line.flavors) : 0;
}

export function isBogota(city: string): boolean {
  return city === "Bogotá";
}

/** Código promocional validado en el servidor (check_promo). */
export type Promo = { code: string; kind: "percent" | "free_shipping"; percent: number | null };

export function promoLabel(p: Promo): string {
  return p.kind === "percent" ? `−${p.percent} %` : "Envío gratis";
}

export type Totals = {
  bags: number;
  gross: number;
  discount: number;
  subtotal: number;
  shipping: number;
  freeFrom: number;
  free: boolean;
  total: number;
  promoCode?: string | null;
  /** Descuento del código sobre los productos. */
  promoDiscount?: number;
  /** Envío que el código dejó en $0. */
  shippingWaived?: number;
};

export function computeTotals(cat: Catalog, lines: CartLine[], city: string = "Bogotá", promo?: Promo | null): Totals {
  let bags = 0;
  let gross = 0;
  let subtotal = 0;
  for (const l of lines) {
    bags += (l.kind === "flavor" ? 1 : findPack(cat, l.pack)?.bags ?? 0) * l.qty;
    gross += lineUnitFull(cat, l) * l.qty;
    subtotal += lineUnitPrice(cat, l) * l.qty;
  }
  const rule = shippingFor(cat.shipping, city);
  const free = rule.fee === 0 || subtotal >= rule.freeFrom;
  let shipping = lines.length === 0 || free ? 0 : rule.fee;
  // Mismo cálculo que place_order en Supabase (que es quien cobra).
  let promoDiscount = 0;
  let shippingWaived = 0;
  if (promo && lines.length) {
    if (promo.kind === "percent") promoDiscount = Math.round((subtotal * (promo.percent ?? 0)) / 100);
    else {
      shippingWaived = shipping;
      shipping = 0;
    }
  }
  return {
    bags,
    gross,
    discount: gross - subtotal,
    subtotal,
    shipping,
    freeFrom: rule.freeFrom,
    free: free || shipping === 0,
    total: subtotal - promoDiscount + shipping,
    promoCode: promo?.code ?? null,
    promoDiscount,
    shippingWaived,
  };
}

/**
 * Valida un carrito que viene del cliente (no confiable). Descarta líneas
 * inválidas o de productos que ya no están a la venta, fuerza los sabores de
 * los packs fijos y agrupa duplicados.
 */
export function sanitizeLines(cat: Catalog, input: unknown): CartLine[] {
  if (!Array.isArray(input)) return [];
  const choices = new Set(packChoices(cat).map((f) => f.key));
  const out = new Map<string, CartLine>();
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const qty = Number(r.qty);
    if (!Number.isInteger(qty) || qty < 1) continue;
    let line: CartLine | null = null;
    if (r.kind === "flavor" && typeof r.flavor === "string" && findFlavor(cat, r.flavor)) {
      line = { kind: "flavor", flavor: r.flavor, qty };
    } else if (r.kind === "pack" && typeof r.pack === "string") {
      const p = findPack(cat, r.pack);
      if (!p) continue;
      const flavors = p.fixed ?? (Array.isArray(r.flavors) ? r.flavors.filter((f): f is string => typeof f === "string" && choices.has(f)) : []);
      if (flavors.length !== p.bags) continue;
      line = { kind: "pack", pack: p.key, flavors: [...flavors], qty };
    }
    if (!line) continue;
    const id = lineId(line);
    const prev = out.get(id);
    line.qty = Math.min(MAX_QTY, (prev?.qty ?? 0) + line.qty);
    out.set(id, line);
  }
  return [...out.values()];
}

export function money(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CO");
}
