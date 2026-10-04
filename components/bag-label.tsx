import type { Flavor } from "@/lib/catalog";

/** Etiqueta dibujada sobre la foto de la bolsa kraft. */
export function BagLabel({ f }: { f: Flavor }) {
  const dot = <span className="size-1 rounded-full" style={{ background: f.ink }} />;
  return (
    <span
      className="absolute left-1/2 flex w-[66%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[3px] rounded-xl border-[2.5px] border-tinta px-2.5 py-[11px] shadow-[4px_4px_0_rgba(42,16,24,.5)]"
      style={{ top: f.labelTop, background: f.color, color: f.ink }}
    >
      <span className="font-mono text-[8px] uppercase tracking-[.2em]">Nuto &amp; Nola</span>
      <span className="text-center font-display text-[clamp(15px,2vw,21px)] font-extrabold leading-none">{f.name}</span>
      <span className="flex items-center gap-[7px] font-mono text-[8.5px] tracking-[.06em]">
        <span>granola</span>
        {dot}
        <span>{f.meta}</span>
      </span>
    </span>
  );
}
