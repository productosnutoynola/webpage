// Transportadoras de Colombia para el despacho de pedidos. La URL es la página
// de rastreo que se enlaza en el correo de envío (la misma lista vive en
// supabase/functions/order-confirmation-email/index.ts).
export type Carrier = { name: string; url: string | null; needsTracking: boolean };

export const CARRIERS: Carrier[] = [
  { name: "Servientrega", url: "https://www.servientrega.com/wps/portal/rastreo-envio", needsTracking: true },
  { name: "Interrapidísimo", url: "https://www.interrapidisimo.com/sigue-tu-envio/", needsTracking: true },
  { name: "Coordinadora", url: "https://coordinadora.com/rastreo/rastreo-de-guia/", needsTracking: true },
  { name: "Envía", url: "https://envia.co/", needsTracking: true },
  { name: "TCC", url: "https://tcc.com.co/", needsTracking: true },
  { name: "Deprisa", url: "https://www.deprisa.com/", needsTracking: true },
  { name: "4-72", url: "https://www.4-72.com.co/", needsTracking: true },
  { name: "Saferbo", url: "https://www.saferbo.com/", needsTracking: true },
  { name: "Mensajeros Urbanos", url: "https://mensajerosurbanos.com/", needsTracking: false },
  { name: "Picap", url: "https://picap.app/", needsTracking: false },
  { name: "Domicilio propio Nuto & Nola", url: null, needsTracking: false },
];

export const CARRIER_NAMES = CARRIERS.map((c) => c.name);
export const findCarrier = (name: string) => CARRIERS.find((c) => c.name === name);
