import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CartLine, Totals } from "./pricing";
import type { TransactionStatus } from "./wompi";

let client: SupabaseClient | null | undefined;

/** Cliente con service role. Devuelve null si Supabase no está configurado. */
function db(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  if (!client) console.warn("[orders] Supabase sin configurar: los pedidos no se guardan.");
  return client;
}

export type NewOrder = {
  reference: string;
  customer: { name: string; legalId: string; email: string; phone: string };
  shipping: { city: string; region: string; neighborhood: string; address: string; notes: string };
  lines: CartLine[];
  totals: Totals;
};

export async function createOrder(o: NewOrder): Promise<void> {
  const d = db();
  if (!d) return;
  const { error } = await d.from("orders").insert({
    reference: o.reference,
    customer_name: o.customer.name,
    customer_legal_id: o.customer.legalId || null,
    customer_email: o.customer.email,
    customer_phone: o.customer.phone,
    city: o.shipping.city,
    region: o.shipping.region,
    neighborhood: o.shipping.neighborhood || null,
    address: o.shipping.address,
    delivery_notes: o.shipping.notes || null,
    lines: o.lines,
    gross: o.totals.gross,
    discount: o.totals.discount,
    subtotal: o.totals.subtotal,
    shipping: o.totals.shipping,
    total: o.totals.total,
    amount_in_cents: o.totals.total * 100,
  });
  if (error) throw new Error(`No se pudo crear el pedido: ${error.message}`);
}

/**
 * Actualiza el estado a partir de una transacción ya verificada con Wompi.
 * Solo aprueba si el monto cobrado coincide con el del pedido.
 */
export async function applyTransaction(tx: {
  id: string;
  reference: string;
  status: TransactionStatus;
  amountInCents: number;
  paymentMethodType: string | null;
}): Promise<void> {
  const d = db();
  if (!d) return;
  const { data: order, error } = await d
    .from("orders")
    .select("status, amount_in_cents")
    .eq("reference", tx.reference)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) {
    console.warn(`[orders] Transacción ${tx.id} con referencia desconocida ${tx.reference}`);
    return;
  }
  if (order.status === "APPROVED") return; // estado final
  let status: TransactionStatus = tx.status;
  if (status === "APPROVED" && Number(order.amount_in_cents) !== tx.amountInCents) {
    console.error(`[orders] Monto no coincide en ${tx.reference}: ${tx.amountInCents} vs ${order.amount_in_cents}`);
    status = "ERROR";
  }
  const { error: upErr } = await d
    .from("orders")
    .update({
      status,
      wompi_transaction_id: tx.id,
      payment_method: tx.paymentMethodType,
      paid_at: status === "APPROVED" ? new Date().toISOString() : null,
    })
    .eq("reference", tx.reference);
  if (upErr) throw new Error(upErr.message);
}
