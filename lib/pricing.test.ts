import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTotals, packUnitPrice, sanitizeLines, type CartLine } from "./pricing.ts";

test("bolsas sueltas no tienen descuento; envío Bogotá bajo el umbral", () => {
  const t = computeTotals([{ kind: "flavor", flavor: "cinnamon-roll", qty: 2 }], "Bogotá");
  assert.equal(t.subtotal, 74000);
  assert.equal(t.discount, 0);
  assert.equal(t.shipping, 12000);
  assert.equal(t.total, 86000);
});

test("precios de packs según el diseño", () => {
  assert.equal(packUnitPrice("duo"), 68080);
  assert.equal(packUnitPrice("trio"), 94350);
  assert.equal(packUnitPrice("familiar"), 173160);
  assert.equal(packUnitPrice("regalo"), 82080); // incluye $14.000 de caja
});

test("la caja regalo se cobra y el descuento no aplica sobre la caja", () => {
  const t = computeTotals(
    [{ kind: "pack", pack: "regalo", flavors: ["melted-cocoa", "berries"], qty: 1 }],
    "Bogotá",
  );
  assert.equal(t.gross, 88000);
  assert.equal(t.discount, 5920);
  assert.equal(t.subtotal, 82080);
});

test("envío gratis desde $100.000 en Bogotá y $150.000 nacional", () => {
  const fam: CartLine[] = [{ kind: "pack", pack: "trio", flavors: [], qty: 1 }, { kind: "flavor", flavor: "berries", qty: 1 }];
  const lines = sanitizeLines(fam);
  assert.equal(computeTotals(lines, "Bogotá").shipping, 0);
  assert.equal(computeTotals(lines, "Medellín").shipping, 18000);
});

test("sanitizeLines fuerza sabores fijos, rechaza packs incompletos y agrupa", () => {
  const lines = sanitizeLines([
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
