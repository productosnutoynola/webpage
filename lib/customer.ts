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

/** Devuelve la lista de campos faltantes, en lenguaje para el mensaje de error. */
export function validateCustomer(f: CustomerForm): string[] {
  const e: string[] = [];
  if (!f.nombre.trim()) e.push("nombre completo");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.correo.trim())) e.push("un correo válido");
  const cel = f.celular.replace(/\D/g, "");
  if (cel.length < 7 || cel.length > 12) e.push("un celular válido");
  if (!f.departamento) e.push("el departamento");
  else if (!isValidPlace(f.departamento, f.ciudad)) e.push("la ciudad o municipio");
  if (!f.direccion.trim()) e.push("la dirección de entrega");
  return e;
}

/** Normaliza un objeto no confiable a CustomerForm (strings recortados y acotados). */
export function parseCustomer(input: unknown): CustomerForm {
  const r = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const s = (k: keyof CustomerForm, max = 200) => (typeof r[k] === "string" ? (r[k] as string).trim().slice(0, max) : "");
  return {
    nombre: s("nombre", 120), cedula: s("cedula", 20), correo: s("correo", 160), celular: s("celular", 20),
    departamento: s("departamento", 80), ciudad: s("ciudad", 80), direccion: s("direccion", 200), notas: s("notas", 500),
  };
}
