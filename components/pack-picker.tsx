"use client";

import { useEffect, useState } from "react";
import { findPack, packChoices } from "@/lib/catalog";
import { money, packUnitPrice } from "@/lib/pricing";
import { useCart } from "./cart-context";

/** Selector de sabores para los packs de libre elección (Dúo y Caja Regalo). */
export function PackPicker() {
  const { picking, closePicker, addPack, catalog } = useCart();
  const [slots, setSlots] = useState<string[]>([]);
  const choices = packChoices(catalog);
  const pack = picking ? findPack(catalog, picking) : undefined;

  useEffect(() => {
    if (pack) setSlots(Array.from({ length: pack.bags }, (_, i) => choices[i % Math.max(1, choices.length)]?.key ?? ""));
  }, [picking]);

  if (!picking || !pack) return null;

  return (
    <div className="fixed inset-0 z-65 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`Elige los sabores del ${pack.name}`}>
      <div onClick={closePicker} className="absolute inset-0 bg-tinta/55 backdrop-blur-[2px]" />
      <div className="relative m-4 max-h-[90vh] w-full max-w-[460px] animate-up overflow-y-auto rounded-[22px] border-[3px] border-tinta bg-crema p-6 shadow-[8px_8px_0_var(--color-mostaza)]">
        <div className="eyebrow">{pack.bags} bolsas{pack.extra ? " + caja" : ""}</div>
        <h3 className="m-0 mt-2 font-display text-2xl font-extrabold">{pack.name}: elige tus sabores</h3>
        <div className="mt-5 flex flex-col gap-4">
          {slots.map((sel, i) => (
            <fieldset key={i} className="m-0 border-0 p-0">
              <legend className="field-label mb-2">Bolsa {i + 1}</legend>
              <div className="flex flex-wrap gap-2">
                {choices.map((f) => {
                  const on = sel === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSlots((s) => s.map((v, j) => (j === i ? f.key : v)))}
                      className="flex items-center gap-2 rounded-full border-2 border-tinta px-3.5 py-2 text-[13.5px] font-semibold"
                      style={{ background: on ? f.color : "transparent", color: on ? f.ink : "var(--color-tinta)" }}
                    >
                      <span className="size-2.5 rounded-full border-[1.5px] border-tinta" style={{ background: f.color }} />
                      {f.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={closePicker} className="btn px-5 py-3 text-sm text-tinta hover:bg-rosa">Cancelar</button>
          <button
            onClick={() => addPack(picking, slots)}
            disabled={slots.some((s) => !s)}
            className="btn-primary flex-1 px-5 py-3 text-sm shadow-[3px_3px_0_var(--color-tinta)] disabled:opacity-50"
          >
            Agregar · {money(packUnitPrice(catalog, pack, slots))}
          </button>
        </div>
      </div>
    </div>
  );
}
