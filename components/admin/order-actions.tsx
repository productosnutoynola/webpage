"use client";

import { useActionState } from "react";
import { updateOrderStatus, type StatusState } from "@/app/admin/actions";

const btn =
  "rounded-lg border-2 border-tinta px-3.5 py-2 text-[13px] font-semibold shadow-[2px_2px_0_var(--color-tinta)] transition-transform hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_var(--color-tinta)] disabled:opacity-50";

export function OrderActions({ reference, status }: { reference: string; status: string }) {
  const [state, action, pending] = useActionState<StatusState, FormData>(updateOrderStatus, { error: null, ok: false });

  if (status !== "paid" && status !== "preparing" && status !== "shipped") return null;
  const toShipped = status !== "shipped";

  return (
    <form
      action={action}
      onSubmit={(e) => {
        const msg = toShipped
          ? `¿Marcar el pedido ${reference} como enviado?`
          : `¿Confirmar que el cliente recibió el pedido ${reference}?`;
        if (!window.confirm(msg)) e.preventDefault();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="status" value={toShipped ? "shipped" : "delivered"} />
      {toShipped && (
        <input
          name="tracking"
          placeholder="Guía (opcional)"
          aria-label={`Número de guía del pedido ${reference}`}
          maxLength={80}
          className="w-[150px] rounded-lg border-2 border-tinta/20 bg-white px-3 py-2 text-[13px] outline-none focus:border-vino"
        />
      )}
      <button type="submit" disabled={pending} className={`${btn} ${toShipped ? "bg-mostaza text-tinta" : "bg-ciruela text-crema"}`}>
        {pending ? "Guardando…" : toShipped ? "Marcar enviado" : "Marcar entregado"}
      </button>
      {state.error && <span role="alert" className="text-[12px] font-medium text-vino">{state.error}</span>}
    </form>
  );
}
