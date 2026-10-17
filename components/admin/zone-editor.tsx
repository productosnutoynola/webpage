"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminZone } from "@/lib/admin-store";
import { COLOMBIA } from "@/lib/colombia";
import { deleteZone, saveZone } from "@/app/admin/(app)/tienda/actions";
import { money } from "@/lib/pricing";
import { MoneyInput } from "./money-input";
import { btnPrimary, btnSecondary, card, input, label } from "./ui";

type Row = { fee: number; freeFrom: number; etaDays: number; active: boolean };

function summary(r: Row) {
  if (r.fee === 0) return "Envío gratis siempre";
  return `${money(r.fee)} · gratis desde ${money(r.freeFrom)}`;
}

/** Fila editable de una tarifa de envío. */
export function ZoneRow({ zone }: { zone: AdminZone }) {
  const router = useRouter();
  const [r, setR] = useState<Row>({ fee: zone.fee, freeFrom: zone.freeFrom, etaDays: zone.etaDays, active: zone.active });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = r.fee !== zone.fee || r.freeFrom !== zone.freeFrom || r.etaDays !== zone.etaDays || r.active !== zone.active;
  const isDefault = zone.code === "nacional";
  const title = isDefault ? "Resto del país" : zone.city ?? zone.name;
  const sub = isDefault ? "Todas las ciudades sin tarifa propia" : zone.code === "bogota" ? "Tarifa obligatoria" : "Tarifa propia de esta ciudad";

  async function save() {
    setBusy(true);
    const res = await saveZone({ code: zone.code, city: zone.city, ...r });
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: "✓ Guardado" } : { ok: false, text: res.error });
    if (res.ok) router.refresh();
  }
  async function remove() {
    if (!window.confirm(`¿Quitar la tarifa propia de ${title}? Esa ciudad pasará a usar la tarifa de "Resto del país".`)) return;
    setBusy(true);
    const res = await deleteZone(zone.code);
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: res.error });
    router.refresh();
  }

  return (
    <article className={`${card} p-5 ${r.active ? "" : "opacity-70"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 font-display text-[19px] font-extrabold">{title}</h2>
          <div className="mt-0.5 text-[12.5px] text-tinta/55">
            {sub} · {zone.orders} {zone.orders === 1 ? "pedido" : "pedidos"}
          </div>
        </div>
        <div className="rounded-full bg-crema px-3 py-1 text-[12.5px] font-semibold text-vino">{summary(r)}</div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_140px]">
        <div>
          <span className={label}>Valor del envío</span>
          <MoneyInput value={r.fee} onChange={(n) => setR({ ...r, fee: n })} />
        </div>
        <div>
          <span className={label}>Gratis desde (compra)</span>
          <MoneyInput value={r.freeFrom} onChange={(n) => setR({ ...r, freeFrom: n })} />
        </div>
        <div>
          <span className={label}>Días de entrega</span>
          <input type="number" min={0} max={60} className={input} value={r.etaDays} onChange={(e) => setR({ ...r, etaDays: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={!dirty || busy} className={btnPrimary}>
          {busy ? "Guardando…" : "Guardar"}
        </button>
        {!isDefault && zone.code !== "bogota" && (
          <>
            <button type="button" onClick={() => setR({ ...r, active: !r.active })} className={btnSecondary}>
              {r.active ? "Pausar" : "Activar"}
            </button>
            <button type="button" onClick={remove} disabled={busy} className="text-[13px] font-semibold text-vino">
              Quitar ciudad
            </button>
          </>
        )}
        {msg && <span role={msg.ok ? "status" : "alert"} className={`text-[13px] font-medium ${msg.ok ? "text-[#2F7D4F]" : "text-[#B42318]"}`}>{msg.text}</span>}
      </div>
    </article>
  );
}

/** Agregar una tarifa propia para una ciudad. */
export function NewZone({ taken }: { taken: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dep, setDep] = useState("");
  const [city, setCity] = useState("");
  const [r, setR] = useState<Row>({ fee: 15000, freeFrom: 150000, etaDays: 3, active: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={btnPrimary}>
        ＋ Tarifa para otra ciudad
      </button>
    );
  }
  const cities = dep ? COLOMBIA[dep].filter((c) => !taken.includes(c)) : [];

  async function create() {
    setBusy(true);
    setError(null);
    const res = await saveZone({ code: null, city, ...r });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setOpen(false);
    setDep("");
    setCity("");
    router.refresh();
  }

  return (
    <article className={`${card} p-5`}>
      <h2 className="m-0 font-display text-[19px] font-extrabold">Nueva tarifa por ciudad</h2>
      <p className="m-0 mt-1 text-[13px] text-tinta/55">Elige la ciudad; el resto del país seguirá con la tarifa general.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="z-dep">Departamento</label>
          <select id="z-dep" className={input} value={dep} onChange={(e) => { setDep(e.target.value); setCity(""); }}>
            <option value="">Elige…</option>
            {Object.keys(COLOMBIA).map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="z-city">Ciudad o municipio</label>
          <select id="z-city" className={input} value={city} disabled={!dep} onChange={(e) => setCity(e.target.value)}>
            <option value="">{dep ? "Elige…" : "Primero el departamento"}</option>
            {cities.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_140px]">
        <div>
          <span className={label}>Valor del envío</span>
          <MoneyInput value={r.fee} onChange={(n) => setR({ ...r, fee: n })} />
        </div>
        <div>
          <span className={label}>Gratis desde (compra)</span>
          <MoneyInput value={r.freeFrom} onChange={(n) => setR({ ...r, freeFrom: n })} />
        </div>
        <div>
          <span className={label}>Días de entrega</span>
          <input type="number" min={0} max={60} className={input} value={r.etaDays} onChange={(e) => setR({ ...r, etaDays: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
        </div>
      </div>
      {error && <p role="alert" className="m-0 mt-3 text-[13px] font-medium text-[#B42318]">{error}</p>}
      <div className="mt-4 flex gap-3">
        <button type="button" onClick={create} disabled={!city || busy} className={btnPrimary}>
          {busy ? "Guardando…" : "Agregar tarifa"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={btnSecondary}>Cancelar</button>
      </div>
    </article>
  );
}
