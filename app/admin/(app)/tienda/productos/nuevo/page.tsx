import { Crumb, Page, PageHeader } from "@/components/admin/ui";
import { ProductEditor } from "@/components/admin/product-editor";

export default function NuevoProducto() {
  return (
    <Page>
      <Crumb href="/admin/tienda/productos">Productos</Crumb>
      <PageHeader
        eyebrow="Configuración de la tienda"
        title="Agregar producto nuevo"
        intro="Sigue los 5 pasos. A la derecha ves exactamente cómo quedará en la tienda mientras escribes. Nada se publica hasta el último paso."
      />
      <ProductEditor />
    </Page>
  );
}
