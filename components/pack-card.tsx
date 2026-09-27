"use client";

import { PACKS, type PackKey } from "@/lib/catalog";
import { money, packUnitFull, packUnitPrice } from "@/lib/pricing";
import { useCart } from "./cart-context";

type Look = { bg: string; shadow: string; title: string; body: string; meta: string; strike: string; chipBg: string; chipFg: string };

const LIGHT = { title: "text-tinta", body: "text-tinta/68", meta: "text-tinta/55", strike: "text-tinta/45" };
const WARM = { title: "text-ciruela", body: "text-cafe", meta: "text-ciruela", strike: "text-cafe/55" };

const CARDS: { key: PackKey; meta: string; chip: string; desc: string; cta: string; look: Look }[] = [
  {
    key: "duo", meta: "2 bolsas", chip: "−8 %", cta: "Agregar Pack Dúo",
    desc: "Dos bolsas de los sabores que elijas. Para probar de a poco.",
    look: { bg: "bg-crema", shadow: "var(--color-rosa)", chipBg: "bg-rosa", chipFg: "text-ciruela", ...LIGHT },
  },
  {
    key: "trio", meta: "3 bolsas", chip: "−15 %", cta: "Agregar Trío",
    desc: "Un sabor de cada uno. Envío gratis en Bogotá.",
    look: { bg: "bg-mostaza", shadow: "var(--color-tinta)", chipBg: "bg-ciruela", chipFg: "text-rosa", ...WARM },
  },
  {
    key: "familiar", meta: "6 bolsas", chip: "−22 %", cta: "Agregar Familiar",
    desc: "Dos de cada sabor. El mejor precio por bolsa de toda la tienda.",
    look: { bg: "bg-crema", shadow: "var(--color-ciruela)", chipBg: "bg-ciruela", chipFg: "text-rosa", ...LIGHT },
  },
  {
    key: "regalo", meta: "2 bolsas + caja", chip: "Regalo", cta: "Agregar Caja Regalo",
    desc: "Dos sabores a elección en caja rígida con tarjeta escrita a mano. Llega lista para entregar.",
    look: { bg: "bg-rosa", shadow: "var(--color-tinta)", chipBg: "bg-ciruela", chipFg: "text-rosa", ...WARM },
  },
];

export function PackGrid() {
  const { openPicker } = useCart();
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(255px,1fr))] gap-[22px]">
      {CARDS.map(({ key, meta, chip, desc, cta, look }) => {
        const p = PACKS[key];
        const showStrike = p.extra === 0;
        return (
          <article
            key={key}
            className={`flex flex-col gap-3 rounded-[20px] border-[2.5px] border-tinta p-6 ${look.bg}`}
            style={{ boxShadow: `5px 5px 0 ${look.shadow}` }}
          >
            <div className="flex items-center justify-between gap-2.5">
              <span className={`font-mono text-[10px] uppercase tracking-[.14em] ${look.meta}`}>{meta}</span>
              <span className={`rounded-full border-[1.5px] border-tinta px-[9px] py-[3px] font-mono text-[11px] font-semibold ${look.chipBg} ${look.chipFg}`}>
                {chip}
              </span>
            </div>
            <h4 className={`m-0 font-display text-[22px] font-extrabold leading-[1.1] ${look.title}`}>{p.name}</h4>
            <p className={`m-0 flex-1 text-sm leading-normal ${look.body}`}>{desc}</p>
            <div className="flex items-baseline gap-[9px]">
              <span className={`font-display text-[22px] font-extrabold ${look.title}`}>{money(packUnitPrice(key))}</span>
              {showStrike && <span className={`text-sm line-through ${look.strike}`}>{money(packUnitFull(key))}</span>}
            </div>
            <button
              onClick={() => openPicker(key)}
              className="btn-primary p-3 text-sm shadow-[3px_3px_0_var(--color-tinta)]"
            >
              {cta}
            </button>
          </article>
        );
      })}
    </div>
  );
}
