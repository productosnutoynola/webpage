"use client";

import Link from "next/link";
import { useEffect } from "react";
import { computeTotals, lineId, lineImage, lineMeta, lineName, lineUnitPrice, money } from "@/lib/pricing";
import { useCart } from "./cart-context";

export function CartDrawer() {
  const { lines, cartOpen, setCartOpen, setQty } = useCart();

  useEffect(() => {
    if (!cartOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCartOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cartOpen, setCartOpen]);

  if (!cartOpen) return null;
  const t = computeTotals(lines);
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const falta = t.freeFrom - t.subtotal;

  return (
    <div className="fixed inset-0 z-60 flex justify-end" role="dialog" aria-modal="true" aria-label="Tu carrito">
      <div onClick={() => setCartOpen(false)} className="absolute inset-0 bg-tinta/55 backdrop-blur-[2px]" />
      <div className="relative flex h-full w-full max-w-[430px] animate-up flex-col border-l-[3px] border-tinta bg-crema">
        <div className="flex flex-none items-center justify-between gap-3 border-b-[2.5px] border-tinta px-[22px] py-5">
          <div>
            <div className="font-display text-[21px] font-extrabold">Tu carrito</div>
            <div className="mt-0.5 font-mono text-xs text-tinta/55">{count} producto(s)</div>
          </div>
          <button
            onClick={() => setCartOpen(false)}
            aria-label="Cerrar carrito"
            className="size-[34px] flex-none rounded-full border-2 border-tinta text-base font-semibold text-tinta hover:bg-rosa"
          >
            ✕
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-[30px] py-10 text-center">
            <div className="font-display text-xl font-extrabold">Tu carrito está vacío</div>
            <p className="m-0 max-w-[30ch] text-[14.5px] leading-[1.55] text-tinta/60">
              Tres sabores esperando. Empieza por el Cinnamon Roll, nunca falla.
            </p>
            <Link
              href="/#tienda"
              onClick={() => setCartOpen(false)}
              className="btn-vino px-6 py-3.5 text-[15px] shadow-[4px_4px_0_var(--color-tinta)] hover:text-crema"
            >
              Ver la tienda →
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-[22px] py-5">
              <div className="rounded-[14px] border-[2.5px] border-tinta bg-rosa px-4 py-3.5">
                <div className="text-[13px] font-semibold leading-[1.4] text-ciruela">
                  {t.free ? "¡Listo! Tu envío va gratis 🎉" : `Te faltan ${money(falta)} para envío gratis en Bogotá`}
                </div>
                <div className="mt-2.5 h-2.5 overflow-hidden rounded-full border-2 border-tinta bg-crema">
                  <div
                    className="h-full bg-ciruela transition-[width] duration-300"
                    style={{ width: `${Math.min(100, Math.round((t.subtotal / t.freeFrom) * 100))}%` }}
                  />
                </div>
              </div>
              {lines.map((l) => {
                const id = lineId(l);
                return (
                  <div key={id} className="flex gap-[13px] rounded-2xl border-[2.5px] border-tinta bg-white p-3">
                    <div
                      className="size-16 flex-none overflow-hidden rounded-[10px] border-2 border-tinta bg-kraft bg-cover bg-center"
                      style={{ backgroundImage: `url(${lineImage(l)})` }}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-display text-[15px] font-bold leading-[1.2]">{lineName(l)}</div>
                          <div className="mt-0.5 font-mono text-[11.5px] text-tinta/55">{lineMeta(l)}</div>
                        </div>
                        <button onClick={() => setQty(id, 0)} className="flex-none font-mono text-xs text-vino hover:text-ciruela">
                          Quitar
                        </button>
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-2.5">
                        <div className="flex items-center overflow-hidden rounded-full border-2 border-tinta">
                          <button onClick={() => setQty(id, l.qty - 1)} aria-label="Menos" className="px-[11px] py-[5px] text-sm font-semibold hover:bg-rosa">−</button>
                          <span className="min-w-6 text-center font-mono text-[13px] font-medium">{l.qty}</span>
                          <button onClick={() => setQty(id, l.qty + 1)} aria-label="Más" className="px-[11px] py-[5px] text-sm font-semibold hover:bg-rosa">+</button>
                        </div>
                        <span className="font-display text-[15px] font-bold">{money(lineUnitPrice(l) * l.qty)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex-none border-t-[2.5px] border-tinta bg-crema px-[22px] py-5">
              <div className="flex flex-col gap-2">
                <Row label="Subtotal" value={money(t.gross)} />
                {t.discount > 0 && <Row label="Descuento packs" value={`−${money(t.discount)}`} accent />}
                <Row label="Envío estimado (Bogotá)" value={t.shipping === 0 ? "Gratis" : money(t.shipping)} />
                <div className="mt-1.5 flex items-baseline justify-between border-t-2 border-dashed border-tinta/25 pt-3">
                  <span className="font-display text-base font-bold">Total</span>
                  <span className="font-display text-[25px] font-extrabold text-vino">{money(t.total)}</span>
                </div>
              </div>
              <Link
                href="/checkout"
                onClick={() => setCartOpen(false)}
                className="btn-vino mt-4 w-full p-4 text-base shadow-[4px_4px_0_var(--color-tinta)] hover:text-crema"
              >
                Finalizar compra →
              </Link>
              <button onClick={() => setCartOpen(false)} className="mt-2.5 w-full p-1.5 text-[13.5px] font-medium text-vino">
                Seguir comprando
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${accent ? "text-vino" : "text-tinta/70"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
