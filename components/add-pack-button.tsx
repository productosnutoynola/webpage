"use client";

import { useCart } from "./cart-context";

export function AddPackButton() {
  const { addPack } = useCart();
  return (
    <button onClick={() => addPack("trio")} className="btn press bg-mostaza px-6 py-[15px] text-[15.5px] text-tinta hover:bg-rosa">
      Pack de 3 · −15 %
    </button>
  );
}
