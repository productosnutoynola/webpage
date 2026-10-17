"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { moveProduct, setProductActive } from "@/app/admin/(app)/tienda/actions";
import { btnSecondary } from "./ui";

export function ProductRowActions({ slug, active, first, last }: { slug: string; active: boolean; first: boolean; last: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Error");
      router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex overflow-hidden rounded-lg border-2 border-tinta/15">
        <button type="button" aria-label="Subir en el orden de la tienda" disabled={first || pending} onClick={() => act(() => moveProduct(slug, -1))} className="px-2.5 py-1.5 text-[13px] hover:bg-rosa/40 disabled:opacity-30">
          ↑
        </button>
        <button type="button" aria-label="Bajar en el orden de la tienda" disabled={last || pending} onClick={() => act(() => moveProduct(slug, 1))} className="border-l-2 border-tinta/15 px-2.5 py-1.5 text-[13px] hover:bg-rosa/40 disabled:opacity-30">
          ↓
        </button>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (active && !window.confirm("¿Ocultar este producto de la tienda? Podrás publicarlo de nuevo cuando quieras.")) return;
          act(() => setProductActive(slug, !active));
        }}
        className={btnSecondary}
      >
        {active ? "Ocultar" : "Publicar"}
      </button>
      <Link href={`/admin/tienda/productos/${slug}`} className={btnSecondary}>
        Editar
      </Link>
      {error && <span role="alert" className="w-full text-[12.5px] text-[#B42318]">{error}</span>}
    </div>
  );
}
