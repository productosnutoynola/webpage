"use client";

import { useCart } from "./cart-context";
import { packChip } from "./pack-card";

/** Botón de la portada: agrega el pack destacado desde el panel. */
export function AddPackButton() {
  const { catalog, openPicker } = useCart();
  const p = catalog.packs.find((x) => x.featured);
  if (!p) return null;
  return (
    <button onClick={() => openPicker(p.key)} className="btn press bg-mostaza px-6 py-[15px] text-[15.5px] text-tinta hover:bg-rosa">
      Pack de {p.bags} · {packChip(p)}
    </button>
  );
}
