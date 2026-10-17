"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Catalog, Flavor, Pack, PackTheme } from "@/lib/catalog";
import type { AdminBundle } from "@/lib/admin-store";
import { saveBundle, type BundleInput } from "@/app/admin/(app)/tienda/actions";
import { PACK_THEMES, PackCardView } from "@/components/pack-card";
import { money, packPriceVaries, packUnitPrice } from "@/lib/pricing";
import { MoneyInput } from "./money-input";
import { Field, StatusPill, Toggle, btnPrimary, btnSecondary, card, input } from "./ui";

const NEW: BundleInput = {
  name: "", description: "", bags: 2, discountPct: 10, extra: 0, fixed: false, items: [],
  label: "", chip: "", cta: "", theme: "crema", featured: false, active: true,
};

export function PackEditor({ bundle, products, startOpen = false, onDone }: { bundle?: AdminBundle; products: Flavor[]; startOpen?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(startOpen);
  const [b, setB] = useState<BundleInput>(bundle ? { ...bundle } : NEW);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof BundleInput>(k: K, v: BundleInput[K]) => {
    setMsg(null);
    setB((p) => ({ ...p, [k]: v }));
  };

  const fixedFlavors = b.items.flatMap((i) => Array(i.qty).fill(i.slug) as string[]);
  const sum = b.items.reduce((a, i) => a + i.qty, 0);
  const pack: Pack = {
    key: bundle?.slug ?? "nuevo",
    name: b.name || "Nombre del pack",
    description: b.description || "Descripción del pack.",
    bags: b.bags,
    rate: b.discountPct / 100,
    extra: b.extra,
    fixed: b.fixed ? fixedFlavors : null,
    label: b.label || null,
    chip: b.chip || null,
    cta: b.cta || null,
    theme: b.theme,
    featured: b.featured,
  };
  const previewCatalog: Catalog = { flavors: products, packs: [pack], shipping: { default: { fee: 0, freeFrom: 0, etaDays: 0 }, cities: {} } };
  const canPrice = !b.fixed || sum === b.bags;

  const qtyOf = (slug: string) => b.items.find((i) => i.slug === slug)?.qty ?? 0;
  const setQty = (slug: string, qty: number) =>
    set("items", [...b.items.filter((i) => i.slug !== slug), ...(qty > 0 ? [{ slug, qty }] : [])]);

  async function save() {
    setSaving(true);
    const r = await saveBundle(bundle?.slug ?? null, b);
    setSaving(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    setMsg({ ok: true, text: "✓ Guardado. La tienda ya muestra este pack así." });
    router.refresh();
    if (!bundle) {
      setB(NEW);
      onDone?.();
    }
  }

  if (!open) {
    return (
      <article className={`${card} flex flex-wrap items-center gap-4 p-4 ${bundle?.active === false ? "opacity-75" : ""}`}>
        <div className="min-w-[200px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 font-display text-[19px] font-extrabold">{b.name}</h2>
            <StatusPill on={b.active} />
            {b.featured && <span className="rounded-full bg-mostaza px-2 py-0.5 font-mono text-[10px] uppercase tracking-[.1em]">En portada</span>}
          </div>
          <div className="mt-1 text-[13px] text-tinta/60">
            {b.bags} bolsas · {b.fixed ? "sabores fijos" : "el cliente elige"} · −{b.discountPct} %{b.extra ? ` · + ${money(b.extra)} de cargo` : ""} ·{" "}
            {canPrice ? `${packPriceVaries(previewCatalog, pack) ? "desde " : ""}${money(packUnitPrice(previewCatalog, pack))}` : "revisar sabores"}
          </div>
        </div>
        <button type="button" onClick={() => setOpen(true)} className={btnSecondary}>
          Editar
        </button>
      </article>
    );
  }

  return (
    <article className={`${card} p-5 sm:p-6`}>
      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-5">
          <h2 className="m-0 font-display text-[21px] font-extrabold">{bundle ? `Editar: ${bundle.name}` : "Nuevo pack"}</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nombre" required htmlFor={`b-name-${pack.key}`}>
              <input id={`b-name-${pack.key}`} className={input} maxLength={60} value={b.name} placeholder="Ej: Pack Oficina" onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Número de bolsas" htmlFor={`b-bags-${pack.key}`}>
              <input id={`b-bags-${pack.key}`} type="number" min={1} max={24} className={input} value={b.bags} onChange={(e) => set("bags", Math.max(1, Math.min(24, Math.round(Number(e.target.value) || 1))))} />
            </Field>
          </div>
          <Field label="Descripción" hint="Una frase en la tarjeta del pack." htmlFor={`b-desc-${pack.key}`}>
            <textarea id={`b-desc-${pack.key}`} rows={2} className={input} maxLength={300} value={b.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={`Descuento · ${b.discountPct} %`} hint="Se aplica sobre el precio de las bolsas." htmlFor={`b-pct-${pack.key}`}>
              <input id={`b-pct-${pack.key}`} type="range" min={0} max={50} step={1} value={b.discountPct} onChange={(e) => set("discountPct", Number(e.target.value))} className="w-full accent-[#8B2150]" />
            </Field>
            <Field label="Cargo adicional (opcional)" hint="Ej: caja y tarjeta. No lleva descuento.">
              <MoneyInput value={b.extra} onChange={(n) => set("extra", n)} />
            </Field>
          </div>

          <Field label="¿Quién elige los sabores?">
            <div className="flex flex-wrap gap-2">
              {[
                [false, "El cliente los elige"],
                [true, "Sabores fijos"],
              ].map(([v, t]) => (
                <button
                  key={String(v)}
                  type="button"
                  aria-pressed={b.fixed === v}
                  onClick={() => set("fixed", v as boolean)}
                  className={`rounded-full border-2 px-3.5 py-1.5 text-[13.5px] font-semibold ${b.fixed === v ? "border-tinta bg-mostaza" : "border-tinta/20 bg-white"}`}
                >
                  {t as string}
                </button>
              ))}
            </div>
          </Field>
          {b.fixed && (
            <div className="rounded-2xl bg-crema/60 p-4">
              <div className={`text-[13.5px] font-semibold ${sum === b.bags ? "text-[#2F7D4F]" : "text-vino"}`}>
                {sum} de {b.bags} bolsas elegidas {sum === b.bags ? "✓" : ""}
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {products.map((f) => (
                  <div key={f.key} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-[14px] font-semibold">
                      <span className="size-2.5 rounded-full border-[1.5px] border-tinta" style={{ background: f.color }} />
                      {f.name} <span className="font-normal text-tinta/50">{money(f.price)}</span>
                    </span>
                    <span className="flex items-center overflow-hidden rounded-full border-2 border-tinta bg-white">
                      <button type="button" aria-label={`Menos ${f.name}`} onClick={() => setQty(f.key, Math.max(0, qtyOf(f.key) - 1))} className="px-3 py-1 font-semibold hover:bg-rosa">−</button>
                      <span className="min-w-6 text-center font-mono text-[14px]">{qtyOf(f.key)}</span>
                      <button type="button" aria-label={`Más ${f.name}`} onClick={() => setQty(f.key, qtyOf(f.key) + 1)} className="px-3 py-1 font-semibold hover:bg-rosa">+</button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <details className="rounded-2xl border-2 border-tinta/10 p-4">
            <summary className="cursor-pointer text-[14px] font-semibold">Apariencia de la tarjeta (opcional)</summary>
            <div className="mt-4 grid gap-5 sm:grid-cols-3">
              <Field label="Texto superior" hint={`Por defecto: "${b.bags} bolsas"`}>
                <input className={input} maxLength={30} value={b.label} onChange={(e) => set("label", e.target.value)} />
              </Field>
              <Field label="Etiqueta redonda" hint={`Por defecto: "−${b.discountPct} %"`}>
                <input className={input} maxLength={16} value={b.chip} onChange={(e) => set("chip", e.target.value)} />
              </Field>
              <Field label="Texto del botón" hint={`Por defecto: "Agregar ${b.name || "…"}"`}>
                <input className={input} maxLength={40} value={b.cta} onChange={(e) => set("cta", e.target.value)} />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(Object.keys(PACK_THEMES) as PackTheme[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={b.theme === t}
                  onClick={() => set("theme", t)}
                  className={`rounded-full border-2 px-3.5 py-1.5 text-[13px] font-semibold ${b.theme === t ? "border-tinta ring-2 ring-vino ring-offset-1" : "border-tinta/20"} ${PACK_THEMES[t].bg}`}
                >
                  {PACK_THEMES[t].label}
                </button>
              ))}
            </div>
          </details>

          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle checked={b.active} onChange={(v) => set("active", v)} label={b.active ? "Visible en la tienda" : "Oculto"} />
            <Toggle checked={b.featured} onChange={(v) => set("featured", v)} label="Botón en la portada" description="Aparece junto a «Comprar granola». Solo uno a la vez." />
          </div>

          {msg && (
            <p role={msg.ok ? "status" : "alert"} className={`m-0 rounded-xl px-4 py-3 text-[14px] font-medium ${msg.ok ? "bg-[#2F7D4F]/10 text-[#2F7D4F]" : "bg-[#B42318]/5 text-[#B42318]"}`}>
              {msg.text}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={save} disabled={saving} className={btnPrimary}>
              {saving ? "Guardando…" : bundle ? "Guardar cambios" : "Crear pack"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setMsg(null);
                if (bundle) setB({ ...bundle });
                onDone?.();
              }}
              className={btnSecondary}
            >
              {bundle ? "Cerrar" : "Cancelar"}
            </button>
          </div>
        </div>
        <div className="min-w-0 lg:sticky lg:top-6">
          <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[.16em] text-tinta/55">Vista previa</div>
          <div className="pointer-events-none">
            {canPrice ? <PackCardView p={pack} catalog={previewCatalog} /> : <p className="text-[13px] text-vino">Completa los sabores para ver el precio.</p>}
          </div>
        </div>
      </div>
    </article>
  );
}

export function NewPackButton({ products }: { products: Flavor[] }) {
  const [open, setOpen] = useState(false);
  if (open) return <PackEditor products={products} startOpen onDone={() => setOpen(false)} />;
  return (
    <button type="button" onClick={() => setOpen(true)} className={btnPrimary}>
      ＋ Crear pack nuevo
    </button>
  );
}
