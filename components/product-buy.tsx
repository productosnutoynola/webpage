"use client";

import { useState } from "react";
import { MAX_QTY, PRICE, type FlavorKey } from "@/lib/catalog";
import { money } from "@/lib/pricing";
import { useCart } from "./cart-context";

export function ProductBuy({ flavor }: { flavor: FlavorKey }) {
  const { addFlavor } = useCart();
  const [qty, setQty] = useState(1);
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <div className="flex items-center overflow-hidden rounded-full border-[2.5px] border-tinta bg-crema">
        <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Menos" className="px-4 py-3 text-[17px] font-semibold text-tinta hover:bg-rosa">−</button>
        <span className="min-w-[34px] text-center font-mono text-base font-semibold">{qty}</span>
        <button onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))} aria-label="Más" className="px-4 py-3 text-[17px] font-semibold text-tinta hover:bg-rosa">+</button>
      </div>
      <button onClick={() => addFlavor(flavor, qty)} className="btn-vino press flex-[1_1_200px] px-6 py-[15px] text-[15.5px]">
        Agregar al carrito · {money(PRICE * qty)}
      </button>
    </div>
  );
}
