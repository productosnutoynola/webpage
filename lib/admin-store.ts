import "server-only";
import { db } from "./orders";
import type { Flavor, PackTheme } from "./catalog";

// Lectura de las tablas de la tienda para "Configuración de la tienda".
// Las escrituras están en app/admin/(app)/tienda/actions.ts.

export type AdminProduct = {
  slug: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  active: boolean;
  sortOrder: number;
  short: string;
  long: string;
  ingredients: string;
  img: string;
  photoBg: string;
  objectPosition: string;
  blend: boolean;
  showLabel: boolean;
  labelTop: number;
  color: string;
  ink: string;
  meta: string;
  badge: string;
  reviews: number;
  servings: string;
  gallery: { src: string; alt: string }[];
  nutrition: [string, string][];
  packEligible: boolean;
  stock: { onHand: number; reserved: number; threshold: number };
};

export type AdminBundle = {
  slug: string;
  name: string;
  description: string;
  bags: number;
  discountPct: number;
  extra: number;
  fixed: boolean;
  items: { slug: string; qty: number }[];
  label: string;
  chip: string;
  cta: string;
  theme: PackTheme;
  featured: boolean;
  active: boolean;
  sortOrder: number;
};

export type AdminZone = { code: string; name: string; city: string | null; fee: number; freeFrom: number; etaDays: number; active: boolean; orders: number };

export type AdminCustomer = {
  email: string; full_name: string; phone: string | null; legal_id: string | null; created_at: string;
  orders: number; spent: number; last_order_at: string | null; city: string | null;
};

export type AdminMovement = { at: string; product: string; reason: string; onHandDelta: number; reservedDelta: number; note: string | null; reference: string | null };

