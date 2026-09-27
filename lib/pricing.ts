import {
  FLAVORS,
  MAX_QTY,
  PACKS,
  PRICE,
  SHIPPING,
  isFlavorKey,
  isPackKey,
  type FlavorKey,
  type PackKey,
} from "./catalog.ts";

export type CartLine =
  | { kind: "flavor"; flavor: FlavorKey; qty: number }
  | { kind: "pack"; pack: PackKey; flavors: FlavorKey[]; qty: number };

/** Identificador estable: dos packs con los mismos sabores se agrupan en una línea. */
export function lineId(line: CartLine): string {
  if (line.kind === "flavor") return line.flavor;
  return `${line.pack}:${[...line.flavors].sort().join("+")}`;
}

export function packUnitFull(pack: PackKey): number {
  const p = PACKS[pack];
  return p.bags * PRICE + p.extra;
}

export function packUnitPrice(pack: PackKey): number {
  const p = PACKS[pack];
  return Math.round(p.bags * PRICE * (1 - p.rate)) + p.extra;
}

export function lineName(line: CartLine): string {
  return line.kind === "flavor" ? FLAVORS[line.flavor].name : PACKS[line.pack].name;
}

export function lineMeta(line: CartLine): string {
  if (line.kind === "flavor") return FLAVORS[line.flavor].meta;
  const p = PACKS[line.pack];
  const names = countFlavors(line.flavors)
    .map(([k, n]) => (n > 1 ? `${n}× ${FLAVORS[k].name}` : FLAVORS[k].name))
    .join(" · ");
  return p.rate > 0 ? `${names} · −${Math.round(p.rate * 100)} %` : names;
}

export function lineImage(line: CartLine): string {
  return FLAVORS[line.kind === "flavor" ? line.flavor : line.flavors[0]].img;
}

function countFlavors(flavors: FlavorKey[]): [FlavorKey, number][] {
  const m = new Map<FlavorKey, number>();
  for (const f of flavors) m.set(f, (m.get(f) ?? 0) + 1);
  return [...m.entries()];
}

export function lineUnitPrice(line: CartLine): number {
  return line.kind === "flavor" ? PRICE : packUnitPrice(line.pack);
}

export function lineUnitFull(line: CartLine): number {
  return line.kind === "flavor" ? PRICE : packUnitFull(line.pack);
}

export function isBogota(city: string): boolean {
  return city === "Bogotá";
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
};

export function computeTotals(lines: CartLine[], city: string = "Bogotá"): Totals {
  let bags = 0;
  let gross = 0;
  let subtotal = 0;
  for (const l of lines) {
    bags += (l.kind === "flavor" ? 1 : PACKS[l.pack].bags) * l.qty;
    gross += lineUnitFull(l) * l.qty;
    subtotal += lineUnitPrice(l) * l.qty;
  }
  const rule = isBogota(city) ? SHIPPING.bogota : SHIPPING.nacional;
  const free = subtotal >= rule.freeFrom;
  const shipping = lines.length === 0 || free ? 0 : rule.fee;
  return {
    bags,
    gross,
    discount: gross - subtotal,
    subtotal,
    shipping,
    freeFrom: rule.freeFrom,
    free,
    total: subtotal + shipping,
  };
}

/**
 * Valida un carrito que viene del cliente (no confiable). Descarta líneas
 * inválidas, fuerza los sabores de los packs fijos y agrupa duplicados.
 */
export function sanitizeLines(input: unknown): CartLine[] {
  if (!Array.isArray(input)) return [];
  const out = new Map<string, CartLine>();
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const qty = Number(r.qty);
    if (!Number.isInteger(qty) || qty < 1) continue;
    let line: CartLine | null = null;
    if (r.kind === "flavor" && isFlavorKey(r.flavor)) {
      line = { kind: "flavor", flavor: r.flavor, qty };
    } else if (r.kind === "pack" && isPackKey(r.pack)) {
      const p = PACKS[r.pack];
      const flavors = p.fixed ?? (Array.isArray(r.flavors) ? r.flavors.filter(isFlavorKey) : []);
      if (flavors.length !== p.bags) continue;
      line = { kind: "pack", pack: r.pack, flavors: [...flavors], qty };
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
