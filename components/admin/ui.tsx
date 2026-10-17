import Link from "next/link";

// Piezas visuales compartidas por las pantallas de "Configuración de la tienda".

export const card = "rounded-[20px] border-2 border-tinta bg-white";
export const input =
  "w-full rounded-xl border-2 border-tinta/20 bg-crema/40 px-3.5 py-2.5 text-[15px] text-tinta outline-none transition-colors placeholder:text-tinta/35 focus:border-vino focus:bg-white";
export const label = "mb-1.5 block text-[13.5px] font-semibold text-tinta";
export const hint = "mt-1.5 text-[12.5px] leading-snug text-tinta/55";
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl border-2 border-tinta bg-ciruela px-5 py-3 text-[14px] font-semibold text-crema shadow-[3px_3px_0_var(--color-tinta)] transition-transform hover:translate-x-px hover:translate-y-px hover:text-crema hover:shadow-[2px_2px_0_var(--color-tinta)] disabled:pointer-events-none disabled:opacity-50";
export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border-2 border-tinta bg-white px-4 py-2.5 text-[14px] font-semibold text-tinta hover:bg-rosa/40 hover:text-tinta disabled:opacity-50";
export const btnGhost = "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-vino hover:bg-rosa/40";

export function PageHeader({ eyebrow, title, intro, action }: { eyebrow: string; title: string; intro?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-[720px]">
        <div className="font-mono text-[10.5px] uppercase tracking-[.16em] text-vino">{eyebrow}</div>
        <h1 className="m-0 mt-1.5 font-display text-[clamp(26px,3vw,34px)] font-extrabold leading-none tracking-[-.03em]">{title}</h1>
        {intro && <p className="m-0 mt-2.5 text-[14.5px] leading-relaxed text-tinta/65">{intro}</p>}
      </div>
      {action}
    </div>
  );
}

export function Page({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-[1180px] px-5 pb-24 pt-8 sm:px-8 lg:pt-10">{children}</main>;
}

export function LoadError({ error }: { error: unknown }) {
  return (
    <div className={`${card} mt-8 p-6`}>
      <h2 className="m-0 font-display text-xl font-extrabold">No pudimos cargar los datos</h2>
      <p className="m-0 mt-2 text-sm text-tinta/60">{error instanceof Error ? error.message : "Error desconocido"}</p>
    </div>
  );
}

export function Field({ label: l, hint: h, children, htmlFor, required }: { label: string; hint?: React.ReactNode; children: React.ReactNode; htmlFor?: string; required?: boolean }) {
  return (
    <div>
      <label htmlFor={htmlFor} className={label}>
        {l}
        {required && <span className="text-vino"> *</span>}
      </label>
      {children}
      {h && <div className={hint}>{h}</div>}
    </div>
  );
}

export function Toggle({ checked, onChange, label: l, description, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; id?: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-tinta/15 bg-white px-4 py-3 hover:border-tinta/35">
      <span className="relative mt-0.5 inline-flex h-6 w-11 flex-none items-center">
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="absolute inset-0 rounded-full border-2 border-tinta bg-crema transition-colors peer-checked:bg-ciruela peer-focus-visible:ring-2 peer-focus-visible:ring-vino/40" />
        <span className="absolute left-1 size-3.5 rounded-full bg-tinta transition-transform peer-checked:translate-x-5 peer-checked:bg-mostaza" />
      </span>
      <span>
        <span className="block text-[14px] font-semibold">{l}</span>
        {description && <span className="mt-0.5 block text-[12.5px] leading-snug text-tinta/55">{description}</span>}
      </span>
    </label>
  );
}

export function StatusPill({ on, onText = "Publicado", offText = "Oculto" }: { on: boolean; onText?: string; offText?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-2.5 py-0.5 text-[12px] font-semibold ${
        on ? "border-[#2F7D4F]/40 bg-[#2F7D4F]/10 text-[#2F7D4F]" : "border-tinta/25 bg-tinta/5 text-tinta/60"
      }`}
    >
      <span aria-hidden="true">{on ? "●" : "○"}</span>
      {on ? onText : offText}
    </span>
  );
}

export function Crumb({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-vino">
      <span aria-hidden="true">←</span> {children}
    </Link>
  );
}
