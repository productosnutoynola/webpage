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

export type OrderSummary = {
  orderId: string;
  status: string;
  firstName: string;
  email: string;
  city: string;
  region: string;
  address: string;
  etaDays: number;
  items: { name: string; flavors: string[]; quantity: number; lineTotal: number }[];
  totals: { gross: number; discount: number; shipping: number; total: number };
  paymentMethod: string | null;
  createdAt: string;
};

/**
 * Resumen del pedido guardado en Supabase. Solo se llama con una referencia
 * obtenida de una transacción verificada en Wompi (no adivinable por el cliente).
 */
export async function getOrderSummary(reference: string): Promise<OrderSummary | null> {
  const d = db();
  if (!d) return null;
  const { data, error } = await d
    .from("orders")
    .select(
      "reference, status, ship_name, ship_city, ship_region, ship_address, gross_cop, discount_cop, shipping_cop, total_cop, created_at, " +
        "customers(email), shipping_zones(eta_days), order_items(name, flavors, quantity, line_total_cop), payments(status, payment_method)",
    )
    .eq("reference", reference)
    .maybeSingle();
  if (error) {
    console.error("[orders] getOrderSummary", error);
    return null;
  }
  if (!data) return null;
  const o = data as unknown as {
    reference: string; status: string; ship_name: string; ship_city: string; ship_region: string; ship_address: string;
    gross_cop: number; discount_cop: number; shipping_cop: number; total_cop: number; created_at: string;
    customers: { email: string } | null; shipping_zones: { eta_days: number } | null;
    order_items: { name: string; flavors: string[]; quantity: number; line_total_cop: number }[];
    payments: { status: string; payment_method: string | null }[];
  };
  return {
    orderId: o.reference,
    status: o.status,
    firstName: o.ship_name.split(" ")[0] || o.ship_name,
    email: o.customers?.email ?? "",
    city: o.ship_city,
    region: o.ship_region,
    address: o.ship_address,
    etaDays: o.shipping_zones?.eta_days ?? 2,
    items: o.order_items.map((i) => ({ name: i.name, flavors: i.flavors, quantity: i.quantity, lineTotal: i.line_total_cop })),
    totals: { gross: o.gross_cop, discount: o.discount_cop, shipping: o.shipping_cop, total: o.total_cop },
    paymentMethod: o.payments.find((p) => p.status === "APPROVED")?.payment_method ?? null,
    createdAt: o.created_at,
  };
}
