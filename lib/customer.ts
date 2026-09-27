import { CITIES } from "./catalog.ts";

export type CustomerForm = {
  nombre: string;
  cedula: string;
  correo: string;
  celular: string;
  ciudad: string;
  /** Solo cuando ciudad === "Otra ciudad". */
  otraCiudad: string;
  departamento: string;
  barrio: string;
  direccion: string;
  notas: string;
};

export const EMPTY_FORM: CustomerForm = {
  nombre: "", cedula: "", correo: "", celular: "", ciudad: "Bogotá",
  otraCiudad: "", departamento: "", barrio: "", direccion: "", notas: "",
};

const REGION: Record<string, string> = {
  "Bogotá": "Bogotá D.C.",
  "Medellín": "Antioquia",
  "Cali": "Valle del Cauca",
  "Barranquilla": "Atlántico",
  "Cartagena": "Bolívar",
  "Bucaramanga": "Santander",
  "Pereira": "Risaralda",
};

/** Ciudad y departamento reales para despacho y para Wompi. */
export function resolvePlace(f: CustomerForm): { city: string; region: string } {
  if (f.ciudad === "Otra ciudad") return { city: f.otraCiudad.trim(), region: f.departamento.trim() };
  return { city: f.ciudad, region: REGION[f.ciudad] ?? f.ciudad };
}

/** Devuelve la lista de campos faltantes, en lenguaje para el mensaje de error. */
export function validateCustomer(f: CustomerForm): string[] {
  const e: string[] = [];
  if (!f.nombre.trim()) e.push("nombre completo");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.correo.trim())) e.push("un correo válido");
  const cel = f.celular.replace(/\D/g, "");
  if (cel.length < 7 || cel.length > 12) e.push("un celular válido");
  if (!(CITIES as readonly string[]).includes(f.ciudad)) e.push("la ciudad");
  if (f.ciudad === "Otra ciudad") {
    if (!f.otraCiudad.trim()) e.push("tu ciudad o municipio");
    if (!f.departamento.trim()) e.push("el departamento");
  }
  if (!f.direccion.trim()) e.push("la dirección de entrega");
  return e;
}

/** Normaliza un objeto no confiable a CustomerForm (strings recortados y acotados). */
export function parseCustomer(input: unknown): CustomerForm {
  const r = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const s = (k: keyof CustomerForm, max = 200) => (typeof r[k] === "string" ? (r[k] as string).trim().slice(0, max) : "");
  return {
    nombre: s("nombre", 120), cedula: s("cedula", 20), correo: s("correo", 160), celular: s("celular", 20),
    ciudad: s("ciudad", 40), otraCiudad: s("otraCiudad", 80), departamento: s("departamento", 80),
    barrio: s("barrio", 80), direccion: s("direccion", 200), notas: s("notas", 500),
  };
}
