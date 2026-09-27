"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isBogota, lineName, lineUnitPrice, money } from "@/lib/pricing";
import { loadSnapshot, type OrderSnapshot } from "@/lib/order-snapshot";
import { useCart } from "@/components/cart-context";

type Tx = { id: string; status: string; reference: string; amountInCents: number; paymentMethodType: string | null };

const METHOD: Record<string, string> = {
  CARD: "Tarjeta",
  PSE: "PSE",
  NEQUI: "Nequi",
  BANCOLOMBIA_TRANSFER: "Botón Bancolombia",
  BANCOLOMBIA_QR: "QR Bancolombia",
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export default function PedidoPage() {
  return (
    <Suspense>
      <Pedido />
    </Suspense>
  );
}

function Pedido() {
  const id = useSearchParams().get("id");
  const { clear } = useCart();
  const [tx, setTx] = useState<Tx | null>(null);
  const [failed, setFailed] = useState(false);
  const [snap, setSnap] = useState<OrderSnapshot | null>(null);

  useEffect(() => setSnap(loadSnapshot()), []);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    let tries = 0;
    const poll = async () => {
      try {
        const res = await fetch(`/api/wompi/transaction?id=${encodeURIComponent(id)}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as Tx;
        if (!alive) return;
        setTx(data);
        if (data.status === "PENDING" && ++tries < 20) setTimeout(poll, 4000);
      } catch {
        if (alive) setFailed(true);
      }
    };
    poll();
    return () => {
      alive = false;
    };
  }, [id]);

  const approved = tx?.status === "APPROVED";
  useEffect(() => {
    if (approved) clear();
  }, [approved, clear]);

  if (!id || failed) {
    return (
      <Shell icon="?" title="No encontramos tu pago">
        <p className="m-0 mt-3.5 text-[17px] leading-[1.6] text-tinta/70">
          Si pagaste y no ves la confirmación, escríbenos con tu número de pedido y lo revisamos.
        </p>
        <Link href="/#contacto" className="btn-primary press mt-[30px] px-7 py-[15px] text-[15.5px] hover:text-crema">Contactarnos</Link>
      </Shell>
    );
  }

  if (!tx || tx.status === "PENDING") {
    return (
      <Shell icon={<span className="block size-9 animate-spin-fast rounded-full border-4 border-ciruela/25 border-t-ciruela" />} title="Confirmando tu pago…">
        <p className="m-0 mt-3.5 text-[17px] leading-[1.6] text-tinta/70">
          Estamos esperando la respuesta del banco. Esto puede tardar unos segundos (PSE a veces un poco más).
        </p>
      </Shell>
    );
  }

  if (!approved) {
    return (
      <Shell icon="✕" title="Tu pago no se completó">
        <p className="m-0 mt-3.5 text-[17px] leading-[1.6] text-tinta/70">
          {tx.status === "DECLINED" ? "El banco rechazó la transacción." : "Hubo un problema con la transacción."} Tu carrito sigue
          intacto: puedes intentar de nuevo con otro medio de pago.
        </p>
        <Link href="/checkout" className="btn-vino press mt-[30px] px-7 py-[15px] text-[15.5px] hover:text-crema">Intentar de nuevo</Link>
      </Shell>
    );
  }

  const order = snap && snap.reference === tx.reference ? snap : null;
  const eta = new Date((order?.createdAt ?? Date.now()) + (order?.etaDays ?? (order && !isBogota(order.city) ? 4 : 2)) * 86400000);
  const method = tx.paymentMethodType ? METHOD[tx.paymentMethodType] ?? tx.paymentMethodType : "Wompi";

  return (
    <Shell icon="✳" title="¡Pedido confirmado!">
      <p className="m-0 mt-3.5 text-[17px] leading-[1.6] text-tinta/70">
        Gracias{order ? ` ${order.nombre}` : ""}. Te enviamos la confirmación{order ? <> a <strong>{order.correo}</strong></> : ""} y te
        escribimos por WhatsApp cuando el mensajero salga.
      </p>
      <div className="mt-8 rounded-[22px] border-[3px] border-tinta bg-crema p-[26px] text-left shadow-[8px_8px_0_var(--color-rosa)]">
        <div className="flex flex-wrap justify-between gap-3 border-b-2 border-dashed border-tinta/20 pb-4">
          <div>
            <div className="font-mono text-[10.5px] uppercase tracking-[.14em] text-tinta/50">Número de pedido</div>
            <div className="mt-[3px] font-display text-[21px] font-extrabold">{tx.reference}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10.5px] uppercase tracking-[.14em] text-tinta/50">Entrega estimada</div>
            <div className="mt-[3px] font-display text-[21px] font-extrabold">{eta.getDate()} {MESES[eta.getMonth()]}</div>
          </div>
        </div>
        {order && (
          <>
            <div className="flex flex-col gap-[11px] border-b-2 border-dashed border-tinta/20 py-4">
              {order.lines.map((l, i) => (
                <div key={i} className="flex justify-between gap-3 text-[14.5px]">
                  <span>{l.qty} × {lineName(l)}</span>
                  <span className="font-mono">{money(lineUnitPrice(l) * l.qty)}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-[9px] border-b-2 border-dashed border-tinta/20 py-4 text-sm">
              <div className="flex justify-between text-tinta/70"><span>Subtotal</span><span className="font-mono">{money(order.totals.gross)}</span></div>
              {order.totals.discount > 0 && (
                <div className="flex justify-between text-vino"><span>Descuento packs</span><span className="font-mono">−{money(order.totals.discount)}</span></div>
              )}
              <div className="flex justify-between text-tinta/70">
                <span>Envío · {order.city}</span>
                <span className="font-mono">{order.totals.shipping === 0 ? "Gratis" : money(order.totals.shipping)}</span>
              </div>
            </div>
          </>
        )}
        <div className="flex items-baseline justify-between pt-4">
          <span className="font-display text-base font-bold">Total pagado</span>
          <span className="font-display text-[26px] font-extrabold text-vino">{money(tx.amountInCents / 100)}</span>
        </div>
        <div className="mt-3.5 font-mono text-[12.5px] leading-[1.6] text-tinta/55">
          {method}
          {order ? ` · Enviamos a ${order.direccion}, ${order.city}` : ""}
        </div>
      </div>
      <Link href="/" className="btn-primary press mt-[30px] px-7 py-[15px] text-[15.5px] hover:text-crema">Volver al inicio</Link>
    </Shell>
  );
}

function Shell({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-[720px] px-[22px] pb-[90px] pt-[60px] text-center">
      <div className="inline-flex size-[72px] items-center justify-center rounded-full border-[3px] border-tinta bg-mostaza font-display text-[34px] font-extrabold text-ciruela shadow-[5px_5px_0_var(--color-tinta)]">
        {icon}
      </div>
      <h1 className="m-0 mt-[26px] font-display text-[clamp(32px,4.6vw,52px)] font-extrabold leading-none tracking-[-.04em] text-vino">{title}</h1>
      {children}
    </main>
  );
}
