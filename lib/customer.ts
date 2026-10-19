import { BOGOTA_CITY, BOGOTA_DEPARTMENT, isValidPlace } from "./colombia.ts";

export type CustomerForm = {
  nombre: string;
  cedula: string;
  correo: string;
  celular: string;
  departamento: string;
  ciudad: string;
  direccion: string;
  notas: string;
};

export const EMPTY_FORM: CustomerForm = {
  nombre: "", cedula: "", correo: "", celular: "",
  departamento: BOGOTA_DEPARTMENT, ciudad: BOGOTA_CITY, direccion: "", notas: "",
};

/** Ciudad y departamento para despacho, tarifa de envío y Wompi. */
export function resolvePlace(f: CustomerForm): { city: string; region: string } {
  return { city: f.ciudad, region: f.departamento };
}

// Partículas que van en minúscula dentro de un nombre ("María de los Ángeles").
const PARTICLES = new Set(["de", "del", "la", "las", "los", "y", "e", "da", "do", "van", "von"]);

/** "maría  RODRÍGUEZ de la cruz" → "María Rodríguez de la Cruz". */
export function formatName(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .trimStart()
    .split(" ")
    .map((w, i) => {
      const lower = w.toLocaleLowerCase("es-CO");
      if (i > 0 && PARTICLES.has(lower)) return lower;
      // Respeta nombres compuestos con guion o apóstrofo: "Ruiz-Díaz", "D'Alessandro".
      return lower.replace(/(^|[-'’])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase("es-CO"));
    })
    .join(" ");
}

/** Documento sin puntos, guiones ni espacios, en mayúsculas: "1.020.304-050" → "1020304050". */
export function normalizeDoc(raw: string): string {
  return raw.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

/** Muestra el documento con separadores de miles si es solo numérico. */
export function displayDoc(raw: string): string {
  const d = normalizeDoc(raw);
  return /^\d+$/.test(d) ? Number(d).toLocaleString("es-CO") : d;
}

const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export function isValidEmail(raw: string): boolean {
  const e = raw.trim();
  return e.length <= 160 && EMAIL.test(e) && !e.includes("..") && !/^\.|\.@|@-/.test(e);
}

export type FieldErrors = Partial<Record<keyof CustomerForm, string>>;

/** Errores por campo, con el texto que se muestra debajo de cada casilla. */
export function fieldErrors(f: CustomerForm): FieldErrors {
  const e: FieldErrors = {};
  const words = f.nombre.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) e.nombre = "Escribe tu nombre y apellido.";
  const doc = normalizeDoc(f.cedula);
  if (!doc) e.cedula = "Escribe tu documento de identidad.";
  else if (doc.length < 5 || doc.length > 15 || !/\d/.test(doc)) e.cedula = "Revisa el número: entre 5 y 15 dígitos.";
  if (!f.correo.trim()) e.correo = "Escribe tu correo.";
  else if (!isValidEmail(f.correo)) e.correo = "Este correo no es válido (ej: maria@correo.com).";
  const cel = f.celular.replace(/\D/g, "");
  if (cel.length < 7 || cel.length > 12) e.celular = "Escribe un celular válido.";
  if (!f.departamento) e.departamento = "Elige el departamento.";
  else if (!isValidPlace(f.departamento, f.ciudad)) e.ciudad = "Elige la ciudad o municipio.";
  if (!f.direccion.trim()) e.direccion = "Escribe la dirección de entrega.";
  return e;
}

const LABELS: Record<keyof CustomerForm, string> = {
  nombre: "nombre y apellido", cedula: "un documento de identidad válido", correo: "un correo válido",
  celular: "un celular válido", departamento: "el departamento", ciudad: "la ciudad o municipio",
  direccion: "la dirección de entrega", notas: "",
};

/** Devuelve la lista de campos faltantes, en lenguaje para el mensaje de error. */
export function validateCustomer(f: CustomerForm): string[] {
  return (Object.keys(fieldErrors(f)) as (keyof CustomerForm)[]).map((k) => LABELS[k]);
}

/** Normaliza un objeto no confiable a CustomerForm (strings recortados y acotados). */
export function parseCustomer(input: unknown): CustomerForm {
  const r = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const s = (k: keyof CustomerForm, max = 200) => (typeof r[k] === "string" ? (r[k] as string).trim().slice(0, max) : "");
  return {
    nombre: formatName(s("nombre", 120)).trim(), cedula: normalizeDoc(s("cedula", 24)).slice(0, 15),
    correo: s("correo", 160).toLowerCase(), celular: s("celular", 20),
    departamento: s("departamento", 80), ciudad: s("ciudad", 80), direccion: s("direccion", 200), notas: s("notas", 500),
  };
}
