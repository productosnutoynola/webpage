"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Flavor } from "@/lib/catalog";
import { money } from "@/lib/pricing";
import type { AdminProduct } from "@/lib/admin-store";
import { createProduct, updateProduct, type ProductInput } from "@/app/admin/(app)/tienda/actions";
import { FlavorCardView } from "@/components/flavor-card";
import { ImageUpload } from "./image-upload";
import { MoneyInput } from "./money-input";
import { Field, Toggle, btnPrimary, btnSecondary, card, input } from "./ui";

type Draft = ProductInput & { initialStock: number; threshold: number };

const BRAND = [
  { hex: "#DEA12C", name: "Mostaza" },
  { hex: "#5F1637", name: "Ciruela" },
  { hex: "#EFB0CB", name: "Rosa" },
  { hex: "#8B2150", name: "Vino" },
  { hex: "#FBF3E4", name: "Crema" },
  { hex: "#C9AB8B", name: "Kraft" },
  { hex: "#2A1018", name: "Tinta" },
];
const BADGES = ["", "Nuevo", "Más vendida", "Edición limitada", "Favorita"];
const CATEGORIES = ["Granola", "Mantequilla", "Snack", "Bebida"];

const EMPTY: Draft = {
  name: "",
  category: "Granola",
  price: 37000,
  short: "",
  long: "",
  ingredients: "",
  img: "",
  photoBg: "#E9D8BF",
  objectPosition: "50% 50%",
  blend: false,
  showLabel: true,
  labelTop: 42,
  color: "#DEA12C",
  ink: "#5F1637",
  meta: "",
  badge: "Nuevo",
  reviews: 0,
  servings: "14 porciones · IVA incluido",
  gallery: [],
  nutrition: [["Porción", ""], ["Calorías", ""], ["Proteína", ""], ["Grasa total", ""], ["Fibra", ""]],
  packEligible: true,
  active: true,
  initialStock: 0,
  threshold: 10,
};

function fromProduct(p: AdminProduct): Draft {
  return {
    name: p.name, category: p.category, price: p.price, short: p.short, long: p.long, ingredients: p.ingredients,
    img: p.img, photoBg: p.photoBg, objectPosition: p.objectPosition, blend: p.blend, showLabel: p.showLabel,
    labelTop: p.labelTop, color: p.color, ink: p.ink, meta: p.meta, badge: p.badge, reviews: p.reviews,
    servings: p.servings, gallery: p.gallery, nutrition: p.nutrition.length ? p.nutrition : EMPTY.nutrition,
    packEligible: p.packEligible, active: p.active, initialStock: 0, threshold: p.stock.threshold,
  };
}

