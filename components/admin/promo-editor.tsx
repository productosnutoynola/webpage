"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPromo, setPromoActive } from "@/app/admin/(app)/tienda/actions";
import { funPromoCode } from "@/lib/promo-names";
import { btnPrimary, btnSecondary, card, input } from "./ui";

type Kind = "percent" | "free_shipping";
const OPTIONS: { kind: Kind; percent: number | null; label: string }[] = [
  ...[5, 10, 15, 20, 30, 40, 50].map((p) => ({ kind: "percent" as Kind, percent: p, label: `${p} %` })),
  { kind: "free_shipping", percent: null, label: "Envío gratis" },
];

/** Crear un código: elegir descuento, nombre aleatorio divertido (editable) y nota. */
export function NewPromo() {
  const router = useRouter();
  const [opt, setOpt] = useState(OPTIONS[1]);
  const [code, setCode] = useState(() => funPromoCode("percent", 10));
  const [touched, setTouched] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const pick = (o: (typeof OPTIONS)[number]) => {
    setOpt(o);
    if (!touched) setCode(funPromoCode(o.kind, o.percent));
  };

  async function create() {
    setBusy(true);
    setMsg(null);
    const r = await createPromo({ code, kind: opt.kind, percent: opt.percent, note });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    setMsg({ ok: true, text: `✓ Código ${r.code} creado y activo. Ya lo pueden usar en el checkout.` });
    setTouched(false);
    setNote("");
    setCode(funPromoCode(opt.kind, opt.percent));
    router.refresh();
  }

  return (
    <section className={`${card} p-5 sm:p-7`}>
      <h2 className="m-0 font-display text-[21px] font-extrabold">Crear código</h2>
      <div className="mt-5">
        <div className="mb-2 text-[13.5px] font-semibold">1. ¿Qué descuento da?</div>
        <div className="flex flex-wrap gap-2">
          {OPTIONS.map((o) => {
            const on = o.label === opt.label;
            return (
              <button
                key={o.label}
                type="button"
                aria-pressed={on}
                onClick={() => pick(o)}
                className={`rounded-full border-2 px-4 py-2 text-[14px] font-bold ${on ? "border-tinta bg-ciruela text-crema" : "border-tinta/20 bg-white hover:border-tinta/50"}`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        <p className="m-0 mt-2 text-[12.5px] text-tinta/55">
          {opt.kind === "percent" ? `Descuenta el ${opt.percent} % del valor de los productos (después del descuento de packs). El envío se cobra normal.` : "El envío queda en $0 sin importar la ciudad ni el valor de la compra."}
        </p>
      </div>

      <div className="mt-6">
        <div className="mb-2 text-[13.5px] font-semibold">2. Nombre del código</div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border-[2.5px] border-dashed border-tinta bg-mostaza px-5 py-3 shadow-[4px_4px_0_var(--color-tinta)]">
            <input
              aria-label="Código"
              value={code}
              onChange={(e) => {
                setTouched(true);
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24));
              }}
              className="w-[min(260px,60vw)] bg-transparent font-mono text-[22px] font-bold tracking-[.08em] text-tinta outline-none"
            />
          </div>
          <button type="button" onClick={() => { setTouched(false); setCode(funPromoCode(opt.kind, opt.percent)); }} className={btnSecondary}>
            🎲 Otro nombre
          </button>
        </div>
        <p className="m-0 mt-2 text-[12.5px] text-tinta/55">Puedes dejar el nombre aleatorio o escribir el tuyo (solo letras y números).</p>
      </div>

      <div className="mt-6 max-w-[460px]">
        <label htmlFor="promo-note" className="mb-1.5 block text-[13.5px] font-semibold">3. Nota interna (opcional)</label>
        <input id="promo-note" className={input} maxLength={120} placeholder="Ej: Campaña Instagram octubre" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`m-0 mt-5 rounded-xl px-4 py-3 text-[14px] font-medium ${msg.ok ? "bg-[#2F7D4F]/10 text-[#2F7D4F]" : "bg-[#B42318]/5 text-[#B42318]"}`}>
          {msg.text}
        </p>
      )}
      <button type="button" onClick={create} disabled={busy || code.length < 4} className={`${btnPrimary} mt-6`}>
        {busy ? "Creando…" : "Crear código"}
      </button>
    </section>
  );
}

export function PromoToggle({ code, active }: { code: string; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (active && !window.confirm(`¿Deshabilitar ${code}? Los clientes ya no podrán usarlo.`)) return;
        start(async () => {
          await setPromoActive(code, !active);
          router.refresh();
        });
      }}
      className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-[12.5px] font-bold ${
        active ? "border-[#2F7D4F]/50 bg-[#2F7D4F]/10 text-[#2F7D4F]" : "border-tinta/25 bg-tinta/5 text-tinta/60"
      }`}
      aria-pressed={active}
    >
      <span className={`relative inline-block h-4 w-7 rounded-full ${active ? "bg-[#2F7D4F]" : "bg-tinta/30"}`}>
        <span className={`absolute top-0.5 size-3 rounded-full bg-white transition-all ${active ? "left-3.5" : "left-0.5"}`} />
      </span>
      {pending ? "…" : active ? "Habilitado" : "Deshabilitado"}
    </button>
  );
}

export function CopyCode({ code }: { code: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
      className="rounded-lg px-2 py-1 text-[12.5px] font-semibold text-vino hover:bg-rosa/40"
    >
      {done ? "✓ Copiado" : "Copiar"}
    </button>
  );
}
