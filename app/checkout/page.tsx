"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CITIES } from "@/lib/catalog";
import { EMPTY_FORM, validateCustomer, type CustomerForm } from "@/lib/customer";
import { saveSnapshot } from "@/lib/order-snapshot";
import { computeTotals, lineId, lineImage, lineName, lineUnitPrice, money, type CartLine, type Totals } from "@/lib/pricing";
import { useCart } from "@/components/cart-context";

const FORM_KEY = "nyn-checkout-form";

export default function CheckoutPage() {
  const { lines, hydrated } = useCart();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM);
  const [err, setErr] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(FORM_KEY);
      if (raw) setForm({ ...EMPTY_FORM, ...JSON.parse(raw) });
    } catch {}
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(FORM_KEY, JSON.stringify(form));
    } catch {}
  }, [form]);

  const t = computeTotals(lines, form.ciudad);
  const set = (k: keyof CustomerForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const toStep2 = () => {
    const missing = validateCustomer(form);
    if (missing.length) return setErr(`Nos falta ${missing.join(", ")}.`);
    setErr(null);
    setStep(2);
    window.scrollTo(0, 0);
  };

  const pay = async () => {
    setErr(null);
    setRedirecting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines, customer: form }),
      });
      const data = (await res.json()) as { url?: string; reference?: string; lines?: CartLine[]; totals?: Totals; city?: string; etaDays?: number; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "No pudimos iniciar el pago.");
      saveSnapshot({
        reference: data.reference!,
        lines: data.lines!,
        totals: data.totals!,
        city: data.city!,
        nombre: form.nombre.split(" ")[0] || form.nombre,
        correo: form.correo,
        direccion: form.direccion,
        etaDays: data.etaDays ?? 2,
        createdAt: Date.now(),
      });
      window.location.assign(data.url);
    } catch (e) {
      setRedirecting(false);
      setErr(e instanceof Error ? e.message : "No pudimos iniciar el pago.");
    }
  };

  if (hydrated && lines.length === 0 && !redirecting) {
    return (
      <main className="mx-auto max-w-[720px] px-[22px] pb-[90px] pt-[60px] text-center">
        <h1 className="m-0 font-display text-[clamp(28px,3.6vw,40px)] font-extrabold tracking-[-.035em]">Tu carrito está vacío</h1>
        <p className="mt-3 text-tinta/60">Tres sabores esperando. Empieza por el Cinnamon Roll, nunca falla.</p>
        <Link href="/#tienda" className="btn-vino press mt-6 px-6 py-3.5 text-[15px] hover:text-crema">Ver la tienda →</Link>
      </main>
    );
  }

  const stepCls = (on: boolean) => `font-mono text-[13px] font-extrabold tracking-[.06em] ${on ? "text-vino" : "text-tinta/35"}`;

  return (
    <main className="mx-auto max-w-[1240px] px-[22px] pb-[72px] pt-9">
      <Link href="/#tienda" className="mb-5 inline-block text-[13.5px] font-medium text-vino">← Seguir comprando</Link>
      <div className="mb-7 flex flex-wrap items-center gap-2.5">
        <span className={stepCls(true)}>01 DATOS</span>
        <span className="h-0.5 w-[30px] bg-tinta opacity-30" />
        <span className={stepCls(step === 2)}>02 PAGO</span>
        <span className="h-0.5 w-[30px] bg-tinta opacity-30" />
        <span className={stepCls(false)}>03 LISTO</span>
      </div>

      <div className="flex flex-wrap items-start gap-[30px]">
        <div className="min-w-0 flex-[1_1_400px]">
          {step === 1 ? (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                toStep2();
              }}
            >
              <h1 className="m-0 mb-1.5 font-display text-[clamp(28px,3.6vw,40px)] font-extrabold leading-none tracking-[-.035em]">¿A dónde la enviamos?</h1>
              <p className="m-0 mb-6 text-[14.5px] text-tinta/60">Todos los campos con * son obligatorios.</p>
              {err && <ErrorBox msg={err} />}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                <Field label="Nombre completo *"><input autoComplete="name" value={form.nombre} onChange={set("nombre")} placeholder="María Rodríguez" className="field" /></Field>
                <Field label="Cédula / NIT"><input inputMode="numeric" value={form.cedula} onChange={set("cedula")} placeholder="1.020.304.050" className="field" /></Field>
                <Field label="Correo electrónico *"><input type="email" autoComplete="email" value={form.correo} onChange={set("correo")} placeholder="maria@correo.com" className="field" /></Field>
                <Field label="Celular *"><input type="tel" autoComplete="tel-national" value={form.celular} onChange={set("celular")} placeholder="300 000 0000" className="field" /></Field>
              </div>
              <div className="my-6 h-px bg-tinta/15" />
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                <Field label="Ciudad *">
                  <select value={form.ciudad} onChange={set("ciudad")} className="field">
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Barrio"><input value={form.barrio} onChange={set("barrio")} placeholder="Chapinero Alto" className="field" /></Field>
                {form.ciudad === "Otra ciudad" && (
                  <>
                    <Field label="Ciudad o municipio *"><input autoComplete="address-level2" value={form.otraCiudad} onChange={set("otraCiudad")} placeholder="Chía" className="field" /></Field>
                    <Field label="Departamento *"><input autoComplete="address-level1" value={form.departamento} onChange={set("departamento")} placeholder="Cundinamarca" className="field" /></Field>
                  </>
                )}
              </div>
              <Field label="Dirección de entrega *" className="mt-4"><input autoComplete="street-address" value={form.direccion} onChange={set("direccion")} placeholder="Cra 7 # 45-32, apto 402" className="field" /></Field>
              <Field label="Indicaciones para el mensajero" className="mt-4">
                <textarea rows={3} value={form.notas} onChange={set("notas")} placeholder="Dejar en portería, torre 2. Timbre no funciona." className="field resize-y" />
              </Field>
              <button type="submit" className="btn-vino press mt-6 w-full p-4 text-base">Continuar al pago →</button>
            </form>
          ) : (
            <div>
              <h1 className="m-0 mb-1.5 font-display text-[clamp(28px,3.6vw,40px)] font-extrabold leading-none tracking-[-.035em]">Pasarela de pago</h1>
              <p className="m-0 mb-1.5 text-[14.5px] text-tinta/60">Pagas en la pasarela segura de Wompi (Bancolombia). Nosotros nunca vemos los datos de tu tarjeta.</p>
              <div className="mb-[22px] font-mono text-[12.5px] text-tinta/50">
                Entrega en: {form.direccion} · {form.ciudad === "Otra ciudad" ? form.otraCiudad : form.ciudad}
              </div>
              {err && <ErrorBox msg={err} />}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
                {[
                  ["Tarjeta", "Visa · MC · Amex"],
                  ["PSE", "Débito bancario"],
                  ["Nequi", "Desde tu app"],
                  ["Bancolombia", "Botón o QR"],
                ].map(([t, d]) => (
                  <div key={t} className="rounded-[14px] border-[2.5px] border-tinta bg-crema p-4 shadow-[4px_4px_0_var(--color-tinta)]">
                    <div className="font-display text-base font-extrabold text-tinta">{t}</div>
                    <div className="mt-[3px] font-mono text-xs text-tinta/60">{d}</div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[13px] text-tinta/60">Eliges el medio de pago en el siguiente paso.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => { setStep(1); setErr(null); }} className="btn px-[22px] py-4 text-[15px] text-tinta hover:bg-rosa">← Volver</button>
                <button onClick={pay} disabled={redirecting} className="btn-vino press flex-[1_1_220px] p-4 text-base disabled:opacity-70">
                  Pagar {money(t.total)}
                </button>
              </div>
              <div className="mt-4 flex items-center gap-2 font-mono text-xs text-tinta/50">
                <span className="size-2 rounded-full bg-ciruela" />
                Conexión cifrada · Pago procesado por Wompi
              </div>
            </div>
          )}
        </div>

        <OrderAside lines={lines} t={t} city={form.ciudad === "Otra ciudad" ? form.otraCiudad || "Otra ciudad" : form.ciudad} />
      </div>

      {redirecting && (
        <div className="fixed inset-0 z-80 flex flex-col items-center justify-center gap-[22px] bg-tinta/90 p-[30px] text-center">
          <div className="size-14 animate-spin-fast rounded-full border-[5px] border-rosa/30 border-t-mostaza" />
          <div className="font-display text-2xl font-extrabold text-crema">Llevándote a la pasarela…</div>
          <div className="max-w-[34ch] font-mono text-[13.5px] leading-[1.6] text-rosa/80">Te redirigimos a Wompi para completar el pago. No cierres esta ventana.</div>
        </div>
      )}
    </main>
  );
}