/** Texto legible sobre el color de la etiqueta (contraste simple por luminancia). */
function suggestInk(bg: string): string {
  const n = parseInt(bg.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.35 ? "#5F1637" : "#EFB0CB";
}

type Step = { key: string; title: string; help: string };
const STEPS: Step[] = [
  { key: "basico", title: "Lo básico", help: "Nombre, precio y tipo de producto." },
  { key: "fotos", title: "Fotos", help: "La foto principal y fotos adicionales." },
  { key: "textos", title: "Descripción", help: "Lo que lee el cliente antes de comprar." },
  { key: "estilo", title: "Etiqueta y estilo", help: "Colores, etiqueta e insignia." },
  { key: "publicar", title: "Stock y publicar", help: "Cuántas bolsas hay y si se ve en la tienda." },
];

function problems(d: Draft): { step: number; msg: string }[] {
  const out: { step: number; msg: string }[] = [];
  if (d.name.trim().length < 2) out.push({ step: 0, msg: "Escribe el nombre del producto." });
  if (!d.price || d.price < 1000) out.push({ step: 0, msg: "Escribe un precio de al menos $1.000." });
  if (!d.img) out.push({ step: 1, msg: "Sube la foto principal." });
  if (d.short.trim().length < 10) out.push({ step: 2, msg: "Escribe una descripción corta (mínimo 10 caracteres)." });
  return out;
}

export function ProductEditor({ product }: { product?: AdminProduct }) {
  const router = useRouter();
  const editing = Boolean(product);
  const [d, setD] = useState<Draft>(product ? fromProduct(product) : EMPTY);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [view, setView] = useState<"card" | "page">("card");
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setSaved(false);
    setD((p) => ({ ...p, [k]: v }));
  };

  const [posX, posY] = d.objectPosition.split(" ").map((v) => parseInt(v, 10));
  const issues = problems(d);
  const slugPreview = product?.slug ?? (d.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "nombre-del-producto");

  const preview: Flavor = useMemo(
    () => ({
      key: slugPreview,
      name: d.name || "Nombre del producto",
      price: d.price,
      category: d.category || "Granola",
      color: d.color,
      ink: d.ink,
      photoBg: d.photoBg,
      img: d.img || "/img/logo.png",
      objectPosition: d.objectPosition,
      blend: d.blend,
      labelTop: d.showLabel ? d.labelTop : null,
      short: d.short || "Aquí va la descripción corta que verá el cliente en la tienda.",
      long: d.long,
      ingredients: d.ingredients,
      meta: d.meta,
      reviews: d.reviews,
      badge: d.badge || null,
      servings: d.servings,
      gallery: d.gallery,
      nutrition: d.nutrition.filter(([k, v]) => k && v),
      packEligible: d.packEligible,
    }),
    [d, slugPreview],
  );

  async function save(publish?: boolean) {
    setError(null);
    if (issues.length) {
      setStep(issues[0].step);
      setError(issues[0].msg);
      return;
    }
    setSaving(true);
    const payload: ProductInput = { ...d, active: publish ?? d.active, nutrition: d.nutrition.filter(([k, v]) => k.trim() && v.trim()) };
    const r = product ? await updateProduct(product.slug, payload) : await createProduct(payload);
    setSaving(false);
    if (!r.ok) return setError(r.error);
    if (product) {
      setSaved(true);
      setD((p) => ({ ...p, active: payload.active }));
      router.refresh();
    } else if ("slug" in r) {
      router.push(`/admin/tienda/productos?creado=${r.slug}`);
    }
  }

  const last = step === STEPS.length - 1;

  return (
    <div className="mt-7 grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        {/* Pasos */}
        <ol className="m-0 flex list-none gap-2 overflow-x-auto p-0 pb-1" aria-label="Pasos">
          {STEPS.map((s, i) => {
            const on = i === step;
            const done = !editing && i < step;
            const bad = issues.some((x) => x.step === i) && (editing || i < step);
            return (
              <li key={s.key} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  aria-current={on ? "step" : undefined}
                  className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-[13px] font-semibold ${
                    on ? "border-tinta bg-ciruela text-crema" : "border-tinta/15 bg-white text-tinta/75 hover:border-tinta/40"
                  }`}
                >
                  <span
                    className={`grid size-6 place-items-center rounded-full border-2 text-[11.5px] ${
                      on ? "border-mostaza bg-mostaza text-tinta" : done ? "border-[#2F7D4F] bg-[#2F7D4F] text-white" : bad ? "border-[#B42318] text-[#B42318]" : "border-tinta/25"
                    }`}
                  >
                    {done ? "✓" : bad ? "!" : i + 1}
                  </span>
                  {s.title}
                </button>
              </li>
            );
          })}
        </ol>

        <section className={`${card} mt-4 p-5 sm:p-7`}>
          <h2 className="m-0 font-display text-[22px] font-extrabold">
            {step + 1}. {STEPS[step].title}
          </h2>
          <p className="m-0 mt-1 text-[13.5px] text-tinta/55">{STEPS[step].help}</p>

          <div className="mt-6 flex flex-col gap-5">
            {step === 0 && (
              <>
                <Field label="Nombre del producto" htmlFor="p-name" required hint="Así aparece en la tarjeta, en el carrito y en el correo de confirmación.">
                  <input id="p-name" className={input} value={d.name} maxLength={60} placeholder="Ej: Coconut Crunch" onChange={(e) => set("name", e.target.value)} />
                </Field>
                <Field label="Tipo de producto" hint="Aparece encima del nombre en la página del producto y en la etiqueta.">
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={d.category === c}
                        onClick={() => set("category", c)}
                        className={`rounded-full border-2 px-3.5 py-1.5 text-[13.5px] font-semibold ${d.category === c ? "border-tinta bg-mostaza" : "border-tinta/20 bg-white hover:border-tinta/50"}`}
                      >
                        {c}
                      </button>
                    ))}
                    <input
                      aria-label="Otro tipo de producto"
                      className={`${input} !w-[170px] !py-1.5`}
                      placeholder="Otro…"
                      value={CATEGORIES.includes(d.category) ? "" : d.category}
                      maxLength={30}
                      onChange={(e) => set("category", e.target.value || "Granola")}
                    />
                  </div>
                </Field>
                <Field label="Precio de venta (con IVA)" htmlFor="p-price" required hint={d.price >= 1000 ? `El cliente verá ${money(d.price)}. Los packs aplican su descuento sobre este precio.` : "Escribe el precio en pesos, sin puntos."}>
                  <MoneyInput id="p-price" value={d.price} onChange={(n) => set("price", n)} className="max-w-[220px]" />
                </Field>
                <Toggle
                  id="p-pack"
                  checked={d.packEligible}
                  onChange={(v) => set("packEligible", v)}
                  label="Se puede elegir dentro de los packs"
                  description="Si está activo, aparece como opción en el Pack Dúo y la Caja Regalo. Apágalo para productos que no son bolsas de granola."
                />
              </>
            )}

            {step === 1 && (
              <>
                <Field label="Foto principal" required hint="Usa una foto cuadrada o vertical, con buena luz. Se reduce automáticamente para que la página cargue rápido.">
                  <ImageUpload value={d.img} onChange={(u) => set("img", u)} label="Foto principal" />
                </Field>
                {d.img && (
                  <div className="grid gap-5 rounded-2xl bg-crema/60 p-4 sm:grid-cols-2">
                    <Field label={`Encuadre horizontal · ${posX}%`} htmlFor="p-x" hint="Mueve la foto a la izquierda o derecha dentro del cuadro.">
                      <input id="p-x" type="range" min={0} max={100} value={posX} onChange={(e) => set("objectPosition", `${e.target.value}% ${posY}%`)} className="w-full accent-[#8B2150]" />
                    </Field>
                    <Field label={`Encuadre vertical · ${posY}%`} htmlFor="p-y" hint="Súbela o bájala para centrar el producto.">
                      <input id="p-y" type="range" min={0} max={100} value={posY} onChange={(e) => set("objectPosition", `${posX}% ${e.target.value}%`)} className="w-full accent-[#8B2150]" />
                    </Field>
                    <div className="sm:col-span-2">
                      <Toggle
                        id="p-blend"
                        checked={d.blend}
                        onChange={(v) => set("blend", v)}
                        label="Fundir la foto con el color de fondo"
                        description="Útil si la foto tiene fondo blanco: el blanco toma el color de fondo de abajo."
                      />
                    </div>
                    <Field label="Color de fondo de la foto" hint="Se ve mientras la foto carga y en los bordes.">
                      <Swatches value={d.photoBg} onChange={(v) => set("photoBg", v)} name="Fondo" />
                    </Field>
                  </div>
                )}
                <Field label="Fotos adicionales (opcional, hasta 4)" hint="Se muestran debajo de la foto principal en la página del producto. Escribe qué muestra cada una: ayuda a quienes usan lector de pantalla y a Google.">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => {
                      const g = d.gallery[i];
                      if (!g && i > d.gallery.length) return <div key={i} className="hidden sm:block" />;
                      return (
                        <div key={i} className="flex flex-col gap-2">
                          <ImageUpload
                            compact
                            value={g?.src ?? ""}
                            label={`Foto adicional ${i + 1}`}
                            onChange={(url) => {
                              const next = [...d.gallery];
                              if (url) next[i] = { src: url, alt: next[i]?.alt ?? "" };
                              else next.splice(i, 1);
                              set("gallery", next.filter(Boolean));
                            }}
                          />
                          {g && (
                            <input
                              aria-label={`Descripción de la foto ${i + 1}`}
                              className={`${input} !py-1.5 !text-[13px]`}
                              placeholder="Ej: Servida en bowl"
                              value={g.alt}
                              maxLength={120}
                              onChange={(e) => set("gallery", d.gallery.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <Field label="Descripción corta" htmlFor="p-short" required hint={`Aparece en la tarjeta de la tienda. Una o dos frases que antojen. ${d.short.length}/220`}>
                  <textarea id="p-short" rows={2} maxLength={220} className={input} value={d.short} placeholder="Ej: Coco tostado y almendras. El crunch tropical para tu yogur." onChange={(e) => set("short", e.target.value)} />
                </Field>
                <Field label="Descripción completa" htmlFor="p-long" hint={`Se lee en la página del producto. Cuenta cómo sabe, con qué combina y para quién es. ${d.long.length}/1500`}>
                  <textarea id="p-long" rows={5} maxLength={1500} className={input} value={d.long} onChange={(e) => set("long", e.target.value)} />
                </Field>
                <Field label="Ingredientes" htmlFor="p-ing" hint="Aparecen en la tarjeta y en la página. Sepáralos con + o comas.">
                  <textarea id="p-ing" rows={3} maxLength={600} className={input} value={d.ingredients} placeholder="Avena + almendras + coco + …" onChange={(e) => set("ingredients", e.target.value)} />
                </Field>
                <Field label="Presentación" htmlFor="p-serv" hint="Línea pequeña debajo del precio en la página del producto.">
                  <input id="p-serv" className={input} maxLength={60} value={d.servings} placeholder="Ej: 14 porciones · IVA incluido" onChange={(e) => set("servings", e.target.value)} />
                </Field>
                <Field label="Información nutricional" hint="Deja en blanco las filas que no quieras mostrar. Si todas quedan vacías, la tabla no aparece.">
                  <div className="flex flex-col gap-2">
                    {d.nutrition.map(([k, v], i) => (
                      <div key={i} className="flex gap-2">
                        <input aria-label={`Dato ${i + 1}`} className={`${input} !py-2`} value={k} maxLength={40} placeholder="Ej: Calorías" onChange={(e) => set("nutrition", d.nutrition.map((r, j) => (j === i ? [e.target.value, r[1]] : r)))} />
                        <input aria-label={`Valor ${i + 1}`} className={`${input} !py-2`} value={v} maxLength={40} placeholder="Ej: 158 kcal" onChange={(e) => set("nutrition", d.nutrition.map((r, j) => (j === i ? [r[0], e.target.value] : r)))} />
                        <button type="button" aria-label={`Quitar fila ${i + 1}`} onClick={() => set("nutrition", d.nutrition.filter((_, j) => j !== i))} className="rounded-lg px-2.5 text-tinta/50 hover:bg-rosa/40 hover:text-vino">
                          ✕
                        </button>
                      </div>
                    ))}
                    {d.nutrition.length < 12 && (
                      <button type="button" onClick={() => set("nutrition", [...d.nutrition, ["", ""]])} className="self-start rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-vino hover:bg-rosa/40">
                        ＋ Agregar fila
                      </button>
                    )}
                  </div>
                </Field>
              </>
            )}

            {step === 3 && (
              <>
                <Toggle
                  id="p-label"
                  checked={d.showLabel}
                  onChange={(v) => set("showLabel", v)}
                  label="Dibujar la etiqueta Nuto & Nola sobre la foto"
                  description="Como en las bolsas kraft actuales. Apágalo si la foto ya muestra el empaque con su etiqueta impresa."
                />
                <Field label="Color principal" hint="Color de la etiqueta y de la sombra de la tarjeta.">
                  <Swatches
                    value={d.color}
                    onChange={(v) => {
                      setSaved(false);
                      setD((p) => ({ ...p, color: v, ink: suggestInk(v) }));
                    }}
                    name="Color principal"
                  />
                </Field>
                {d.showLabel && (
                  <>
                    <Field label="Color del texto de la etiqueta" hint="Lo sugerimos automáticamente para que se lea bien; puedes cambiarlo.">
                      <Swatches value={d.ink} onChange={(v) => set("ink", v)} name="Texto" />
                    </Field>
                    <Field label="Palabra destacada de la etiqueta" htmlFor="p-meta" hint={`Aparece en la etiqueta: "${(d.category || "granola").toLowerCase()} · ${d.meta || "canela"}". Una o dos palabras.`}>
                      <input id="p-meta" className={`${input} max-w-[260px]`} maxLength={24} value={d.meta} placeholder="Ej: coco" onChange={(e) => set("meta", e.target.value)} />
                    </Field>
                    <Field label={`Altura de la etiqueta · ${d.labelTop}%`} htmlFor="p-top" hint="Muévela hasta que quede sobre la bolsa en la foto.">
                      <input id="p-top" type="range" min={10} max={90} value={d.labelTop} onChange={(e) => set("labelTop", Number(e.target.value))} className="w-full max-w-[420px] accent-[#8B2150]" />
                    </Field>
                  </>
                )}
                <Field label="Insignia (opcional)" hint="Un aviso pequeño en la esquina de la foto.">
                  <div className="flex flex-wrap gap-2">
                    {BADGES.map((b) => (
                      <button
                        key={b || "none"}
                        type="button"
                        aria-pressed={d.badge === b}
                        onClick={() => set("badge", b)}
                        className={`rounded-full border-2 px-3.5 py-1.5 text-[13.5px] font-semibold ${d.badge === b ? "border-tinta bg-ciruela text-rosa" : "border-tinta/20 bg-white hover:border-tinta/50"}`}
                      >
                        {b || "Sin insignia"}
                      </button>
                    ))}
                    <input
                      aria-label="Otra insignia"
                      className={`${input} !w-[170px] !py-1.5`}
                      placeholder="Otra…"
                      maxLength={24}
                      value={BADGES.includes(d.badge) ? "" : d.badge}
                      onChange={(e) => set("badge", e.target.value)}
                    />
                  </div>
                </Field>
                <Field label="Número de reseñas" htmlFor="p-rev" hint="Se muestra junto a las 5 estrellas en la página del producto. Déjalo en 0 para ocultarlo.">
                  <input id="p-rev" type="number" min={0} className={`${input} max-w-[160px]`} value={d.reviews} onChange={(e) => set("reviews", Math.max(0, Math.round(Number(e.target.value) || 0)))} />
                </Field>
              </>
            )}

            {step === 4 && (
              <>
                {editing ? (
                  <div className="rounded-2xl bg-crema/60 p-4 text-[14px]">
                    <div className="font-semibold">
                      Stock actual: {product!.stock.onHand - product!.stock.reserved} bolsas disponibles
                      {product!.stock.reserved > 0 && ` (${product!.stock.reserved} reservadas)`}
                    </div>
                    <p className="m-0 mt-1 text-[13px] text-tinta/60">
                      Para sumar bolsas o corregir el conteo usa{" "}
                      <Link href="/admin/tienda/inventario" className="font-semibold text-vino underline">
                        Inventario
                      </Link>
                      .
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Bolsas disponibles hoy" htmlFor="p-stock" hint="Si queda en 0, el producto se ve pero no se puede comprar hasta que cargues stock.">
                      <input id="p-stock" type="number" min={0} className={input} value={d.initialStock} onChange={(e) => set("initialStock", Math.max(0, Math.round(Number(e.target.value) || 0)))} />
                    </Field>
                    <Field label="Avisarme cuando queden menos de" htmlFor="p-thr" hint="El panel lo marca en rojo como stock bajo.">
                      <input id="p-thr" type="number" min={0} className={input} value={d.threshold} onChange={(e) => set("threshold", Math.max(0, Math.round(Number(e.target.value) || 0)))} />
                    </Field>
                  </div>
                )}
                <Toggle
                  id="p-active"
                  checked={d.active}
                  onChange={(v) => set("active", v)}
                  label={d.active ? "Visible en la tienda" : "Oculto (borrador)"}
                  description="Oculto: se guarda pero los clientes no lo ven. Puedes publicarlo cuando quieras."
                />
                <div className="rounded-2xl border-2 border-tinta/10 p-4">
                  <div className="text-[13.5px] font-semibold">Revisión final</div>
                  <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0 text-[13.5px]">
                    {[
                      [d.name.trim().length >= 2, "Nombre"],
                      [d.price >= 1000, `Precio: ${money(d.price)}`],
                      [Boolean(d.img), "Foto principal"],
                      [d.short.trim().length >= 10, "Descripción corta"],
                      [Boolean(d.long.trim()), "Descripción completa (recomendado)"],
                      [Boolean(d.ingredients.trim()), "Ingredientes (recomendado)"],
                    ].map(([ok, t]) => (
                      <li key={String(t)} className={ok ? "text-[#2F7D4F]" : "text-tinta/55"}>
                        <span aria-hidden="true">{ok ? "✓" : "○"}</span> {t as string}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>

          {error && (
            <p role="alert" className="m-0 mt-6 rounded-xl border-2 border-[#B42318]/30 bg-[#B42318]/5 px-4 py-3 text-[14px] font-medium text-[#B42318]">
              {error}
            </p>
          )}
          {saved && (
            <p role="status" className="m-0 mt-6 rounded-xl border-2 border-[#2F7D4F]/30 bg-[#2F7D4F]/10 px-4 py-3 text-[14px] font-medium text-[#2F7D4F]">
              ✓ Cambios guardados. La tienda ya muestra la versión nueva.
            </p>
          )}

          {/* Navegación */}
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-tinta/10 pt-5">
            <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className={btnSecondary}>
              ← Anterior
            </button>
            <div className="flex flex-wrap gap-3">
              {editing && (
                <button type="button" onClick={() => save()} disabled={saving} className={btnPrimary}>
                  {saving ? "Guardando…" : "Guardar cambios"}
                </button>
              )}
              {!last && (
                <button type="button" onClick={() => setStep((s) => s + 1)} className={editing ? btnSecondary : btnPrimary}>
                  Siguiente →
                </button>
              )}
              {!editing && last && (
                <button type="button" onClick={() => save()} disabled={saving} className={btnPrimary}>
                  {saving ? "Publicando…" : d.active ? "Publicar en la tienda" : "Guardar como borrador"}
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Vista previa */}
      <aside className="min-w-0 xl:sticky xl:top-6">
        <div className="flex items-center justify-between gap-3">
          <div className="font-mono text-[10.5px] uppercase tracking-[.16em] text-tinta/55">Vista previa en vivo</div>
          <div className="flex rounded-lg border-2 border-tinta/15 bg-white p-0.5 text-[12.5px] font-semibold">
            {(["card", "page"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`rounded-md px-2.5 py-1 ${view === v ? "bg-ciruela text-crema" : "text-tinta/65"}`}>
                {v === "card" ? "Tarjeta" : "Página"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 max-w-[380px]">
          {view === "card" ? (
            <div className="pointer-events-none">
              <FlavorCardView f={preview} href="#" />
            </div>
          ) : (
            <PagePreview f={preview} />
          )}
        </div>
        <p className="m-0 mt-4 break-all text-[12.5px] text-tinta/55">
          Dirección: <span className="font-mono">productosnutoynola.com/producto/{slugPreview}</span>
        </p>
        {editing && product!.active && (
          <a href={`/producto/${product!.slug}`} target="_blank" rel="noopener" className="mt-1 inline-block text-[13px] font-semibold text-vino">
            Abrir en la tienda ↗
          </a>
        )}
      </aside>
    </div>
  );
}

function PagePreview({ f }: { f: Flavor }) {
  return (
    <div className="overflow-hidden rounded-[18px] border-2 border-tinta bg-crema p-4">
      <div className="relative aspect-square overflow-hidden rounded-xl border-2 border-tinta" style={{ background: f.photoBg }}>
        <img src={f.img} alt="" className="size-full object-cover" style={{ objectPosition: f.objectPosition, mixBlendMode: f.blend ? "multiply" : undefined }} />
      </div>
      {f.gallery.length > 0 && (
        <div className="mt-2 flex gap-2">
          {f.gallery.map((g) => (
            <img key={g.src} src={g.src} alt="" className="aspect-square min-w-0 flex-1 rounded-lg border-2 border-tinta object-cover" />
          ))}
        </div>
      )}
      <div className="mt-4 font-mono text-[10px] uppercase tracking-[.16em] text-vino">{f.category}</div>
      <div className="mt-1 font-display text-[26px] font-extrabold leading-none tracking-[-.03em]">{f.name}</div>
      {f.reviews > 0 && <div className="mt-1.5 text-[12px] text-tinta/55"><span className="text-oro">★★★★★</span> {f.reviews} reseñas</div>}
      {f.long && <p className="m-0 mt-2.5 line-clamp-5 text-[13px] leading-relaxed text-tinta/70">{f.long}</p>}
      <div className="mt-3 font-display text-[22px] font-extrabold">{money(f.price)}</div>
      {f.servings && <div className="font-mono text-[11px] text-tinta/55">{f.servings}</div>}
      {f.nutrition.length > 0 && (
        <div className="mt-3 flex flex-col gap-px overflow-hidden rounded-lg border-2 border-tinta bg-tinta text-[12px]">
          {f.nutrition.map(([k, v], i) => (
            <div key={i} className="flex justify-between bg-crema px-2.5 py-1.5">
              <span className="text-tinta/65">{k}</span>
              <span className="font-mono">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Swatches({ value, onChange, name }: { value: string; onChange: (v: string) => void; name: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {BRAND.map((c) => (
        <button
          key={c.hex}
          type="button"
          title={c.name}
          aria-label={`${name}: ${c.name}`}
          aria-pressed={value.toUpperCase() === c.hex}
          onClick={() => onChange(c.hex)}
          className={`size-9 rounded-full border-2 ${value.toUpperCase() === c.hex ? "border-tinta ring-2 ring-vino ring-offset-2" : "border-tinta/30"}`}
          style={{ background: c.hex }}
        />
      ))}
      <label className="flex items-center gap-2 rounded-full border-2 border-tinta/20 bg-white py-1 pl-1 pr-3 text-[12.5px] font-semibold">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="size-7 cursor-pointer rounded-full border-0 bg-transparent p-0" aria-label={`${name}: otro color`} />
        Otro
      </label>
    </div>
  );
}
