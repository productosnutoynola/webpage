import { listMovements, listProducts, type AdminMovement, type AdminProduct } from "@/lib/admin-store";
import { LoadError, Page, PageHeader, card } from "@/components/admin/ui";
import { StockRow } from "@/components/admin/stock-row";

export const dynamic = "force-dynamic";

const REASON: Record<string, string> = { restock: "Ingreso", adjustment: "Corrección", sale: "Venta", return: "Devolución" };
const when = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default async function Inventario() {
  let products: AdminProduct[], moves: AdminMovement[];
  try {
    [products, moves] = await Promise.all([listProducts(), listMovements(25)]);
  } catch (e) {
    return <Page><LoadError error={e} /></Page>;
  }
  return (
    <Page>
      <PageHeader
        eyebrow="Configuración de la tienda"
        title="Inventario"
        intro="Disponibles = en bodega menos reservadas. Las reservadas son bolsas de pedidos que se están pagando; se liberan solas si el pago no se completa."
      />
      <div className="mt-7 flex flex-col gap-3">
        {products.map((p) => (
          <StockRow key={p.slug} p={{ slug: p.slug, name: p.name, color: p.color, active: p.active, onHand: p.stock.onHand, reserved: p.stock.reserved, threshold: p.stock.threshold }} />
        ))}
      </div>

      <h2 className="mb-3 mt-10 font-display text-[22px] font-extrabold">Movimientos recientes</h2>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[620px] border-collapse text-left text-[13.5px]">
          <thead>
            <tr className="border-b-2 border-tinta/10 font-mono text-[10.5px] uppercase tracking-[.12em] text-tinta/55">
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 text-right font-medium">Bolsas</th>
              <th className="px-4 py-3 font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {moves.map((m, i) => (
              <tr key={i} className="border-b border-tinta/5 last:border-0">
                <td className="whitespace-nowrap px-4 py-2.5 text-tinta/65">{when(m.at)}</td>
                <td className="px-4 py-2.5 font-semibold">{m.product}</td>
                <td className="px-4 py-2.5">{REASON[m.reason] ?? m.reason}</td>
                <td className={`px-4 py-2.5 text-right font-mono font-semibold ${m.onHandDelta > 0 ? "text-[#2F7D4F]" : m.onHandDelta < 0 ? "text-[#B42318]" : ""}`}>
                  {m.onHandDelta > 0 ? `+${m.onHandDelta}` : m.onHandDelta}
                </td>
                <td className="px-4 py-2.5 text-tinta/60">{m.reference ? `Pedido #${m.reference}` : m.note ?? ""}</td>
              </tr>
            ))}
            {moves.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-tinta/50">Sin movimientos todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
