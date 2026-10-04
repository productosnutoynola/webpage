/**
 * Franja con texto que recorre la pantalla de izquierda a derecha.
 * El contenido se duplica para que la animación (-50% → 0) sea continua.
 */
export function Marquee({
  items,
  repeat = 1,
  className = "",
  itemClassName = "",
  separatorClassName = "",
  duration = "26s",
  label,
}: {
  items: string[];
  /** Veces que se repite la lista en cada mitad, para cubrir pantallas anchas. */
  repeat?: number;
  className?: string;
  itemClassName?: string;
  separatorClassName?: string;
  duration?: string;
  label?: string;
}) {
  const half = Array.from({ length: repeat }, () => items).flat();
  const all = [...half, ...half];
  return (
    <div className={`overflow-hidden ${className}`} aria-label={label ?? items.join(" · ")} role="marquee">
      <div className="flex w-max animate-marquee items-center will-change-transform" style={{ animationDuration: duration }} aria-hidden="true">
        {all.map((t, i) => (
          <span key={i} className={`flex items-center whitespace-nowrap ${itemClassName}`}>
            {t}
            <span className={separatorClassName}>✳</span>
          </span>
        ))}
      </div>
    </div>
  );
}
