import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FLAVOR_KEYS, FLAVORS, PRICE, isFlavorKey } from "@/lib/catalog";
import { money } from "@/lib/pricing";
import { ProductBuy } from "@/components/product-buy";

type Props = { params: Promise<{ sabor: string }> };

export function generateStaticParams() {
  return FLAVOR_KEYS.map((sabor) => ({ sabor }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sabor } = await params;
  if (!isFlavorKey(sabor)) return {};
  const f = FLAVORS[sabor];
  return { title: `${f.name} · Nuto & Nola`, description: f.short, openGraph: { images: [f.img] } };
}

const NUTRITION = [
  ["Porción", "35 g"],
  ["Calorías", "158 kcal"],
  ["Proteína", "8 g"],
  ["Grasa total", "9 g"],
  ["Fibra", "5 g"],
];

const THUMBS = [
  { src: "/img/granola-tray.jpg", alt: "Textura de la granola", cls: "object-cover" },
  { src: "/img/bowl.jpg", alt: "Servida en bowl", cls: "object-cover" },
  { src: "/img/flatlay.jpg", alt: "En la mesa del desayuno", cls: "object-cover object-[center_80%] mix-blend-multiply" },
];

export default async function ProductPage({ params }: Props) {
  const { sabor } = await params;
  if (!isFlavorKey(sabor)) notFound();
  const f = FLAVORS[sabor];

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
              alt={`Bolsa de granola ${f.name}`}
              fill
              priority
              sizes="(max-width: 900px) 100vw, 600px"
              className="object-cover"
              style={{ objectPosition: f.objectPosition }}
            />
          </div>
          <div className="mt-3.5 flex gap-3">
            {THUMBS.map((t) => (
              <div key={t.src} className="relative aspect-square flex-1 overflow-hidden rounded-[14px] border-2 border-tinta bg-crema">
                <Image src={t.src} alt={t.alt} fill sizes="200px" className={t.cls} />
              </div>
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-[1_1_360px]">
          <div className="eyebrow">Granola</div>
          <h1 className="m-0 mt-2.5 font-display text-[clamp(34px,4.6vw,52px)] font-extrabold leading-[.98] tracking-[-.04em]">{f.name}</h1>
          <div className="mt-3 flex items-center gap-2.5">
            <span className="font-mono text-[13px] font-medium tracking-[.1em] text-oro">★★★★★</span>
            <span className="text-[13px] text-tinta/55">{f.reviews} reseñas</span>
          </div>
          <p className="m-0 mt-[18px] text-pretty text-[16.5px] leading-[1.6] text-tinta/72">{f.long}</p>
          <div className="mt-[22px] font-display text-[32px] font-extrabold">{money(PRICE)}</div>
          <div className="mt-1 font-mono text-[13px] text-tinta/55">14 porciones · IVA incluido</div>
          <ProductBuy flavor={f.key} />
          <h3 className="mb-3 mt-8 font-display text-lg font-extrabold">Ingredientes</h3>
          <p className="m-0 text-[14.5px] leading-[1.6] text-tinta/70">{f.ingredients}</p>
          <h3 className="mb-3 mt-[26px] font-display text-lg font-extrabold">Información nutricional</h3>
          <div className="flex flex-col gap-0.5 overflow-hidden rounded-[14px] border-[2.5px] border-tinta bg-tinta">
            {NUTRITION.map(([k, v]) => (
              <div key={k} className="flex justify-between bg-crema px-4 py-[11px] text-[13.5px] font-medium">
                <span className="text-tinta/65">{k}</span>
                <span className="font-mono">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
