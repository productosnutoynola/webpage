"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCart } from "./cart-context";

const KEY = "nyn-welcome-v1";
// No interrumpir el pago ni el regreso desde Wompi.
const SKIP = ["/checkout", "/pedido"];

/** Portada de bienvenida: se muestra una vez por visita al entrar a la tienda. */
export function WelcomeSplash() {
  const path = usePathname();
  const { catalog } = useCart();
  const [state, setState] = useState<"hidden" | "open" | "closing">("hidden");
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (SKIP.some((p) => path.startsWith(p))) return;
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
    } catch {}
    setState("open");
    // Solo al entrar: no reaparece al navegar dentro del sitio.
  }, []);

  useEffect(() => {
    if (state !== "open") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Foco en la tarjeta (sin anillo); con Tab se llega al botón.
    card.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [state]);

  function close() {
    setState("closing");
    setTimeout(() => setState("hidden"), 380);
  }

  if (state === "hidden") return null;
  const closing = state === "closing";
  const flavors = catalog.flavors.slice(0, 4);

  return (
    <div
      className={`fixed inset-0 z-[80] flex items-center justify-center p-4 transition-opacity duration-[380ms] ${closing ? "opacity-0" : "animate-fade-in"}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div onClick={close} className="absolute inset-0 bg-tinta/60 backdrop-blur-md" />

      <div
        ref={card}
        tabIndex={-1}
        className={`relative w-full max-w-[580px] outline-none overflow-hidden rounded-[32px] border-[3px] border-tinta bg-ciruela px-6 pb-8 pt-10 text-center shadow-[10px_10px_0_var(--color-mostaza)] transition-transform duration-[380ms] sm:px-12 sm:pb-11 sm:pt-12 ${
          closing ? "translate-y-4 scale-95" : "animate-splash-in"
        }`}
      >
        {/* Marca de agua dentro de la tarjeta */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none overflow-hidden">
          <div className="absolute left-1/2 top-1/2 flex w-[260%] -translate-x-1/2 -translate-y-1/2 -rotate-[9deg] flex-col gap-7">
            {Array.from({ length: 14 }, (_, r) => (
              <div key={r} className="flex justify-center gap-10 whitespace-nowrap font-display text-[15px] font-bold tracking-[.04em] text-rosa/[.07]" style={{ transform: r % 2 ? "translateX(70px)" : undefined }}>
                {Array.from({ length: 8 }, (_, i) => (
                  <span key={i}>nuto &amp; nola</span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Brillos decorativos */}
        <span aria-hidden="true" className="absolute left-6 top-6 text-2xl text-mostaza/80">✳</span>
        <span aria-hidden="true" className="absolute bottom-24 right-7 text-xl text-rosa/70">✳</span>
        <span aria-hidden="true" className="absolute right-12 top-14 size-3 rounded-full bg-rosa/70" />
        <span aria-hidden="true" className="absolute bottom-16 left-10 size-2.5 rounded-full bg-mostaza/80" />

        <div className="relative">
          <div className="mx-auto w-fit animate-float">
            <Image
              src="/img/logo.png"
              alt="Nuto & Nola"
              width={112}
              height={112}
              priority
              className="size-[96px] rounded-[22px] border-[3px] border-tinta shadow-[5px_5px_0_var(--color-rosa)] sm:size-[112px]"
            />
          </div>

          <div className="mt-6 font-mono text-[11px] uppercase tracking-[.22em] text-mostaza">Nuto &amp; Nola · granola de verdad</div>

          <h2 id="welcome-title" className="m-0 mt-4 text-balance font-display text-[clamp(28px,6.4vw,42px)] font-extrabold leading-[1.04] tracking-[-.035em] text-crema">
            Bienvenido y bienvenida a un mundo de{" "}
            <span className="relative whitespace-nowrap text-mostaza">
              productos deliciosos
              <svg aria-hidden="true" viewBox="0 0 300 14" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-rosa">
                <path d="M3 10 C 70 2, 150 2, 297 8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </span>
          </h2>

          {flavors.length > 0 && (
            <ul className="m-0 mt-8 flex list-none flex-wrap justify-center gap-2 p-0" aria-label="Sabores">
              {flavors.map((f, i) => (
                <li
                  key={f.key}
                  className="rounded-full border-2 border-tinta px-3.5 py-1.5 font-display text-[13.5px] font-bold shadow-[2px_2px_0_var(--color-tinta)]"
                  style={{ background: f.color === "#5F1637" ? "#8B2150" : f.color, color: f.color === "#5F1637" ? "#EFB0CB" : f.ink, transform: `rotate(${[-3, 2, -1.5, 3][i % 4]}deg)` }}
                >
                  {f.name}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={close}
            className="group mt-9 inline-flex items-center gap-3 rounded-full border-[2.5px] border-tinta bg-mostaza px-9 py-4 font-display text-[18px] font-extrabold text-tinta shadow-[5px_5px_0_var(--color-tinta)] transition-[transform,box-shadow] duration-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_var(--color-tinta)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rosa/70 active:translate-x-[5px] active:translate-y-[5px] active:shadow-none"
          >
            Descubrir
            <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
