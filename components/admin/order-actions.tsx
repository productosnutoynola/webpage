"use client";

import { useActionState, useState } from "react";
import { resendShipped, updateOrderStatus, type StatusState } from "@/app/admin/actions";
import { CARRIERS, findCarrier } from "@/lib/carriers";

const btn =
  "rounded-lg border-2 border-tinta px-3.5 py-2 text-[13px] font-semibold shadow-[2px_2px_0_var(--color-tinta)] transition-transform hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_var(--color-tinta)] disabled:opacity-50";
const field = "rounded-lg border-2 border-tinta/20 bg-white px-3 py-2 text-[13px] outline-none focus:border-vino";

export function OrderActions({ reference, status, email }: { reference: string; status: string; email?: string }) {
  const [state, action, pending] = useActionState<StatusState, FormData>(updateOrderStatus, { error: null, ok: false });
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");

  if (status !== "paid" && status !== "preparing" && status !== "shipped") return null;
  const toShipped = status !== "shipped";
  const c = findCarrier(carrier);
  const needsGuide = c?.needsTracking ?? true;
  const ready = Boolean(c) && (!needsGuide || tracking.trim().length >= 4);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        const msg = toShipped
          ? `¿Confirmar el envío del pedido ${reference}?\n\nTransportadora: ${carrier}${tracking ? `\nGuía: ${tracking}` : ""}\n\nLe enviaremos al cliente${email ? ` (${email})` : ""} un correo con estos datos y el resumen de su compra.`
          : `¿Confirmar que el cliente recibió el pedido ${reference}?`;
        if (!window.confirm(msg)) e.preventDefault();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="status" value={toShipped ? "shipped" : "delivered"} />
      {toShipped && (
        <>
          <select
            name="carrier"
            required
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            aria-label={`Empresa transportadora del pedido ${reference}`}
            className={`${field} w-[190px]`}
          >
            <option value="">Transportadora…</option>
            {CARRIERS.map((x) => (
              <option key={x.name} value={x.name}>
                {x.name}
              </option>
            ))}
          </select>
          <input
            name="tracking"
            value={tracking}
            onChange={(e) => setTracking(e.target.value.replace(/\s+/g, ""))}
            placeholder={needsGuide ? "Número de guía" : "Guía (opcional)"}
            aria-label={`Número de guía del pedido ${reference}`}
            required={needsGuide}
            maxLength={40}
            className={`${field} w-[160px] font-mono`}
          />
        </>
      )}
      <button type="submit" disabled={pending || (toShipped && !ready)} className={`${btn} ${toShipped ? "bg-mostaza text-tinta" : "bg-ciruela text-crema"}`}>
        {pending ? "Guardando…" : toShipped ? "Confirmar envío y avisar" : "Marcar entregado"}
      </button>
      {state.error && <span role="alert" className="w-full text-[12px] font-medium text-vino">{state.error}</span>}
    </form>
  );
}

/** Estado del correo de envío + reenvío. */
export function ShippedEmailStatus({ reference, sentAt, error }: { reference: string; sentAt: string | null; error: string | null }) {
  const [state, action, pending] = useActionState<StatusState, FormData>(resendShipped, { error: null, ok: false });
  return (
    <form action={action} className="flex flex-wrap items-center gap-2 text-[12px]">
      <input type="hidden" name="reference" value={reference} />
      {state.ok ? (
        <span className="text-[#2F7D4F]">✓ Reenviando correo…</span>
      ) : sentAt ? (
        <span className="text-[#2F7D4F]">✓ Correo de envío enviado</span>
      ) : error ? (
        <span className="text-[#B42318]" title={error}>Correo de envío falló</span>
      ) : (
        <span className="text-tinta/55">Correo de envío en cola…</span>
      )}
      <button disabled={pending} className="font-semibold text-vino underline-offset-2 hover:underline disabled:opacity-50">
        {pending ? "Reenviando…" : "Reenviar"}
      </button>
      {state.error && <span role="alert" className="text-vino">{state.error}</span>}
    </form>
  );
}
