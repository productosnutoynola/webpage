// Genera supabase/migrations/*_seed_catalog.sql desde lib/catalog.ts.
// Uso: npm run db:seed-sql
import { writeFileSync } from "node:fs";
import { FLAVORS, FLAVOR_KEYS, PACKS, PRICE, SHIPPING } from "../lib/catalog.ts";

const q = (s: string | null | undefined) => (s == null ? "null" : `'${s.replace(/'/g, "''")}'`);
const SKU: Record<string, string> = { "cinnamon-roll": "NYN-CIN", "cacao-crunch": "NYN-CAC", "frutos-rojos": "NYN-ROJ" };
const PACK_DESC: Record<string, string> = {
  duo: "Dos bolsas de los sabores que elijas.",
  trio: "Un sabor de cada uno.",
  familiar: "Dos de cada sabor.",
  regalo: "Dos sabores a elección en caja rígida con tarjeta escrita a mano.",
};

let sql = `-- GENERADO por scripts/gen-seed.ts desde lib/catalog.ts. No editar a mano.
-- Catálogo inicial. Inventario en 0: cargar el stock real con public.restock().

insert into public.products (slug, sku, name, short_description, description, ingredients, price_cop, image_url, color_hex, sort_order) values
${FLAVOR_KEYS.map((k, i) => {
  const f = FLAVORS[k];
  return `  (${q(k)}, ${q(SKU[k])}, ${q(f.name)}, ${q(f.short)}, ${q(f.long)}, ${q(f.ingredients)}, ${PRICE}, ${q(f.img)}, ${q(f.color)}, ${i + 1})`;
}).join(",\n")}
on conflict (slug) do nothing;

insert into public.bundles (slug, name, description, bag_count, discount_rate, extra_fee_cop, flavors_fixed, sort_order) values
${Object.values(PACKS).map((p, i) =>
  `  (${q(p.key)}, ${q(p.name)}, ${q(PACK_DESC[p.key])}, ${p.bags}, ${p.rate}, ${p.extra}, ${p.fixed ? "true" : "false"}, ${i + 1})`,
).join(",\n")}
on conflict (slug) do nothing;
`;

for (const p of Object.values(PACKS)) {
  if (!p.fixed) continue;
  const counts = new Map<string, number>();
  for (const f of p.fixed) counts.set(f, (counts.get(f) ?? 0) + 1);
  sql += `
insert into public.bundle_items (bundle_id, product_id, quantity)
select b.id, p.id, v.qty
from (values ${[...counts].map(([f, n]) => `(${q(f)}, ${n})`).join(", ")}) as v(slug, qty)
join public.products p on p.slug = v.slug
cross join public.bundles b
where b.slug = ${q(p.key)}
on conflict do nothing;
`;
}

sql += `
insert into public.shipping_zones (code, name, fee_cop, free_from_cop, eta_days) values
  ('bogota', 'Bogotá', ${SHIPPING.bogota.fee}, ${SHIPPING.bogota.freeFrom}, 2),
  ('nacional', 'Resto del país', ${SHIPPING.nacional.fee}, ${SHIPPING.nacional.freeFrom}, 4)
on conflict (code) do nothing;

insert into public.inventory (product_id, on_hand)
select id, 0 from public.products
on conflict (product_id) do nothing;
`;

writeFileSync(new URL("../supabase/migrations/20260928000300_seed_catalog.sql", import.meta.url), sql);
console.log("ok");
