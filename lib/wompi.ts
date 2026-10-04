import { createHash, timingSafeEqual } from "node:crypto";

// Integración con Wompi Web Checkout (redirección).
// Solo servidor: usa los secretos de integridad y eventos.

const CHECKOUT_URL = "https://checkout.wompi.co/p/";

export function apiBase(publicKey: string): string {
  return publicKey.startsWith("pub_prod_")
    ? "https://production.wompi.co/v1"
    : "https://sandbox.wompi.co/v1";
}

const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

/** Firma de integridad: SHA256(<referencia><monto en centavos><moneda><secreto>). */
export function integritySignature(
  reference: string,
  amountInCents: number,
  currency: string,
  secret: string,
): string {
  return sha256(`${reference}${amountInCents}${currency}${secret}`);
}

export type CheckoutParams = {
  publicKey: string;
  integritySecret: string;
  reference: string;
  amountInCents: number;
  redirectUrl: string;
  customer: { email: string; fullName: string; phone: string; legalId?: string };
  shipping: { address: string; city: string; region: string; phone: string };
};

export function buildCheckoutUrl(p: CheckoutParams): string {
  const q = new URLSearchParams();
  q.set("public-key", p.publicKey);
  q.set("currency", "COP");
  q.set("amount-in-cents", String(p.amountInCents));
  q.set("reference", p.reference);
  q.set("signature:integrity", integritySignature(p.reference, p.amountInCents, "COP", p.integritySecret));
  q.set("redirect-url", p.redirectUrl);
  q.set("customer-data:email", p.customer.email);
  q.set("customer-data:full-name", p.customer.fullName);
  q.set("customer-data:phone-number", p.customer.phone);
  q.set("customer-data:phone-number-prefix", "+57");
  if (p.customer.legalId) {
    q.set("customer-data:legal-id", p.customer.legalId);
    q.set("customer-data:legal-id-type", "CC");
  }
  q.set("shipping-address:address-line-1", p.shipping.address);
  q.set("shipping-address:country", "CO");
  q.set("shipping-address:city", p.shipping.city);
  q.set("shipping-address:region", p.shipping.region);
  q.set("shipping-address:phone-number", p.shipping.phone);
  return `${CHECKOUT_URL}?${q.toString()}`;
}

export type WompiEvent = {
  event: string;
  data: Record<string, unknown>;
  timestamp: number;
  signature: { properties: string[]; checksum: string };
};

function readPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (acc, k) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined),
    obj,
  );
}

/**
 * Verifica la autenticidad de un evento: SHA256 de los valores de
 * `signature.properties` (leídos de `data`) + `timestamp` + secreto de eventos.
 */
export function verifyEventChecksum(evt: WompiEvent, secret: string): boolean {
  const props = evt?.signature?.properties;
  const checksum = evt?.signature?.checksum;
  if (!Array.isArray(props) || typeof checksum !== "string") return false;
  const values = props.map((p) => String(readPath(evt.data, p) ?? "")).join("");
  const expected = sha256(`${values}${evt.timestamp}${secret}`);
  const a = Buffer.from(expected.toLowerCase());
  const b = Buffer.from(checksum.toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

export type TransactionStatus = "APPROVED" | "DECLINED" | "VOIDED" | "ERROR" | "PENDING";

export type TransactionSummary = {
  id: string;
  status: TransactionStatus;
  reference: string;
  amountInCents: number;
  paymentMethodType: string | null;
};

export async function fetchTransaction(publicKey: string, id: string): Promise<TransactionSummary | null> {
  const res = await fetch(`${apiBase(publicKey)}/transactions/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: Record<string, unknown> };
  const d = json.data;
  if (!d) return null;
  return {
    id: String(d.id),
    status: d.status as TransactionStatus,
    reference: String(d.reference),
    amountInCents: Number(d.amount_in_cents),
    paymentMethodType: (d.payment_method_type as string) ?? null,
  };
}
