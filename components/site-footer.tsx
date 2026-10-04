import Link from "next/link";
import Image from "next/image";
import { CONTACT } from "@/lib/contact";

const linkCls = "text-sm text-crema/75 hover:text-rosa";

export function SiteFooter() {
  return (
    <footer className="border-t-2 border-tinta bg-tinta text-crema">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[34px] px-[22px] pb-[26px] pt-[50px]">
        <div>
          <Image
            src="/img/logo.png"
            alt="Nuto & Nola"
            width={104}
            height={104}
            className="block size-[104px] rounded-2xl border-2 border-crema/25 object-cover"
          />
        </div>
        <div>
          <div className="font-mono text-[10.5px] uppercase tracking-[.16em] text-mostaza">Tienda</div>
          <div className="mt-3.5 flex flex-col items-start gap-[9px]">
            <Link href="/#tienda" className={linkCls}>Todos los productos</Link>
            <Link href="/producto/cinnamon-roll" className={linkCls}>Cinnamon Roll</Link>
            <Link href="/producto/melted-cocoa" className={linkCls}>Melted Cocoa</Link>
            <Link href="/producto/berries" className={linkCls}>Berries</Link>
            <Link href="/#combos" className={linkCls}>Combos y packs</Link>
          </div>
        </div>
        <div>
          <div className="font-mono text-[10.5px] uppercase tracking-[.16em] text-mostaza">Contacto</div>
          <div className="mt-3.5 flex flex-col items-start gap-[9px]">
            <a href={CONTACT.whatsappUrl} className={linkCls}>WhatsApp</a>
            <a href={CONTACT.instagramUrl} className={linkCls}>Instagram</a>
            <a href={`mailto:${CONTACT.email}`} className="font-mono text-[13px] text-crema/75 hover:text-rosa">{CONTACT.email}</a>
          </div>
        </div>
        <div>
          <div className="font-mono text-[10.5px] uppercase tracking-[.16em] text-mostaza">Pagos</div>
          <div className="mt-3.5 flex flex-wrap gap-[7px]">
            {["VISA", "MASTERCARD", "AMEX", "PSE", "NEQUI"].map((m) => (
              <span key={m} className="rounded-md border-[1.5px] border-crema/30 px-[9px] py-[5px] font-mono text-[10.5px] font-medium text-crema/70">
                {m}
              </span>
            ))}
          </div>
          <div className="mt-3 font-mono text-[10.5px] text-crema/45">Pagos procesados por Wompi</div>
        </div>
      </div>
      <div className="mx-auto max-w-[1240px] border-t border-crema/15 px-[22px] pb-[34px] pt-5 font-mono text-xs text-crema/45">
        © 2026 Nuto &amp; Nola · productosnutoynola.com
      </div>
    </footer>
  );
}