function OrderAside({ lines, t, city }: { lines: CartLine[]; t: Totals; city: string }) {
  return (
    <aside className="sticky top-[132px] max-w-[400px] flex-[1_1_300px] rounded-[22px] border-[3px] border-tinta bg-ciruela p-6 shadow-[8px_8px_0_var(--color-mostaza)]">
      <div className="font-mono text-[10.5px] uppercase tracking-[.16em] text-rosa">Tu pedido</div>
      <div className="mb-[18px] mt-4 flex flex-col gap-3">
        {lines.map((l) => (
          <div key={lineId(l)} className="flex items-center gap-3">
            <div className="size-[46px] flex-none overflow-hidden rounded-[10px] border-2 border-tinta bg-kraft bg-cover bg-center" style={{ backgroundImage: `url(${lineImage(l)})` }} />
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm font-bold text-crema">{lineName(l)}</div>
              <div className="font-mono text-[11.5px] text-rosa/80">{l.qty} × {money(lineUnitPrice(l))}</div>
            </div>
            <div className="flex-none font-mono text-[13.5px] font-semibold text-mostaza">{money(lineUnitPrice(l) * l.qty)}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-[9px] border-y-2 border-dashed border-rosa/35 py-[18px]">
        <div className="flex justify-between text-sm text-crema/85"><span>Subtotal</span><span>{money(t.gross)}</span></div>
        {t.discount > 0 && <div className="flex justify-between text-sm text-rosa"><span>Descuento packs</span><span>−{money(t.discount)}</span></div>}
        <div className="flex justify-between text-sm text-crema/85"><span>Envío · {city}</span><span>{t.shipping === 0 ? "Gratis" : money(t.shipping)}</span></div>
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <span className="font-display text-[15px] font-bold text-crema">Total</span>
        <span className="font-display text-[30px] font-extrabold text-mostaza">{money(t.total)}</span>
      </div>
      <div className="mt-1 text-right font-mono text-[11px] text-rosa/70">IVA incluido</div>
    </aside>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div role="alert" className="mb-5 rounded-[14px] border-[2.5px] border-tinta bg-vino px-4 py-3.5 text-[13.5px] font-medium leading-normal text-crema">
      {msg}
    </div>
  );
}
