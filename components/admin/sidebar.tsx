"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { logout } from "@/app/admin/actions";

const STORE = [
  { href: "/admin/tienda/productos", label: "Productos", icon: "▦" },
  { href: "/admin/tienda/productos/nuevo", label: "Agregar producto", icon: "＋" },
  { href: "/admin/tienda/packs", label: "Combos y packs", icon: "◫" },
  { href: "/admin/tienda/envios", label: "Envíos por ciudad", icon: "➜" },
  { href: "/admin/tienda/inventario", label: "Inventario", icon: "▤" },
  { href: "/admin/tienda/clientes", label: "Clientes", icon: "☺" },
];

export function AdminSidebar({ email }: { email: string }) {
  const path = usePathname();
  const isActive = (href: string) =>
    href === "/admin/tienda/productos"
      ? path === href || (path.startsWith(href + "/") && !path.endsWith("/nuevo"))
      : path === href || path.startsWith(href + "/");
  const item = (href: string, label: string, icon: string) => {
    const on = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={on ? "page" : undefined}
        className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-colors ${
          on ? "bg-ciruela text-crema hover:text-crema" : "text-tinta/75 hover:bg-rosa/40 hover:text-tinta"
        }`}
      >
        <span aria-hidden="true" className={`w-4 text-center text-[13px] ${on ? "text-mostaza" : "text-vino/70"}`}>{icon}</span>
        {label}
      </Link>
    );
  };

  return (
    <aside className="border-b border-tinta/15 bg-white/60 lg:w-[264px] lg:flex-none lg:border-b-0 lg:border-r">
      <div className="lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto">
      <div className="flex items-center gap-3 px-5 pb-2 pt-5 lg:pb-5 lg:pt-7">
        <Image src="/img/logo.png" alt="" width={40} height={40} className="size-10 rounded-xl border-2 border-tinta" />
        <div className="min-w-0">
          <div className="font-display text-[17px] font-extrabold leading-none">Nuto &amp; Nola</div>
          <div className="mt-1 truncate font-mono text-[10px] uppercase tracking-[.14em] text-tinta/50">Administración</div>
        </div>
      </div>
      <nav aria-label="Secciones del panel" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-6">
        {item("/admin/panel", "Resumen y pedidos", "◔")}
        <div className="hidden px-3 pb-1 pt-5 font-mono text-[10.5px] uppercase tracking-[.16em] text-tinta/50 lg:block">Configuración de la tienda</div>
        <span className="mx-1 w-px shrink-0 bg-tinta/15 lg:hidden" aria-hidden="true" />
        {STORE.map((s) => item(s.href, s.label, s.icon))}
      </nav>
      <div className="hidden border-t border-tinta/10 px-5 py-5 lg:block">
        <a href="/" target="_blank" rel="noopener" className="block text-[13px] font-semibold text-vino">Ver la tienda ↗</a>
        <div className="mt-3 truncate text-[12px] text-tinta/50">{email}</div>
        <form action={logout} className="mt-2">
          <button className="font-mono text-[11px] uppercase tracking-[.14em] text-tinta/60 hover:text-vino">Cerrar sesión</button>
        </form>
      </div>
      </div>
    </aside>
  );
}
