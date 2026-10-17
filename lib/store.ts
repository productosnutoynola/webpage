import "server-only";
import { unstable_cache } from "next/cache";
import { DEFAULT_CATALOG, type Catalog, type Flavor, type Pack, type PackTheme, type ShippingRules } from "./catalog";
import { db } from "./orders";

export const CATALOG_TAG = "catalog";

type ProductRow = {
  slug: string; name: string; price_cop: number; category: string; color_hex: string | null; ink_hex: string;
  photo_bg_hex: string; image_url: string | null; image_position: string; image_blend: boolean; show_label: boolean;
  label_top: number; short_description: string | null; description: string | null; ingredients: string | null;
  label_meta: string | null; reviews_count: number; badge: string | null; servings_label: string | null;
  gallery: { src: string; alt: string }[]; nutrition: [string, string][]; pack_eligible: boolean;
};
type BundleRow = {
  slug: string; name: string; description: string | null; bag_count: number; discount_rate: number; extra_fee_cop: number;
  flavors_fixed: boolean; card_label: string | null; chip: string | null; cta: string | null; theme: PackTheme; featured: boolean;
  bundle_items: { quantity: number; products: { slug: string; sort_order: number; active: boolean } | null }[];
};
type ZoneRow = { code: string; city: string | null; fee_cop: number; free_from_cop: number; eta_days: number };

export function toFlavor(r: ProductRow): Flavor {
  return {
    key: r.slug,
    name: r.name,
    price: r.price_cop,
    category: r.category,
    color: r.color_hex ?? "#DEA12C",
    ink: r.ink_hex,
    photoBg: r.photo_bg_hex,
    img: r.image_url || "/img/logo.png",
    objectPosition: r.image_position,
    blend: r.image_blend,
    labelTop: r.show_label ? r.label_top : null,
    short: r.short_description ?? "",
    long: r.description ?? "",
    ingredients: r.ingredients ?? "",
    meta: r.label_meta ?? "",
    reviews: r.reviews_count,
    badge: r.badge || null,
    servings: r.servings_label ?? "",
    gallery: Array.isArray(r.gallery) ? r.gallery : [],
    nutrition: Array.isArray(r.nutrition) ? r.nutrition : [],
    packEligible: r.pack_eligible,
  };
}

async function loadCatalog(): Promise<Catalog> {
  const client = db();
  if (!client) return DEFAULT_CATALOG;
  const [p, b, z] = await Promise.all([
    client.from("products").select("*").eq("active", true).order("sort_order").order("name"),
    client
      .from("bundles")
      .select("*, bundle_items(quantity, products(slug, sort_order, active))")
      .eq("active", true)
      .order("sort_order"),
    client.from("shipping_zones").select("code, city, fee_cop, free_from_cop, eta_days").eq("active", true),
  ]);
  if (p.error || b.error || z.error) {
    console.error("[store] catálogo", p.error ?? b.error ?? z.error);
    return DEFAULT_CATALOG;
  }

  const flavors = (p.data as ProductRow[]).map(toFlavor);
  const active = new Set(flavors.map((f) => f.key));
  const packs: Pack[] = [];
  for (const r of b.data as BundleRow[]) {
    let fixed: string[] | null = null;
    if (r.flavors_fixed) {
      fixed = [...r.bundle_items]
        .filter((i) => i.products)
        .sort((x, y) => x.products!.sort_order - y.products!.sort_order)
        .flatMap((i) => Array(i.quantity).fill(i.products!.slug) as string[]);
      // Un pack fijo con un sabor oculto o incompleto no se puede vender.
      if (fixed.length !== r.bag_count || fixed.some((k) => !active.has(k))) continue;
    }
    packs.push({
      key: r.slug,
      name: r.name,
      description: r.description ?? "",
      bags: r.bag_count,
      rate: Number(r.discount_rate),
      extra: r.extra_fee_cop,
      fixed,
      label: r.card_label || null,
      chip: r.chip || null,
      cta: r.cta || null,
      theme: r.theme,
      featured: r.featured,
    });
  }

  const zones = z.data as ZoneRow[];
  const rule = (r: ZoneRow) => ({ fee: r.fee_cop, freeFrom: r.free_from_cop, etaDays: r.eta_days });
  const def = zones.find((r) => r.code === "nacional");
  const shipping: ShippingRules = {
    default: def ? rule(def) : DEFAULT_CATALOG.shipping.default,
    cities: Object.fromEntries(zones.filter((r) => r.city).map((r) => [r.city!, rule(r)])),
  };

  return { flavors, packs, shipping };
}

/** Catálogo vigente (Supabase). Se refresca al guardar en el panel o cada 5 min. */
export const getCatalog = unstable_cache(loadCatalog, ["catalog-v2"], { tags: [CATALOG_TAG], revalidate: 300 });
