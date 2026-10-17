import Image from "next/image";
import Link from "next/link";
import { listProducts, type AdminProduct } from "@/lib/admin-store";
import { money } from "@/lib/pricing";
import { LoadError, Page, PageHeader, StatusPill, btnPrimary, card } from "@/components/admin/ui";
import { ProductRowActions } from "@/components/admin/product-row-actions";

export const dynamic = "force-dynamic";

export default async function Productos({ searchParams }: { searchParams: Promise<{ creado?: string }> }) {
  const { creado } = await searchParams;
  let products: AdminProduct[];
  try {
    products = await listProducts();
  } catch (e) {
    return <Page><LoadError error={e} /></Page>;
  }
  const justCreated = products.find((p) => p.slug === creado);

  return (
    <Page>
      <PageHeader
        eyebrow="Configuración de la tienda"
        title="Productos"
        intro="Todo lo que ves aquí es lo que aparece en la tienda. Edita precios, fotos y textos, cambia el orden o esconde un producto sin borrarlo."
        action={
          <Link href="/admin/tienda/productos/nuevo" className={btnPrimary}>
            ＋ Agregar producto nuevo
          </Link>
        }
      />

      {justCreated && (
        <div role="status" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[#2F7D4F]/40 bg-[#2F7D4F]/10 px-5 py-4">
          <div className="text-[14.5px] font-semibold text-[#2F7D4F]">
            ✓ {justCreated.name} quedó {justCreated.active ? "publicado en la tienda" : "guardado como borrador (oculto)"}.
          </div>
          {justCreated.active && (
            <a href={`/producto/${justCreated.slug}`} target="_blank" rel="noopener" className="text-[13.5px] font-semibold text-vino">
              Verlo en la tienda ↗
            </a>
          )}
        </div>
      )}

      <div className="mt-7 flex flex-col gap-3">
        {products.map((p, i) => {
          const available = p.stock.onHand - p.stock.reserved;
          const low = available <= p.stock.threshold;
          return (
            <article key={p.slug} className={`${card} flex flex-wrap items-center gap-4 p-4 ${p.active ? "" : "opacity-75"}`}>
              <div className="relative size-[76px] flex-none overflow-hidden rounded-xl border-2 border-tinta" style={{ background: p.photoBg }}>
                {p.img && <Image src={p.img} alt="" fill sizes="76px" className="object-cover" style={{ objectPosition: p.objectPosition }} />}
              </div>
              <div className="min-w-[200px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="size-2.5 rounded-full border-[1.5px] border-tinta" style={{ background: p.color }} />
                  <h2 className="m-0 font-display text-[19px] font-extrabold">{p.name}</h2>
                  <StatusPill on={p.active} />
                  {p.badge && <span className="rounded-full bg-ciruela px-2 py-0.5 font-mono text-[10px] uppercase tracking-[.1em] text-rosa">{p.badge}</span>}
                </div>
                <div className="mt-1 text-[13px] text-tinta/60">
                  {p.category} · {money(p.price)} ·{" "}
                  <span className={low ? "font-semibold text-[#B42318]" : ""}>
                    {available} {available === 1 ? "bolsa disponible" : "bolsas disponibles"}
                  </span>
                  {!p.packEligible && " · fuera de packs"}
                </div>
              </div>
              <ProductRowActions slug={p.slug} active={p.active} first={i === 0} last={i === products.length - 1} />
            </article>
          );
        })}
        {products.length === 0 && <p className="text-tinta/60">Aún no hay productos. Crea el primero.</p>}
      </div>
    </Page>
  );
}
