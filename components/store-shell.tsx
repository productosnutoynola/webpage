import { CartProvider } from "./cart-context";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { CartDrawer } from "./cart-drawer";
import { PackPicker } from "./pack-picker";
import { Toast } from "./toast";
import { BrandPattern } from "./brand-pattern";
import { getCatalog } from "@/lib/store";

/** Estructura de la tienda: marca de agua, encabezado, carrito y pie de página. */
export async function StoreShell({ children }: { children: React.ReactNode }) {
  const catalog = await getCatalog();
  return (
    <>
      <BrandPattern />
      <CartProvider catalog={catalog}>
        <div className="flex min-h-screen flex-col overflow-x-clip">
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
        <CartDrawer />
        <PackPicker />
        <Toast />
      </CartProvider>
    </>
  );
}
