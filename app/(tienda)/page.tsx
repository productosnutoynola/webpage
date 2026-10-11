import Image from "next/image";
import Link from "next/link";
import { FLAVOR_KEYS, FLAVORS } from "@/lib/catalog";
import { CONTACT } from "@/lib/contact";
import { FlavorCard } from "@/components/flavor-card";
import { PackGrid } from "@/components/pack-card";
import { AddPackButton } from "@/components/add-pack-button";
import { Marquee } from "@/components/marquee";

const WAYS = [
  ["Con yogur griego y fruta", "El clásico. Berries aquí es imbatible."],
  ["Con helado de cualquier sabor", "Melted Cocoa + un chorrito de arequipe. Confía."],
  ["Con queso cottage", "Salado, cremoso y con crunch. Desayuno de 2 minutos."],
  ["Como cereal con leche", "Aguanta el tazón sin volverse papilla."],
  ["Sácalo de la bolsa y directo a tu boca", "No vamos a juzgarte. Así se acaba más rápido."],
];

const REVIEWS = [
  ["Pedí una bolsa el lunes. El jueves pedí tres. No sé qué le ponen al Cinnamon Roll.", "Laura", "var(--color-mostaza)"],
  ["Los clusters son enormes, no ese polvillo de las de supermercado. Y de verdad no sabe dulce.", "Andrés", "var(--color-rosa)"],
  ["Los tres sabores en casa y mis hijos la comen sin pelear, milagro.", "Catalina", "var(--color-ciruela)"],
];

const h2 = "m-0 mt-3 font-display text-[clamp(30px,4vw,46px)] font-extrabold leading-none tracking-[-.035em]";

