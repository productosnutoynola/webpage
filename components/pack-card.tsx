"use client";

import type { Catalog, Pack, PackTheme } from "@/lib/catalog";
import { money, packPriceVaries, packUnitFull, packUnitPrice } from "@/lib/pricing";
import { useCart } from "./cart-context";

type Look = { bg: string; shadow: string; title: string; body: string; meta: string; strike: string; chipBg: string; chipFg: string };

const LIGHT = { title: "text-tinta", body: "text-tinta/68", meta: "text-tinta/55", strike: "text-tinta/45" };
const WARM = { title: "text-ciruela", body: "text-cafe", meta: "text-ciruela", strike: "text-cafe/55" };

export const PACK_THEMES: Record<PackTheme, Look & { label: string }> = {
  crema: { label: "Crema + sombra rosa", bg: "bg-crema", shadow: "var(--color-rosa)", chipBg: "bg-rosa", chipFg: "text-ciruela", ...LIGHT },
  mostaza: { label: "Mostaza", bg: "bg-mostaza", shadow: "var(--color-tinta)", chipBg: "bg-ciruela", chipFg: "text-rosa", ...WARM },
  ciruela: { label: "Crema + sombra ciruela", bg: "bg-crema", shadow: "var(--color-ciruela)", chipBg: "bg-ciruela", chipFg: "text-rosa", ...LIGHT },
  rosa: { label: "Rosa", bg: "bg-rosa", shadow: "var(--color-tinta)", chipBg: "bg-ciruela", chipFg: "text-rosa", ...WARM },
};

export const packChip = (p: Pack) => p.chip || (p.rate > 0 ? `−${Math.round(p.rate * 100)} %` : "Pack");
export const packLabel = (p: Pack) => p.label || `${p.bags} ${p.bags === 1 ? "bolsa" : "bolsas"}`;

export function PackGrid() {
  const { openPicker, catalog } = useCart();
  if (!catalog.packs.length) return null;
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(255px,1fr))] gap-[22px]">
      {catalog.packs.map((p) => (
        <PackCardView key={p.key} p={p} catalog={catalog} onAdd={() => openPicker(p.key)} />
      ))}
    </div>
  );
}

/** Tarjeta de pack. También la usa la vista previa del panel de administración. */
export function PackCardView({ p, catalog, onAdd }: { p: Pack; catalog: Catalog; onAdd?: () => void }) {
  const look = PACK_THEMES[p.theme] ?? PACK_THEMES.crema;
  const price = packUnitPrice(catalog, p);
  const full = packUnitFull(catalog, p);
  const from = packPriceVaries(catalog, p);
  return (
    <article className={`flex flex-col gap-3 rounded-[20px] border-[2.5px] border-tinta p-6 ${look.bg}`} style={{ boxShadow: `5px 5px 0 ${look.shadow}` }}>
      <div className="flex items-center justify-between gap-2.5">
        <span className={`font-mono text-[10px] uppercase tracking-[.14em] ${look.meta}`}>{packLabel(p)}</span>
        <span className={`rounded-full border-[1.5px] border-tinta px-[9px] py-[3px] font-mono text-[11px] font-semibold ${look.chipBg} ${look.chipFg}`}>
          {packChip(p)}
        </span>
      </div>
      <h4 className={`m-0 font-display text-[22px] font-extrabold leading-[1.1] ${look.title}`}>{p.name}</h4>
      <p className={`m-0 flex-1 text-sm leading-normal ${look.body}`}>{p.description}</p>
      <div className="flex items-baseline gap-[9px]">
        {from && <span className={`text-sm ${look.body}`}>Desde</span>}
        <span className={`font-display text-[22px] font-extrabold ${look.title}`}>{money(price)}</span>
        {p.extra === 0 && full > price && <span className={`text-sm line-through ${look.strike}`}>{money(full)}</span>}
      </div>
      <button type="button" onClick={onAdd} className="btn-primary p-3 text-sm shadow-[3px_3px_0_var(--color-tinta)]">
        {p.cta || `Agregar ${p.name}`}
      </button>
    </article>
  );
}
