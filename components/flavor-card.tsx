"use client";

import Link from "next/link";
import Image from "next/image";
import { PRICE, type Flavor } from "@/lib/catalog";
import { money } from "@/lib/pricing";
import { useCart } from "./cart-context";
import { BagLabel } from "./bag-label";

export function FlavorCard({ f }: { f: Flavor }) {
  const { addFlavor } = useCart();
  return (
    <article
      className="flex flex-col overflow-hidden rounded-[22px] border-[2.5px] border-tinta bg-crema transition-[transform,box-shadow] duration-150 shadow-[6px_6px_0_var(--sh)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_var(--sh)]"
      style={{ ["--sh" as string]: f.color }}
    >
      <Link
        href={`/producto/${f.key}`}
        className="relative block aspect-square w-full overflow-hidden border-b-[2.5px] border-tinta"
        style={{ background: f.photoBg }}
        aria-label={`Ver ${f.name}`}
      >
        <Image
          src={f.img}
          alt={`Bolsa de granola ${f.name}`}
          fill
          sizes="(max-width: 900px) 100vw, 400px"
          className="block object-cover"
          style={{ objectPosition: f.objectPosition, mixBlendMode: f.blend ? "multiply" : undefined }}
        />
        <BagLabel f={f} />
        {f.badge && (
          <span className="absolute left-[13px] top-[13px] rounded-full border-2 border-tinta bg-ciruela px-[11px] py-[5px] font-mono text-[10px] font-medium uppercase tracking-[.11em] text-rosa">
            {f.badge}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <div className="flex items-center gap-2">
          <span className="size-2.5 flex-none rounded-full border-[1.5px] border-tinta" style={{ background: f.color }} />
          <h3 className="m-0 font-display text-[22px] font-extrabold leading-[1.1]">{f.name}</h3>
        </div>
        <p className="m-0 font-mono text-[11.5px] leading-[1.55] text-vino">{f.ingredients}</p>
        <p className="m-0 flex-1 text-sm leading-normal text-tinta/68">{f.short}</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="font-display text-xl font-extrabold">{money(PRICE)}</span>
          <button
            onClick={() => addFlavor(f.key)}
            className="btn-primary px-[18px] py-2.5 text-[13.5px] shadow-[3px_3px_0_var(--color-tinta)]"
          >
            Agregar
          </button>
        </div>
      </div>
    </article>
  );
}
