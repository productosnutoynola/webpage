"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addStock, setStock, setThreshold } from "@/app/admin/(app)/tienda/actions";
import { btnPrimary, btnSecondary, input } from "./ui";

type P = { slug: string; name: string; color: string; active: boolean; onHand: number; reserved: number; threshold: number };

export function StockRow({ p }: { p: P }) {
  const router = useRouter();
  const [mode, setMode] = useState<"add" | "count" | null>(null);
  const [qty, setQty] = useState(0);
  const [note, setNote] = useState("");
  const [thr, setThr] = useState(p.threshold);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const available = p.onHand - p.reserved;
  const low = available <= p.threshold;

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: ok } : { ok: false, text: r.error ?? "Error" });
    if (r.ok) {
      setMode(null);
      setQty(0);
      setNote("");
      router.refresh();
    }
  }

  return (
    <article className="rounded-[20px] border-2 border-tinta bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-[180px] items-center gap-2.5">
          <span className="size-3 rounded-full border-[1.5px] border-tinta" style={{ background: p.color }} />
          <h2 className="m-0 font-display text-[19px] font-extrabold">{p.name}</h2>
          {!p.active && <span className="text-[12px] text-tinta/50">(oculto)</span>}
        </div>
        <dl className="m-0 flex gap-6 text-center">
          {[
            ["Disponibles", available, low ? "text-[#B42318]" : "text-tinta"],
            ["Reservadas", p.reserved, "text-tinta/60"],
            ["En bodega", p.onHand, "text-tinta/60"],
          ].map(([l, v, c]) => (
            <div key={l as string}>
              <dt className="font-mono text-[10px] uppercase tracking-[.14em] text-tinta/50">{l}</dt>
              <dd className={`m-0 font-display text-[26px] font-extrabold leading-tight ${c}`}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      {low && <p className="m-0 mt-2 text-[12.5px] font-semibold text-[#B42318]">Stock bajo: quedan {available} (alerta en {p.threshold}).</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => { setMode(mode === "add" ? null : "add"); setMsg(null); setQty(0); }} className={btnPrimary}>
          ＋ Sumar bolsas
        </button>
        <button type="button" onClick={() => { setMode(mode === "count" ? null : "count"); setMsg(null); setQty(p.onHand); }} className={btnSecondary}>
          Corregir conteo
        </button>
        <label className="ml-auto flex items-center gap-2 text-[13px] text-tinta/65">
          Alerta cuando queden
          <input type="number" min={0} value={thr} onChange={(e) => setThr(Math.max(0, Math.round(Number(e.target.value) || 0)))} className={`${input} !w-[80px] !py-1.5`} />
          {thr !== p.threshold && (
            <button type="button" disabled={busy} onClick={() => run(() => setThreshold(p.slug, thr), "✓ Alerta actualizada")} className="font-semibold text-vino">
              Guardar
            </button>
          )}
        </label>
      </div>

      {mode && (
        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl bg-crema/60 p-4">
          <label className="text-[13px] font-semibold">
            {mode === "add" ? "¿Cuántas bolsas llegaron?" : "¿Cuántas bolsas hay en bodega (conteo real)?"}
            <input type="number" min={0} autoFocus value={qty} onChange={(e) => setQty(Math.max(0, Math.round(Number(e.target.value) || 0)))} className={`${input} mt-1.5 !w-[140px]`} />
          </label>
          <label className="min-w-[200px] flex-1 text-[13px] font-semibold">
            Nota (opcional)
            <input value={note} maxLength={120} placeholder={mode === "add" ? "Ej: Producción del 15 oct" : "Ej: Conteo mensual"} onChange={(e) => setNote(e.target.value)} className={`${input} mt-1.5`} />
          </label>
          <button
            type="button"
            disabled={busy || (mode === "add" && qty < 1)}
            onClick={() =>
              mode === "add"
                ? run(() => addStock(p.slug, qty, note), `✓ Se sumaron ${qty} bolsas`)
                : run(() => setStock(p.slug, qty, note), `✓ Stock corregido a ${qty}`)
            }
            className={btnPrimary}
          >
            {busy ? "Guardando…" : mode === "add" ? `Sumar ${qty || ""} bolsas` : "Guardar conteo"}
          </button>
        </div>
      )}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`m-0 mt-3 text-[13px] font-medium ${msg.ok ? "text-[#2F7D4F]" : "text-[#B42318]"}`}>{msg.text}</p>}
    </article>
  );
}
