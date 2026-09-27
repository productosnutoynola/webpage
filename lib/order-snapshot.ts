import type { CartLine, Totals } from "./pricing";

/** Copia local del pedido para pintar el recibo al volver de Wompi. */
export type OrderSnapshot = {
  reference: string;
  lines: CartLine[];
  totals: Totals;
  city: string;
  nombre: string;
  correo: string;
  direccion: string;
  etaDays: number;
  createdAt: number;
};

const KEY = "nyn-last-order";

export function saveSnapshot(s: OrderSnapshot) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

export function loadSnapshot(): OrderSnapshot | null {
  try {
    const raw = sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OrderSnapshot) : null;
  } catch {
    return null;
  }
}
