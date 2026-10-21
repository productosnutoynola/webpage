import "server-only";
import { db } from "./orders";

export type Range = "7" | "30" | "90" | "all";
export const RANGES: { key: Range; label: string }[] = [
  { key: "7", label: "7 días" },
  { key: "30", label: "30 días" },
  { key: "90", label: "90 días" },
  { key: "all", label: "Todo" },
];

export type Dashboard = {
  from: string;
  to: string;
  kpis: { revenue: number; orders: number; avg_ticket: number; discounts: number; shipping: number; customers: number };
  bags: number;
  by_day: { day: string; revenue: number; orders: number }[];
  by_city: { city: string; region: string; revenue: number; orders: number }[];
  by_flavor: { slug: string; name: string; bags: number }[];
  by_item: { name: string; kind: string; units: number; revenue: number }[];
  status: Partial<Record<OrderStatus, number>>;
  inventory: { slug: string; name: string; on_hand: number; reserved: number; available: number; low: boolean }[];
};

export type OrderStatus =
  | "pending_payment" | "paid" | "preparing" | "shipped" | "delivered" | "payment_failed" | "cancelled" | "needs_review";

/** Pestañas de la tabla de pedidos → estados que incluye cada una. */
export const ORDER_TABS = {
  despachar: { label: "Por despachar", statuses: ["paid", "preparing"] },
  enviados: { label: "Enviados", statuses: ["shipped"] },
  entregados: { label: "Entregados", statuses: ["delivered"] },
  ventas: { label: "Todas las ventas", statuses: ["paid", "preparing", "shipped", "delivered"] },
  otros: { label: "Sin pago / revisión", statuses: ["pending_payment", "payment_failed", "cancelled", "needs_review"] },
} as const satisfies Record<string, { label: string; statuses: readonly OrderStatus[] }>;
export type OrderTab = keyof typeof ORDER_TABS;

export type AdminOrder = {
  reference: string;
  status: OrderStatus;
  created_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  tracking_code: string | null;
  carrier: string | null;
  shipped_email_sent_at: string | null;
  shipped_email_error: string | null;
  ship_name: string;
  ship_phone: string;
  ship_city: string;
  ship_region: string;
  ship_address: string;
  ship_notes: string | null;
  gross_cop: number;
  discount_cop: number;
  promo_code: string | null;
  promo_discount_cop: number;
  shipping_cop: number;
  total_cop: number;
  confirmation_email_sent_at: string | null;
  customers: { email: string; legal_id: string | null } | null;
  order_items: { name: string; kind: string; flavors: string[]; quantity: number; line_total_cop: number }[];
  payments: { status: string; payment_method: string | null; provider_tx_id: string; created_at: string }[];
};

function client() {
  const d = db();
  if (!d) throw new Error("Supabase no está configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  return d;
}

export async function getDashboard(range: Range): Promise<Dashboard> {
  const { data, error } = await client().rpc("admin_dashboard", { p_days: range === "all" ? null : Number(range) });
  if (error) throw new Error(`admin_dashboard: ${error.message}`);
  return data as Dashboard;
}

function searchFilter<T extends { or: (f: string) => T }>(query: T, q: string): T {
  const term = q.trim().replace(/[%,()]/g, "");
  if (!term) return query;
  return /^\d{3,10}$/.test(term)
    ? query.or(`reference.like.${term}%,ship_phone.like.%${term}%`)
    : query.or(`ship_name.ilike.%${term}%,ship_city.ilike.%${term}%,ship_address.ilike.%${term}%`);
}

/** Pestañas donde hay pedidos que coinciden con la búsqueda (para guiar cuando la actual está vacía). */
export async function searchTabs(q: string): Promise<{ tab: OrderTab; count: number }[]> {
  const { data, error } = await searchFilter(client().from("orders").select("status"), q).limit(500);
  if (error) return [];
  const statuses = (data as { status: OrderStatus }[]).map((r) => r.status);
  return (["despachar", "enviados", "entregados", "otros"] as OrderTab[])
    .map((tab) => ({ tab, count: statuses.filter((s) => (ORDER_TABS[tab].statuses as readonly OrderStatus[]).includes(s)).length }))
    .filter((x) => x.count > 0);
}

export async function listOrders(tab: OrderTab, q: string): Promise<AdminOrder[]> {
  let query = client()
    .from("orders")
    .select(
      "reference, status, created_at, paid_at, shipped_at, delivered_at, tracking_code, carrier, shipped_email_sent_at, shipped_email_error, ship_name, ship_phone, ship_city, ship_region, " +
        "ship_address, ship_notes, gross_cop, discount_cop, promo_code, promo_discount_cop, shipping_cop, total_cop, confirmation_email_sent_at, " +
        "customers(email, legal_id), order_items(name, kind, flavors, quantity, line_total_cop), " +
        "payments(status, payment_method, provider_tx_id, created_at)",
    )
    .in("status", [...ORDER_TABS[tab].statuses])
    .order("created_at", { ascending: false })
    .limit(200);
  query = searchFilter(query, q);
  const { data, error } = await query;
  if (error) throw new Error(`orders: ${error.message}`);
  return data as unknown as AdminOrder[];
}

export class TransitionError extends Error {}

/** Vuelve a enviar el correo de "pedido en camino". */
export async function resendShippedEmail(reference: string): Promise<void> {
  const { error } = await client().rpc("resend_shipped_email", { p_reference: reference });
  if (error) throw new TransitionError(error.message === "NOT_SHIPPED" ? "El pedido no está en estado enviado." : error.message);
}

export async function setOrderStatus(reference: string, status: "shipped" | "delivered", tracking?: string, carrier?: string): Promise<void> {
  const { error } = await client().rpc("admin_set_order_status", {
    p_reference: reference,
    p_status: status,
    p_tracking: tracking ?? null,
    p_carrier: carrier ?? null,
  });
  if (error) {
    if (error.message === "INVALID_TRANSITION") throw new TransitionError("El pedido ya cambió de estado. Recarga la página.");
    if (error.message === "ORDER_NOT_FOUND") throw new TransitionError("No encontramos el pedido.");
    throw new Error(error.message);
  }
}
