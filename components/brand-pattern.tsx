// Marca de agua "nuto & nola" repartida por todo el sitio. Capa fija detrás del
// contenido (z-index negativo dentro del contexto raíz) para que las fotos con
// mix-blend-multiply se fundan con ella.
const ROWS = 22;
const PER_ROW = 9;

export function BrandPattern() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 select-none overflow-hidden">
      <div className="absolute left-1/2 top-1/2 flex w-[180vmax] -translate-x-1/2 -translate-y-1/2 -rotate-[9deg] flex-col gap-[clamp(38px,5vw,64px)]">
        {Array.from({ length: ROWS }, (_, r) => (
          <div
            key={r}
            className="flex justify-center gap-[clamp(48px,6vw,96px)] whitespace-nowrap font-display text-[clamp(15px,1.5vw,20px)] font-bold tracking-[.04em] text-mostaza/15"
            style={{ transform: r % 2 ? "translateX(clamp(60px,7vw,110px))" : undefined }}
          >
            {Array.from({ length: PER_ROW }, (_, i) => (
              <span key={i}>nuto &amp; nola</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
