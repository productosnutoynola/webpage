"use client";

import Link from "next/link";
import Image from "next/image";
import { money } from "@/lib/pricing";
import { SHIPPING } from "@/lib/catalog";
import { useCart } from "./cart-context";

const NAV = [
  { href: "/#inicio", label: "Inicio" },
  { href: "/#tienda", label: "Tienda" },
  { href: "/#nosotros", label: "Nosotros" },
  { href: "/#contacto", label: "Contacto" },
];

export function SiteHeader() {
  const { lines, setCartOpen } = useCart();
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const msg = `Envíos gratis desde ${money(SHIPPING.bogota.freeFrom)}`;

  return (
    <div className="sticky top-0 z-50">
      <div className="overflow-hidden border-b-2 border-tinta bg-ciruela py-[11px]" aria-label={msg}>
        <div className="flex w-max animate-marquee items-center will-change-transform" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <span
              key={i}
              className="flex items-center gap-[18px] whitespace-nowrap pr-[18px] font-mono text-xs font-medium uppercase tracking-[.12em] text-rosa"
            >
              {msg}
              <span className="text-mostaza">✳</span>
            </span>
          ))}
        </div>
      </div>

      <header className="border-b-2 border-tinta bg-crema/96 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center gap-[18px] px-[22px] py-3">
          <Link href="/#inicio" className="flex items-center gap-2.5 text-left">
            <Image
              src="/img/logo.png"
              alt=""
              width={46}
              height={46}
              priority
              className="block size-[46px] flex-none rounded-[11px] border-2 border-tinta object-cover"
            />
            <span className="flex flex-col gap-1 leading-none">
              <span className="whitespace-nowrap font-display text-[19px] font-extrabold leading-none tracking-[-.025em] text-tinta">
                Nuto &amp; Nola
              </span>
              <span className="whitespace-nowrap font-mono text-[8px] uppercase leading-none tracking-[.18em] text-tinta/55">
                granola de verdad
              </span>
            </span>
          </Link>
          <nav className="ml-auto hidden flex-wrap items-center justify-end gap-0.5 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-lg px-[11px] py-2 text-sm font-medium text-tinta hover:bg-rosa hover:text-tinta"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <button
            onClick={() => setCartOpen(true)}
            className="ml-auto flex flex-none items-center gap-2 rounded-full border-2 border-tinta bg-vino px-[15px] py-[9px] text-[13.5px] font-semibold text-crema shadow-[3px_3px_0_var(--color-tinta)] hover:bg-ciruela md:ml-0"
          >
            <span>Carrito</span>
            <span className="flex h-[21px] min-w-[21px] items-center justify-center rounded-full bg-rosa px-[5px] font-mono text-[11.5px] font-medium text-ciruela">
              {count}
            </span>
          </button>
        </div>
        <nav className="flex justify-center gap-0.5 border-t border-tinta/15 px-3 py-1 md:hidden">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-tinta hover:bg-rosa hover:text-tinta">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
    </div>
  );
}
