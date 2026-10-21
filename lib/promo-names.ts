// Nombres divertidos para los códigos promocionales (sin tildes ni espacios).
const WORDS = [
  "CANELAZO", "GRANOLOCO", "ANTOJITO", "CRUNCHY", "AVENAFELIZ", "NUTOLOVER", "COCOAMOR", "MORDISCO",
  "SUPERCLUSTER", "BERRYBOOM", "DESAYUNAZO", "PECANITA", "ALMENDRUCO", "NOLAFIESTA", "CHISPAZO", "YOGURLOVE",
  "CRUJIENTE", "TENTACION", "DULCEPECADO", "GRANOLIFE", "BOCADITO", "PICARDIA", "SABORCITO", "CUCHARADA",
];

/** Ej.: CANELAZO15 · MORDISCOENVIO */
export function funPromoCode(kind: "percent" | "free_shipping", percent: number | null): string {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const tail = kind === "percent" ? String(percent ?? "") : "ENVIO";
  const extra = Math.random() < 0.35 ? String(Math.floor(Math.random() * 90) + 10) : "";
  return `${word}${tail}${extra}`.slice(0, 24);
}
