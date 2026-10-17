"use client";

/** Campo de pesos con separador de miles mientras se escribe. */
export function MoneyInput({ value, onChange, id, className = "", placeholder }: { value: number; onChange: (n: number) => void; id?: string; className?: string; placeholder?: string }) {
  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-tinta/50">$</span>
      <input
        id={id}
        inputMode="numeric"
        value={value ? value.toLocaleString("es-CO") : value === 0 ? "0" : ""}
        placeholder={placeholder}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "").slice(0, 9)) || 0)}
        className="w-full rounded-xl border-2 border-tinta/20 bg-crema/40 py-2.5 pl-7 pr-3.5 text-[15px] font-semibold text-tinta outline-none focus:border-vino focus:bg-white"
      />
    </div>
  );
}
