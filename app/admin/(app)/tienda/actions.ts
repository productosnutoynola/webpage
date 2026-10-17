"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/orders";
import { CATALOG_TAG } from "@/lib/store";
import type { PackTheme } from "@/lib/catalog";

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const BUCKET = "productos";
const HEX = /^#[0-9A-Fa-f]{6}$/;
const THEMES: PackTheme[] = ["crema", "mostaza", "rosa", "ciruela"];

async function guard() {
  if (!(await getAdminSession())) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
  const c = db();
  if (!c) throw new Error("Supabase no está configurado.");
  return c;
}

/** La tienda se actualiza de inmediato tras cada cambio. */
function refreshStore() {
  revalidateTag(CATALOG_TAG);
  revalidatePath("/", "layout");
}

async function run<T extends object>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

export async function slugify(text: string): Promise<string> {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const int = (v: unknown, min: number, max: number, label: string) => {
  const n = Number(v);
  if (!Number.isFinite(n) || Math.round(n) !== n || n < min || n > max) throw new Error(`${label}: escribe un número entero entre ${min.toLocaleString("es-CO")} y ${max.toLocaleString("es-CO")}.`);
  return n;
};
const hex = (v: unknown, label: string) => {
  const s = String(v ?? "");
  if (!HEX.test(s)) throw new Error(`${label}: el color debe tener el formato #RRGGBB.`);
  return s.toUpperCase();
};
const imgUrl = (v: unknown, label: string) => {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (s.startsWith("/img/")) return s;
  const base = process.env.SUPABASE_URL ?? "";
  if (base && s.startsWith(`${base}/storage/v1/object/public/${BUCKET}/`)) return s;
  throw new Error(`${label}: la foto debe subirse desde el panel.`);
};

// ---------------------------------------------------------------- fotos

/** Sube una foto (ya comprimida en el navegador) al bucket público. */
export async function uploadImage(form: FormData): Promise<Result<{ url: string }>> {
  return run(async () => {
    const c = await guard();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("No recibimos la foto.");
    const types: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    const ext = types[file.type];
    if (!ext) throw new Error("Formato no soportado. Usa JPG, PNG o WebP.");
    if (file.size > 5 * 1024 * 1024) throw new Error("La foto pesa más de 5 MB.");
    const path = `productos/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;
    const { error } = await c.storage
      .from(BUCKET)
      .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, cacheControl: "31536000", upsert: false });
    if (error) throw new Error(`No pudimos guardar la foto: ${error.message}`);
    return { url: c.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
  });
}

// ---------------------------------------------------------------- productos

export type ProductInput = {
  name: string;
  category: string;
  price: number;
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
  active: boolean;
  /** Solo al crear. */
  initialStock?: number;
  threshold?: number;
};

function productRow(p: ProductInput) {
  const name = str(p.name, 60);
  if (name.length < 2) throw new Error("Nombre: escribe al menos 2 letras.");
  if (!str(p.img, 600)) throw new Error("Foto principal: sube una foto del producto.");
  const pos = String(p.objectPosition ?? "50% 50%");
  if (!/^\d{1,3}% \d{1,3}%$/.test(pos)) throw new Error("Encuadre de la foto inválido.");
  const gallery = (Array.isArray(p.gallery) ? p.gallery : []).slice(0, 4).map((g, i) => ({ src: imgUrl(g.src, `Foto adicional ${i + 1}`), alt: str(g.alt, 120) })).filter((g) => g.src);
  const nutrition = (Array.isArray(p.nutrition) ? p.nutrition : [])
    .slice(0, 12)
    .map(([k, v]) => [str(k, 40), str(v, 40)] as [string, string])
    .filter(([k, v]) => k && v);
  return {
    name,
    category: str(p.category, 30) || "Granola",
    price_cop: int(p.price, 1000, 5_000_000, "Precio"),
    short_description: str(p.short, 220),
    description: str(p.long, 1500),
    ingredients: str(p.ingredients, 600),
    image_url: imgUrl(p.img, "Foto principal"),
    photo_bg_hex: hex(p.photoBg, "Fondo de la foto"),
    image_position: pos,
    image_blend: Boolean(p.blend),
    show_label: Boolean(p.showLabel),
    label_top: int(p.labelTop, 10, 90, "Altura de la etiqueta"),
    color_hex: hex(p.color, "Color de la etiqueta"),
    ink_hex: hex(p.ink, "Color del texto de la etiqueta"),
    label_meta: str(p.meta, 24) || null,
    badge: str(p.badge, 24) || null,
    reviews_count: int(p.reviews ?? 0, 0, 100000, "Reseñas"),
    servings_label: str(p.servings, 60) || null,
    gallery,
    nutrition,
    pack_eligible: Boolean(p.packEligible),
    active: Boolean(p.active),
  };
}

export async function createProduct(p: ProductInput): Promise<Result<{ slug: string }>> {
  return run(async () => {
    const c = await guard();
    const row = productRow(p);
    const base = (await slugify(row.name)) || "producto";
    let slug = base;
    for (let i = 2; ; i++) {
      const { data } = await c.from("products").select("slug").eq("slug", slug).maybeSingle();
      if (!data) break;
      slug = `${base}-${i}`;
    }
    const { data: last } = await c.from("products").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const sku = `NYN-${slug.toUpperCase().replace(/-/g, "").slice(0, 10)}-${randomUUID().slice(0, 4).toUpperCase()}`;
    const { data: created, error } = await c
      .from("products")
      .insert({ ...row, slug, sku, sort_order: ((last as { sort_order: number } | null)?.sort_order ?? 0) + 1 })
      .select("id")
      .single();
    if (error) throw new Error(`No pudimos crear el producto: ${error.message}`);
    const stock = int(p.initialStock ?? 0, 0, 100000, "Stock inicial");
    const threshold = int(p.threshold ?? 10, 0, 100000, "Alerta de stock bajo");
    await c.from("inventory").insert({ product_id: (created as { id: string }).id, on_hand: 0, low_stock_threshold: threshold });
    if (stock > 0) {
      const r = await c.rpc("restock", { p_slug: slug, p_qty: stock, p_note: "Stock inicial (panel)" });
      if (r.error) throw new Error(`El producto se creó, pero no pudimos cargar el stock: ${r.error.message}`);
    }
    refreshStore();
    return { slug };
  });
}

export async function updateProduct(slug: string, p: ProductInput): Promise<Result> {
  return run(async () => {
    const c = await guard();
    const { error, count } = await c.from("products").update(productRow(p), { count: "exact" }).eq("slug", slug);
    if (error) throw new Error(`No pudimos guardar: ${error.message}`);
    if (!count) throw new Error("El producto ya no existe.");
    refreshStore();
    return {};
  });
}

export async function setProductActive(slug: string, active: boolean): Promise<Result> {
  return run(async () => {
    const c = await guard();
    const { error } = await c.from("products").update({ active }).eq("slug", slug);
    if (error) throw new Error(error.message);
    refreshStore();
    return {};
  });
}

/** Sube o baja un producto en el orden de la tienda. */
export async function moveProduct(slug: string, dir: -1 | 1): Promise<Result> {
  return run(async () => {
    const c = await guard();
    const { data, error } = await c.from("products").select("slug, sort_order").order("sort_order").order("name");
    if (error) throw new Error(error.message);
    const list = data as { slug: string; sort_order: number }[];
    const i = list.findIndex((r) => r.slug === slug);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return {};
    [list[i], list[j]] = [list[j], list[i]];
    for (let k = 0; k < list.length; k++) {
      if (list[k].sort_order !== k + 1) await c.from("products").update({ sort_order: k + 1 }).eq("slug", list[k].slug);
    }
    refreshStore();
    return {};
  });
}

// ---------------------------------------------------------------- packs

export type BundleInput = {
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
};

export async function saveBundle(slug: string | null, b: BundleInput): Promise<Result<{ slug: string }>> {
  return run(async () => {
    const c = await guard();
    const name = str(b.name, 60);
    if (name.length < 2) throw new Error("Nombre del pack: escribe al menos 2 letras.");
    const bags = int(b.bags, 1, 24, "Número de bolsas");
    const pct = Number(b.discountPct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 90) throw new Error("Descuento: escribe un porcentaje entre 0 y 90.");
    const theme = THEMES.includes(b.theme) ? b.theme : "crema";
    const items = (b.items ?? []).filter((i) => i.qty > 0).map((i) => ({ slug: String(i.slug), qty: int(i.qty, 1, 24, "Cantidad") }));
    if (b.fixed && items.reduce((a, i) => a + i.qty, 0) !== bags) {
      throw new Error(`Los sabores del pack deben sumar ${bags} ${bags === 1 ? "bolsa" : "bolsas"}.`);
    }
    const row = {
      name,
      description: str(b.description, 300),
      bag_count: bags,
      discount_rate: Math.round(pct * 10) / 1000,
      extra_fee_cop: int(b.extra ?? 0, 0, 1_000_000, "Cargo adicional"),
      flavors_fixed: Boolean(b.fixed),
      card_label: str(b.label, 30) || null,
      chip: str(b.chip, 16) || null,
      cta: str(b.cta, 40) || null,
      theme,
      featured: Boolean(b.featured),
      active: Boolean(b.active),
    };

    let id: string;
    if (slug) {
      const { data, error } = await c.from("bundles").update(row).eq("slug", slug).select("id").single();
      if (error) throw new Error(`No pudimos guardar el pack: ${error.message}`);
      id = (data as { id: string }).id;
    } else {
      const base = (await slugify(name)) || "pack";
      let s = base;
      for (let i = 2; ; i++) {
        const { data } = await c.from("bundles").select("slug").eq("slug", s).maybeSingle();
        if (!data) break;
        s = `${base}-${i}`;
      }
      const { data: last } = await c.from("bundles").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
      const { data, error } = await c
        .from("bundles")
        .insert({ ...row, slug: s, sort_order: ((last as { sort_order: number } | null)?.sort_order ?? 0) + 1 })
        .select("id")
        .single();
      if (error) throw new Error(`No pudimos crear el pack: ${error.message}`);
      id = (data as { id: string }).id;
      slug = s;
    }

    // Solo un pack destacado en la portada.
    if (row.featured) await c.from("bundles").update({ featured: false }).neq("id", id);

    await c.from("bundle_items").delete().eq("bundle_id", id);
    if (row.flavors_fixed && items.length) {
      const { data: prods } = await c.from("products").select("id, slug").in("slug", items.map((i) => i.slug));
      const ids = new Map(((prods ?? []) as { id: string; slug: string }[]).map((p) => [p.slug, p.id]));
      const { error } = await c.from("bundle_items").insert(items.map((i) => ({ bundle_id: id, product_id: ids.get(i.slug), quantity: i.qty })));
      if (error) throw new Error(`No pudimos guardar los sabores del pack: ${error.message}`);
    }
    refreshStore();
    return { slug };
  });
}

// ---------------------------------------------------------------- envíos

export type ZoneInput = { code: string | null; city: string | null; fee: number; freeFrom: number; etaDays: number; active: boolean };

export async function saveZone(z: ZoneInput): Promise<Result<{ code: string }>> {
  return run(async () => {
    const c = await guard();
    const row = {
      fee_cop: int(z.fee, 0, 1_000_000, "Valor del envío"),
      free_from_cop: int(z.freeFrom, 0, 50_000_000, "Envío gratis desde"),
      eta_days: int(z.etaDays, 0, 60, "Días de entrega"),
      active: z.code === "nacional" ? true : Boolean(z.active),
    };
    if (z.code) {
      const { error } = await c.from("shipping_zones").update(row).eq("code", z.code);
      if (error) throw new Error(error.message);
      refreshStore();
      return { code: z.code };
    }
    const city = str(z.city, 80);
    if (!city) throw new Error("Elige la ciudad.");
    const { data: exists } = await c.from("shipping_zones").select("code").eq("city", city).maybeSingle();
    if (exists) throw new Error(`${city} ya tiene una tarifa propia; edítala en la lista.`);
    const code = `ciudad-${await slugify(city)}`;
    const { error } = await c.from("shipping_zones").insert({ ...row, code, name: city, city });
    if (error) throw new Error(error.message);
    refreshStore();
    return { code };
  });
}

/** Borra una tarifa por ciudad; si ya tiene pedidos, solo la desactiva. */
export async function deleteZone(code: string): Promise<Result<{ deactivated: boolean }>> {
  return run(async () => {
    const c = await guard();
    if (code === "nacional" || code === "bogota") throw new Error("Esta tarifa es obligatoria; puedes cambiar su valor.");
    const { error } = await c.from("shipping_zones").delete().eq("code", code);
    if (error) {
      const r = await c.from("shipping_zones").update({ active: false }).eq("code", code);
      if (r.error) throw new Error(r.error.message);
      refreshStore();
      return { deactivated: true };
    }
    refreshStore();
    return { deactivated: false };
  });
}

// ---------------------------------------------------------------- inventario

export async function addStock(slug: string, qty: number, note: string): Promise<Result> {
  return run(async () => {
    const c = await guard();
    const n = int(qty, 1, 100000, "Bolsas a sumar");
    const { error } = await c.rpc("restock", { p_slug: slug, p_qty: n, p_note: str(note, 120) || "Ingreso desde el panel" });
    if (error) throw new Error(error.message);
    refreshStore();
    return {};
  });
}

export async function setStock(slug: string, onHand: number, note: string): Promise<Result> {
  return run(async () => {
    const c = await guard();
    const n = int(onHand, 0, 100000, "Stock contado");
    const { error } = await c.rpc("set_stock", { p_slug: slug, p_on_hand: n, p_note: str(note, 120) || null });
    if (error) {
      if (error.message === "BELOW_RESERVED") throw new Error(`No puedes dejar menos de ${error.details} bolsas: están reservadas en pedidos en curso.`);
      throw new Error(error.message);
    }
    refreshStore();
    return {};
  });
}

export async function setThreshold(slug: string, threshold: number): Promise<Result> {
  return run(async () => {
    const c = await guard();
    const n = int(threshold, 0, 100000, "Alerta de stock bajo");
    const { data: p } = await c.from("products").select("id").eq("slug", slug).single();
    const { error } = await c.from("inventory").update({ low_stock_threshold: n }).eq("product_id", (p as { id: string }).id);
    if (error) throw new Error(error.message);
    return {};
  });
}
