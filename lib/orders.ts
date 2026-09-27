import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { FLAVORS, isFlavorKey } from "./catalog";
import type { CartLine, Totals } from "./pricing";
import type { TransactionStatus } from "./wompi";

let client: SupabaseClient | null | undefined;

/** Cliente con service role (omite RLS). Solo servidor. Null si falta configuración. */
export function db(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}

export type NewOrderInput = {
  customer: { name: string; legalId: string; email: string; phone: string };
  shipping: { city: string; region: string; neighborhood: string; address: string; notes: string };
  lines: CartLine[];
};

export type CreatedOrder = { orderId: string; reference: string; city: string; etaDays: number; totals: Totals };

/** Error de negocio con mensaje listo para mostrar al cliente. */
export class OrderError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/**
 * Crea el pedido en Supabase de forma atómica: valida el carrito contra el
 * catálogo, calcula precios y envío en la base y reserva el stock.
 */
export async function createOrder(input: NewOrderInput): Promise<CreatedOrder> {
  const d = db();
  if (!d) throw new OrderError("La tienda aún no está configurada. Escríbenos por WhatsApp para completar tu pedido.", 503);

  const { data, error } = await d.rpc("create_order", {
    p_customer: {
      email: input.customer.email,
      name: input.customer.name,
      phone: input.customer.phone,
      legal_id: input.customer.legalId,
    },
    p_address: {
      city: input.shipping.city,
      region: input.shipping.region,
      neighborhood: input.shipping.neighborhood,
      address: input.shipping.address,
      notes: input.shipping.notes,
    },
    p_lines: input.lines,
  });

  if (error) {
    if (error.message === "OUT_OF_STOCK") {
      const name = isFlavorKey(error.details) ? FLAVORS[error.details].name : "uno de los sabores";
      throw new OrderError(`Se nos agotó ${name} para la cantidad que pediste. Ajusta tu carrito o escríbenos por WhatsApp.`, 409);
    }
    if (["EMPTY_CART", "INVALID_LINE", "UNKNOWN_PRODUCT", "UNKNOWN_BUNDLE", "INVALID_FLAVORS"].includes(error.message)) {
      throw new OrderError("Algo en tu carrito ya no está disponible. Revísalo e intenta de nuevo.", 400);
    }
    console.error("[orders] create_order", error);
    throw new OrderError("No pudimos registrar tu pedido. Intenta de nuevo en un momento.", 500);
  }

  const r = data as { order_id: string; reference: string; city: string; eta_days: number; totals: Totals };
  return { orderId: r.order_id, reference: r.reference, city: r.city, etaDays: r.eta_days, totals: r.totals };
}

/**
 * Aplica una transacción ya verificada con Wompi. Idempotente.
 * La base solo aprueba si el monto coincide y mueve el inventario.
 */
export async function applyTransaction(
  tx: { id: string; reference: string; status: TransactionStatus; amountInCents: number; paymentMethodType: string | null },
  raw?: unknown,
): Promise<string | null> {
  const d = db();
  if (!d) return null;
  const { data, error } = await d.rpc("apply_payment", {
    p_reference: tx.reference,
    p_provider_tx_id: tx.id,
    p_status: tx.status,
    p_amount_in_cents: tx.amountInCents,
    p_payment_method: tx.paymentMethodType,
    p_raw: raw ?? null,
  });
  if (error) throw new Error(`apply_payment: ${error.message}`);
  if (data === null) console.warn(`[orders] Transacción ${tx.id} con referencia desconocida ${tx.reference}`);
  return data as string | null;
}

/** Bitácora de webhooks; nunca interrumpe el flujo si falla. */
export async function logPaymentEvent(e: {
  eventType: string;
  txId: string | null;
  reference: string | null;
  checksumValid: boolean;
  payload: unknown;
}): Promise<void> {
  const d = db();
  if (!d) return;
  const { error } = await d.from("payment_events").insert({
    event_type: e.eventType,
    provider_tx_id: e.txId,
    reference: e.reference,
    checksum_valid: e.checksumValid,
    payload: e.payload,
  });
  if (error) console.error("[orders] payment_events", error);
}
