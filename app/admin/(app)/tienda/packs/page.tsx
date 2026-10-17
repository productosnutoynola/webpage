import { adminToFlavor, listBundles, listProducts, type AdminBundle, type AdminProduct } from "@/lib/admin-store";
import { LoadError, Page, PageHeader } from "@/components/admin/ui";
import { NewPackButton, PackEditor } from "@/components/admin/pack-editor";

export const dynamic = "force-dynamic";

export default async function Packs() {
  let bundles: AdminBundle[], products: AdminProduct[];
  try {
    [bundles, products] = await Promise.all([listBundles(), listProducts()]);
  } catch (e) {
    return <Page><LoadError error={e} /></Page>;
  }
  // Para packs: productos publicados y habilitados para packs.
  const flavors = products.filter((p) => p.active && p.packEligible).map(adminToFlavor);

  return (
    <Page>
      <PageHeader
        eyebrow="Configuración de la tienda"
        title="Combos y packs"
        intro="Define cuántas bolsas lleva cada pack, el descuento y si el cliente escoge los sabores. El precio se calcula solo con los precios de los productos."
      />
      <div className="mt-6">
        <NewPackButton products={flavors} />
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {bundles.map((b) => (
          <PackEditor key={b.slug} bundle={b} products={flavors} />
        ))}
      </div>
    </Page>
  );
}
