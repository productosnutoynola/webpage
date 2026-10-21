import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CATALOG as cat, findPack, type Catalog } from "./catalog.ts";
import { computeTotals, packPriceVaries, packUnitPrice, sanitizeLines, type CartLine } from "./pricing.ts";

const pack = (k: string) => findPack(cat, k)!;

test("bolsas sueltas no tienen descuento; envío Bogotá bajo el umbral", () => {
  const t = computeTotals(cat, [{ kind: "flavor", flavor: "cinnamon-roll", qty: 2 }], "Bogotá");
  assert.equal(t.subtotal, 74000);
  assert.equal(t.discount, 0);
  assert.equal(t.shipping, 12000);
  assert.equal(t.total, 86000);
});

test("precios de packs según el diseño", () => {
  assert.equal(packUnitPrice(cat, pack("duo")), 68080);
  assert.equal(packUnitPrice(cat, pack("trio")), 94350);
  assert.equal(packUnitPrice(cat, pack("familiar")), 173160);
  assert.equal(packUnitPrice(cat, pack("regalo")), 82080); // incluye $14.000 de caja
});

test("la caja regalo se cobra y el descuento no aplica sobre la caja", () => {
  const t = computeTotals(cat, [{ kind: "pack", pack: "regalo", flavors: ["melted-cocoa", "berries"], qty: 1 }], "Bogotá");
  assert.equal(t.gross, 88000);
  assert.equal(t.discount, 5920);
  assert.equal(t.subtotal, 82080);
});

test("envío gratis desde $100.000 en Bogotá y $150.000 en el resto del país", () => {
  const fam: CartLine[] = [{ kind: "pack", pack: "trio", flavors: [], qty: 1 }, { kind: "flavor", flavor: "berries", qty: 1 }];
  const lines = sanitizeLines(cat, fam);
  assert.equal(computeTotals(cat, lines, "Bogotá").shipping, 0);
  assert.equal(computeTotals(cat, lines, "Medellín").shipping, 18000);
});

test("sanitizeLines fuerza sabores fijos, rechaza packs incompletos y agrupa", () => {
  const lines = sanitizeLines(cat, [
    { kind: "pack", pack: "trio", flavors: ["melted-cocoa"], qty: 1 },
    { kind: "pack", pack: "duo", flavors: ["melted-cocoa"], qty: 1 },
    { kind: "pack", pack: "duo", flavors: ["berries", "melted-cocoa"], qty: 1 },
    { kind: "pack", pack: "duo", flavors: ["melted-cocoa", "berries"], qty: 2 },
    { kind: "flavor", flavor: "nope", qty: 1 },
    { kind: "flavor", flavor: "cinnamon-roll", qty: 1.5 },
    { kind: "flavor", flavor: "cinnamon-roll", qty: 99 },
  ]);
  assert.equal(lines.length, 3);
  assert.deepEqual(lines[0], { kind: "pack", pack: "trio", flavors: ["cinnamon-roll", "melted-cocoa", "berries"], qty: 1 });
  assert.equal(lines[1].qty, 3);
  assert.equal(lines[2].qty, 20);
});

test("envío en 0 es gratis y las ciudades con tarifa propia la usan", () => {
  const lines: CartLine[] = [{ kind: "flavor", flavor: "cinnamon-roll", qty: 1 }];
  const c: Catalog = {
    ...cat,
    shipping: { default: { fee: 0, freeFrom: 150000, etaDays: 4 }, cities: { Medellín: { fee: 9000, freeFrom: 150000, etaDays: 3 } } },
  };
  const t = computeTotals(c, lines, "Bogotá");
  assert.equal(t.shipping, 0);
  assert.equal(t.free, true);
  assert.equal(t.total, 37000);
  assert.equal(computeTotals(c, lines, "Medellín").shipping, 9000);
});

test("productos con precios distintos: el pack suma los sabores elegidos", () => {
  const c: Catalog = {
    ...cat,
    flavors: [...cat.flavors, { ...cat.flavors[0], key: "mani", name: "Maní", price: 45000 }],
  };
  assert.equal(packPriceVaries(c, pack("duo")), true);
  assert.equal(packUnitPrice(c, pack("duo")), 68080); // "desde": los dos más económicos
  assert.equal(packUnitPrice(c, pack("duo"), ["mani", "berries"]), Math.round(82000 * 0.92));
  const lines = sanitizeLines({ ...c, flavors: c.flavors.map((f) => (f.key === "mani" ? { ...f, packEligible: false } : f)) }, [
    { kind: "pack", pack: "duo", flavors: ["mani", "berries"], qty: 1 },
  ]);
  assert.equal(lines.length, 0); // no habilitado para packs
});

test("código promocional: % sobre el subtotal con descuento de packs, o envío gratis", () => {
  const lines: CartLine[] = [{ kind: "flavor", flavor: "berries", qty: 2 }];
  const pct = computeTotals(cat, lines, "Cali", { code: "CANELAZO10", kind: "percent", percent: 10 });
  assert.equal(pct.promoDiscount, 7400);
  assert.equal(pct.total, 74000 - 7400 + 18000);
  const ship = computeTotals(cat, [{ kind: "flavor", flavor: "berries", qty: 1 }], "Cali", { code: "ENVIOGRATIS", kind: "free_shipping", percent: null });
  assert.equal(ship.shipping, 0);
  assert.equal(ship.shippingWaived, 18000);
  assert.equal(ship.total, 37000);
  const pack = computeTotals(cat, [{ kind: "pack", pack: "trio", flavors: [], qty: 1 }], "Bogotá", { code: "X", kind: "percent", percent: 20 });
  assert.equal(pack.promoDiscount, Math.round(94350 * 0.2));
});
