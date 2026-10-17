import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findFlavor } from "@/lib/catalog";
import { getCatalog } from "@/lib/store";
import { money } from "@/lib/pricing";
import { ProductBuy } from "@/components/product-buy";

type Props = { params: Promise<{ sabor: string }> };

export async function generateStaticParams() {
  const { flavors } = await getCatalog();
  return flavors.map((f) => ({ sabor: f.key }));
}
// Productos nuevos creados desde el panel se generan al primer visitante.
export const dynamicParams = true;
export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sabor } = await params;
  const f = findFlavor(await getCatalog(), sabor);
  if (!f) return {};
  return { title: `${f.name} · Nuto & Nola`, description: f.short, openGraph: { images: [f.img] } };
}


export default async function ProductPage({ params }: Props) {
  const { sabor } = await params;
  const f = findFlavor(await getCatalog(), sabor);
  if (!f) notFound();

  return (
    <main className="mx-auto max-w-[1240px] px-[22px] pb-[72px] pt-[30px]">
      <Link href="/#tienda" className="mb-[22px] inline-block text-[13.5px] font-medium text-vino">
        ← Volver a la tienda
      </Link>
      <div className="flex flex-wrap gap-11">
        <div className="min-w-0 flex-[1_1_380px]">
          <div className="relative aspect-square overflow-hidden rounded-3xl border-[3px] border-tinta bg-kraft shadow-[10px_10px_0_var(--color-mostaza)]">
            <Image
              src={f.img}
              alt={`${f.category} ${f.name}`}
              fill
              priority
              sizes="(max-width: 900px) 100vw, 600px"
              className="object-cover"
              style={{ objectPosition: f.objectPosition }}
            />
          </div>
          {f.gallery.length > 0 && (
            <div className="mt-3.5 flex gap-3">
              {f.gallery.slice(0, 4).map((t) => (
                <div key={t.src} className="relative aspect-square flex-1 overflow-hidden rounded-[14px] border-2 border-tinta bg-crema">
                  <Image src={t.src} alt={t.alt || f.name} fill sizes="200px" className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-[1_1_360px]">
          <div className="eyebrow">{f.category}</div>
          <h1 className="m-0 mt-2.5 font-display text-[clamp(34px,4.6vw,52px)] font-extrabold leading-[.98] tracking-[-.04em]">{f.name}</h1>
          {f.reviews > 0 && (
            <div className="mt-3 flex items-center gap-2.5">
              <span className="font-mono text-[13px] font-medium tracking-[.1em] text-oro">★★★★★</span>
              <span className="text-[13px] text-tinta/55">{f.reviews} reseñas</span>
            </div>
          )}
          <p className="m-0 mt-[18px] text-pretty text-[16.5px] leading-[1.6] text-tinta/72">{f.long}</p>
          <div className="mt-[22px] font-display text-[32px] font-extrabold">{money(f.price)}</div>
          {f.servings && <div className="mt-1 font-mono text-[13px] text-tinta/55">{f.servings}</div>}
          <ProductBuy flavor={f.key} price={f.price} />
          {f.ingredients && (
            <>
              <h3 className="mb-3 mt-8 font-display text-lg font-extrabold">Ingredientes</h3>
              <p className="m-0 text-[14.5px] leading-[1.6] text-tinta/70">{f.ingredients}</p>
            </>
          )}
          {f.nutrition.length > 0 && (
            <>
              <h3 className="mb-3 mt-[26px] font-display text-lg font-extrabold">Información nutricional</h3>
              <div className="flex flex-col gap-0.5 overflow-hidden rounded-[14px] border-[2.5px] border-tinta bg-tinta">
                {f.nutrition.map(([k, v], i) => (
                  <div key={`${k}-${i}`} className="flex justify-between gap-4 bg-crema px-4 py-[11px] text-[13.5px] font-medium">
                    <span className="text-tinta/65">{k}</span>
                    <span className="text-right font-mono">{v}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
