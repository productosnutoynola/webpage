import { notFound } from "next/navigation";
import { getProduct } from "@/lib/admin-store";
import { Crumb, LoadError, Page, PageHeader, StatusPill } from "@/components/admin/ui";
import { ProductEditor } from "@/components/admin/product-editor";

export const dynamic = "force-dynamic";

export default async function EditarProducto({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let product;
  try {
    product = await getProduct(slug);
  } catch (e) {
    return <Page><LoadError error={e} /></Page>;
  }
  if (!product) notFound();
  return (
    <Page>
      <Crumb href="/admin/tienda/productos">Productos</Crumb>
      <PageHeader
        eyebrow="Editar producto"
        title={product.name}
        intro={<>Cambia cualquier paso y pulsa <strong>Guardar cambios</strong>: la tienda se actualiza al instante. <StatusPill on={product.active} /></>}
      />
      <ProductEditor key={product.slug} product={product} />
    </Page>
  );
}