function client() {
  const c = db();
  if (!c) throw new Error("Supabase no está configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  return c;
}

type ProductRow = Record<string, unknown> & { inventory: { on_hand: number; reserved: number; low_stock_threshold: number } | null };

function toAdminProduct(r: ProductRow): AdminProduct {
  const s = (k: string) => (r[k] as string | null) ?? "";
  return {
    slug: s("slug"),
    sku: s("sku"),
    name: s("name"),
    category: s("category"),
    price: r.price_cop as number,
    active: r.active as boolean,
    sortOrder: r.sort_order as number,
    short: s("short_description"),
    long: s("description"),
    ingredients: s("ingredients"),
    img: s("image_url"),
    photoBg: s("photo_bg_hex"),
    objectPosition: s("image_position"),
    blend: r.image_blend as boolean,
    showLabel: r.show_label as boolean,
    labelTop: r.label_top as number,
    color: s("color_hex") || "#DEA12C",
    ink: s("ink_hex"),
    meta: s("label_meta"),
    badge: s("badge"),
    reviews: r.reviews_count as number,
    servings: s("servings_label"),
    gallery: (r.gallery as AdminProduct["gallery"]) ?? [],
    nutrition: (r.nutrition as AdminProduct["nutrition"]) ?? [],
    packEligible: r.pack_eligible as boolean,
    stock: {
      onHand: r.inventory?.on_hand ?? 0,
      reserved: r.inventory?.reserved ?? 0,
      threshold: r.inventory?.low_stock_threshold ?? 10,
    },
  };
}

export async function listProducts(): Promise<AdminProduct[]> {
  const { data, error } = await client()
    .from("products")
    .select("*, inventory(on_hand, reserved, low_stock_threshold)")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(error.message);
  return (data as ProductRow[]).map(toAdminProduct);
}

export async function getProduct(slug: string): Promise<AdminProduct | null> {
  const { data, error } = await client()
    .from("products")
    .select("*, inventory(on_hand, reserved, low_stock_threshold)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toAdminProduct(data as ProductRow) : null;
}

export async function listBundles(): Promise<AdminBundle[]> {
  const { data, error } = await client()
    .from("bundles")
    .select("*, bundle_items(quantity, products(slug))")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(error.message);
  return (data as Record<string, unknown>[]).map((r) => ({
    slug: r.slug as string,
    name: r.name as string,
    description: (r.description as string) ?? "",
    bags: r.bag_count as number,
    discountPct: Math.round(Number(r.discount_rate) * 1000) / 10,
    extra: r.extra_fee_cop as number,
    fixed: r.flavors_fixed as boolean,
    items: ((r.bundle_items as { quantity: number; products: { slug: string } | null }[]) ?? [])
      .filter((i) => i.products)
      .map((i) => ({ slug: i.products!.slug, qty: i.quantity })),
    label: (r.card_label as string) ?? "",
    chip: (r.chip as string) ?? "",
    cta: (r.cta as string) ?? "",
    theme: r.theme as PackTheme,
    featured: r.featured as boolean,
    active: r.active as boolean,
    sortOrder: r.sort_order as number,
  }));
}

export async function listZones(): Promise<AdminZone[]> {
  const c = client();
  const [z, o] = await Promise.all([
    c.from("shipping_zones").select("*").order("city", { nullsFirst: true }),
    c.from("orders").select("shipping_zone"),
  ]);
  if (z.error) throw new Error(z.error.message);
  const used = new Map<string, number>();
  for (const r of (o.data ?? []) as { shipping_zone: string }[]) used.set(r.shipping_zone, (used.get(r.shipping_zone) ?? 0) + 1);
  return (z.data as Record<string, unknown>[])
    .map((r) => ({
      code: r.code as string,
      name: r.name as string,
      city: (r.city as string | null) ?? null,
      fee: r.fee_cop as number,
      freeFrom: r.free_from_cop as number,
      etaDays: r.eta_days as number,
      active: r.active as boolean,
      orders: used.get(r.code as string) ?? 0,
    }))
    .sort((a, b) => (a.code === "nacional" ? -1 : b.code === "nacional" ? 1 : a.code === "bogota" ? -1 : b.code === "bogota" ? 1 : (a.city ?? "").localeCompare(b.city ?? "", "es")));
}

export async function listMovements(limit = 25): Promise<AdminMovement[]> {
  const { data, error } = await client()
    .from("inventory_movements")
    .select("created_at, reason, on_hand_delta, reserved_delta, note, products(name), orders(reference)")
    .in("reason", ["restock", "adjustment", "sale", "return"])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as Record<string, unknown>[]).map((r) => ({
    at: r.created_at as string,
    product: (r.products as { name: string } | null)?.name ?? "—",
    reason: r.reason as string,
    onHandDelta: (r.on_hand_delta as number) ?? 0,
    reservedDelta: (r.reserved_delta as number) ?? 0,
    note: (r.note as string | null) ?? null,
    reference: (r.orders as { reference: string } | null)?.reference ?? null,
  }));
}

export async function listCustomers(q: string): Promise<AdminCustomer[]> {
  const { data, error } = await client().rpc("admin_customers", { p_q: q || null });
  if (error) throw new Error(error.message);
  return data as AdminCustomer[];
}

/** Producto del panel con la forma que usa la tienda (vistas previas). */
export function adminToFlavor(p: AdminProduct): Flavor {
  return {
    key: p.slug, name: p.name, price: p.price, category: p.category, color: p.color, ink: p.ink, photoBg: p.photoBg,
    img: p.img || "/img/logo.png", objectPosition: p.objectPosition, blend: p.blend, labelTop: p.showLabel ? p.labelTop : null,
    short: p.short, long: p.long, ingredients: p.ingredients, meta: p.meta, reviews: p.reviews, badge: p.badge || null,
    servings: p.servings, gallery: p.gallery, nutrition: p.nutrition, packEligible: p.packEligible,
  };
}

export type AdminPromo = {
  code: string;
  kind: "percent" | "free_shipping";
  percent: number | null;
  active: boolean;
  note: string | null;
  created_at: string;
  uses: number;
  pending: number;
  customers: number;
  revenue: number;
  discount: number;
  last_used: string | null;
  items: { name: string; units: number; revenue: number }[];
  cities: { city: string; orders: number }[];
};

export async function listPromos(): Promise<AdminPromo[]> {
  const { data, error } = await client().rpc("admin_promo_stats");
  if (error) throw new Error(error.message);
  return data as AdminPromo[];
}
