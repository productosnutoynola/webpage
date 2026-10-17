import "server-only";
import { unstable_cache } from "next/cache";
import { SHIPPING, type ShippingRules } from "./catalog";
import { db } from "./orders";

/**
 * Tarifas de envío vigentes según la tabla shipping_zones de Supabase (la misma
 * que usa create_order para cobrar). Caché de 60 s; si la base no responde se
 * usan los valores por defecto de catalog.ts.
 */
export const getShippingRules = unstable_cache(
  async (): Promise<ShippingRules> => {
    const client = db();
    if (!client) return SHIPPING;
    const { data, error } = await client.from("shipping_zones").select("code, fee_cop, free_from_cop").eq("active", true);
    if (error || !data) {
      console.error("[shipping]", error);
      return SHIPPING;
    }
    const rule = (code: keyof ShippingRules) => {
      const z = data.find((r) => r.code === code);
      return z ? { fee: z.fee_cop as number, freeFrom: z.free_from_cop as number } : SHIPPING[code];
    };
    return { bogota: rule("bogota"), nacional: rule("nacional") };
  },
  ["shipping-rules"],
  { revalidate: 60 },
);
