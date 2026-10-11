// Formatos del panel (servidor y cliente).

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

/** $1,2 M · $350 K · $900 */
export function moneyCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000).toLocaleString("es-CO")} K`;
  return money(n);
}

export function dayLabel(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]}`;
}
