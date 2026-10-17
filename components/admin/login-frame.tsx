import Link from "next/link";

/** Barra superior y pie de la pantalla de ingreso. */
export function LoginFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-tinta/15 bg-white/70">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between px-5 py-5 font-mono text-[11.5px] uppercase tracking-[.16em] text-tinta/60 sm:px-8">
          <Link href="/" className="flex items-center gap-2 text-tinta/60 hover:text-vino">
            <span aria-hidden="true">←</span> Volver al sitio
          </Link>
          <span>Panel de administración</span>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-tinta/15">
        <div className="mx-auto max-w-[1320px] px-5 py-6 font-mono text-[11px] uppercase tracking-[.14em] text-tinta/50 sm:px-8">
          © 2026 Nuto &amp; Nola · Panel de administración
        </div>
      </footer>
    </div>
  );
}