export default function Home() {
  return (
    <main>
      {/* HERO */}
      <section
        id="inicio"
        className="relative flex flex-col overflow-hidden lg:min-h-[clamp(560px,calc(100svh-190px),860px)] lg:flex-row lg:items-center"
      >
        {/* Foto a sangre por la izquierda, fundida con el fondo (multiply + desvanecido) */}
        <div className="pointer-events-none relative aspect-[900/760] w-full max-w-[680px] lg:absolute lg:inset-y-0 lg:left-0 lg:aspect-auto lg:w-[min(56vw,1000px)] lg:max-w-none">
          <Image
            src="/img/flatlay.jpg"
            alt="Bolsa de granola Nuto & Nola abierta con granola regada"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 56vw"
            className="object-cover object-[left_top] mix-blend-multiply brightness-[1.06] [mask-image:linear-gradient(to_bottom,#000_72%,transparent),linear-gradient(to_right,#000_80%,transparent)] [mask-composite:intersect]"
          />
        </div>
        <div className="relative mx-auto flex w-full max-w-[1240px] px-[22px] pb-[clamp(34px,6vh,58px)] pt-2 lg:justify-end lg:py-16">
          <div className="max-w-[560px] lg:w-[44%]">
            <h1 className="m-0 text-balance font-display text-[clamp(30px,3.9vw,54px)] font-extrabold leading-[1.02] tracking-[-.035em] text-ciruela">
              Prepara tus snacks, desayunos y postres sin sentirte culpable
            </h1>
            <p className="m-0 mt-[18px] max-w-[52ch] text-pretty text-[15px] leading-[1.6] text-tinta/80">
              En Nuto &amp; Nola somos una familia de productos deliciosos creados para disfrutar y nutrir de forma real,
              creemos que hay un sabor para cada personalidad. Te invitamos a descubrirlo tú mismo.
            </p>
            <div className="mt-[26px] flex flex-wrap gap-3">
              <Link href="/#tienda" className="btn-primary press px-[26px] py-[15px] text-[15.5px] hover:text-crema">
                Comprar granola →
              </Link>
              <AddPackButton />
            </div>
          </div>
        </div>
      </section>

      <Marquee
        items={[
          "Productos naturales",
          "Listos para acompañar tus comidas",
          "Mata tus antojos de forma saludable",
          "¿Es posible crear un sabor para cada gusto?",
        ]}
        repeat={2}
        duration="48s"
        className="border-y-2 border-tinta bg-crema py-[18px]"
        itemClassName="gap-[22px] pr-[22px] font-display text-[clamp(17px,2.2vw,24px)] font-extrabold tracking-[-.02em] text-vino"
        separatorClassName="text-mostaza"
      />

      {/* TIENDA */}
      <section id="tienda" className="mx-auto max-w-[1240px] px-[22px] pt-[66px]">
        <div className="mb-7">
          <div className="eyebrow">01 — La tienda</div>
          <h2 className="m-0 mt-2.5 font-display text-[clamp(32px,4.2vw,50px)] font-extrabold leading-[.98] tracking-[-.035em]">
            Elige tu antojo
          </h2>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(262px,1fr))] gap-[22px]">
          {FLAVOR_KEYS.map((k) => (
            <FlavorCard key={k} f={FLAVORS[k]} />
          ))}
        </div>

        <h3 id="combos" className="mb-[18px] mt-[54px] border-b-[2.5px] border-tinta pb-3 font-display text-[clamp(24px,3vw,32px)] font-extrabold">
          Combos y packs
        </h3>
        <PackGrid />
      </section>

      {/* CÓMO SE COME */}
      <section className="mx-auto max-w-[1240px] px-[22px] pt-[66px]">
        <div className="flex flex-wrap items-center gap-10">
          <div className="relative aspect-square min-w-0 flex-[1_1_320px] overflow-hidden rounded-3xl border-[3px] border-tinta shadow-[9px_9px_0_var(--color-rosa)]">
            <Image src="/img/bowl.jpg" alt="Bowl de helado con granola y frambuesas" fill sizes="(max-width: 800px) 100vw, 600px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-[1_1_380px]">
            <div className="eyebrow">02 — Cómo se come</div>
            <h2 className={h2}>Prepara tus antojos de forma divertida</h2>
            <div className="mt-[26px] flex flex-col gap-0.5 overflow-hidden rounded-[18px] border-[2.5px] border-tinta bg-tinta">
              {WAYS.map(([t, d]) => (
                <div key={t} className="bg-crema px-5 py-4">
                  <div className="font-display text-base font-bold">{t}</div>
                  <div className="mt-[3px] text-[13.5px] leading-[1.45] text-tinta/65">{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* NOSOTROS */}
      <section id="nosotros" className="mx-auto max-w-[1240px] px-[22px] pt-[66px]">
        <div className="flex flex-wrap items-center gap-10">
          <div className="min-w-0 flex-[1_1_380px]">
            <div className="eyebrow">03 — Nosotros</div>
            <h2 className={h2}>
              Empezó como un
              <br />
              antojo de cocina
            </h2>
            <p className="m-0 mt-5 max-w-[46ch] text-pretty text-[15.5px] leading-[1.6] text-tinta/75">
              Una joven apasionada por la cocina buscó una granola que se sintiera real y trajo a su mente pequeños sabores
              que la hacían recordar a sus antojos de siempre.
            </p>
            <p className="m-0 mt-3.5 max-w-[46ch] text-pretty text-[15.5px] leading-[1.6] text-tinta/75">
              Ambiciosos queremos estar en tu lunch para el trabajo, en tus pre-entrenos, en esos postres y antojos de dulce
              de las tardes, inclusive en la lonchera de tus hijos.
            </p>
            <div className="mt-6 inline-flex items-center gap-2.5 rounded-[14px] border-2 border-tinta bg-rosa px-4 py-3 shadow-[4px_4px_0_var(--color-tinta)]">
              <span className="font-display text-base font-extrabold text-ciruela">Creado con ❤️ en 2026</span>
            </div>
          </div>
          <div className="relative aspect-[4/5] min-w-0 flex-[1_1_320px] overflow-hidden rounded-3xl border-[3px] border-tinta shadow-[9px_9px_0_var(--color-mostaza)]">
            <Image src="/img/hand-bag.jpg" alt="Bolsa de granola Nuto & Nola en la mano" fill sizes="(max-width: 800px) 100vw, 600px" className="object-cover" />
          </div>
        </div>
      </section>

      {/* RESEÑAS */}
      <section className="mx-auto max-w-[1240px] px-[22px] pt-[66px]">
        <div className="mb-[30px] text-center">
          <div className="eyebrow">04 — Lo que dicen</div>
          <h2 className="m-0 mt-2.5 font-display text-[clamp(28px,3.6vw,42px)] font-extrabold leading-none tracking-[-.035em]">
            Lo que dicen nuestros Nuto Lovers
          </h2>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5">
          {REVIEWS.map(([q, who, sh]) => (
            <figure key={who} className="m-0 rounded-[18px] border-[2.5px] border-tinta bg-crema p-6" style={{ boxShadow: `5px 5px 0 ${sh}` }}>
              <div className="font-mono text-[13px] font-medium tracking-[.1em] text-oro" aria-label="5 de 5 estrellas">★★★★★</div>
              <blockquote className="m-0 mt-3 text-[15px] leading-[1.55] text-tinta">&ldquo;{q}&rdquo;</blockquote>
              <figcaption className="mt-3.5 text-[13px] font-semibold text-tinta/60">{who}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* CONTACTO */}
      <section id="contacto" className="mt-[70px] border-y-2 border-tinta bg-rosa">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-10 px-[22px] py-[60px]">
          <div className="min-w-0 flex-[1_1_340px]">
            <div className="eyebrow">05 — Contacto</div>
            <h2 className="m-0 mt-3 font-display text-[clamp(30px,4vw,48px)] font-extrabold leading-none tracking-[-.035em] text-ciruela">Hablemos</h2>
            <p className="m-0 mt-4 max-w-[42ch] text-[15.5px] leading-[1.6] text-cafe">
              Dudas del pedido, ideas de sabores, ventas al por mayor o simplemente saludar. Contestamos rápido.
            </p>
          </div>
          <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-3">
            <ContactRow href={CONTACT.whatsappUrl} bg="bg-mostaza" title="WhatsApp" titleCls="text-ciruela" value={CONTACT.whatsappDisplay} valueCls="text-sm text-cafe" />
            <ContactRow href={`mailto:${CONTACT.email}`} bg="bg-crema" title="Correo" titleCls="text-vino" value={CONTACT.email} valueCls="text-[12.5px] text-tinta/70" />
            <ContactRow href={CONTACT.instagramUrl} bg="bg-ciruela" title="Instagram" titleCls="text-rosa" value={CONTACT.instagram} valueCls="text-sm text-rosa/85" />
          </div>
        </div>
      </section>
    </main>
  );
}

function ContactRow(p: { href: string; bg: string; title: string; titleCls: string; value: string; valueCls: string }) {
  return (
    <a
      href={p.href}
      target={p.href.startsWith("http") ? "_blank" : undefined}
      rel="noopener noreferrer"
      className={`flex items-center gap-3.5 rounded-2xl border-[2.5px] border-tinta px-5 py-[18px] shadow-[5px_5px_0_var(--color-tinta)] ${p.bg}`}
    >
      <span className={`font-display text-[17px] font-extrabold ${p.titleCls}`}>{p.title}</span>
      <span className={`ml-auto break-all text-right font-mono ${p.valueCls}`}>{p.value}</span>
    </a>
  );
}
