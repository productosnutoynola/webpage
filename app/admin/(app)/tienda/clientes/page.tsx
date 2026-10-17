import { listCustomers, type AdminCustomer } from "@/lib/admin-store";
import { money } from "@/lib/pricing";
import { LoadError, Page, PageHeader, btnPrimary, btnSecondary, card, input } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", year: "numeric" }) : "—";

export default async function Clientes({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").slice(0, 60);
  let rows: AdminCustomer[];
  try {
    rows = await listCustomers(q);
  } catch (e) {
    return <Page><LoadError error={e} /></Page>;
  }
  const buyers = rows.filter((r) => r.orders > 0);
  const total = buyers.reduce((a, r) => a + r.spent, 0);

  return (
    <Page>
      <PageHeader
        eyebrow="Configuración de la tienda"
        title="Clientes"
        intro="Quienes han dejado sus datos en el checkout. «Compras» cuenta solo pedidos con pago aprobado."
        action={
          <a href={`/admin/tienda/clientes/csv${q ? `?q=${encodeURIComponent(q)}` : ""}`} className={btnSecondary}>
            Descargar CSV
          </a>
        }
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ["Clientes registrados", rows.length.toLocaleString("es-CO")],
          ["Con al menos una compra", buyers.length.toLocaleString("es-CO")],
          ["Total comprado", money(total)],
        ].map(([l, v]) => (
          <div key={l} className={`${card} p-5`}>
            <div className="font-mono text-[10.5px] uppercase tracking-[.16em] text-tinta/55">{l}</div>
            <div className="mt-2 font-display text-[28px] font-extrabold leading-none">{v}</div>
          </div>
        ))}
      </div>
      <form className="mt-6 flex flex-wrap gap-2" action="/admin/tienda/clientes">
        <input name="q" defaultValue={q} placeholder="Buscar por nombre, correo, celular o cédula" aria-label="Buscar clientes" className={`${input} max-w-[420px]`} />
        <button className={btnPrimary}>Buscar</button>
        {q && <a href="/admin/tienda/clientes" className={btnSecondary}>Limpiar</a>}
      </form>
      <div className={`${card} mt-4 overflow-x-auto`}>
        <table className="w-full min-w-[860px] border-collapse text-left text-[13.5px]">
          <thead>
            <tr className="border-b-2 border-tinta/10 font-mono text-[10.5px] uppercase tracking-[.12em] text-tinta/55">
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Contacto</th>
              <th className="px-4 py-3 font-medium">Ciudad</th>
              <th className="px-4 py-3 text-right font-medium">Compras</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Última compra</th>
              <th className="px-4 py-3 font-medium">Desde</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.email} className="border-b border-tinta/5 align-top last:border-0">
                <td className="px-4 py-3">
                  <div className="font-semibold">{c.full_name}</div>
                  {c.legal_id && <div className="text-[12px] text-tinta/50">CC {c.legal_id}</div>}
                </td>
                <td className="px-4 py-3">
                  <a href={`mailto:${c.email}`} className="block text-vino">{c.email}</a>
                  {c.phone && (
                    <a href={`https://wa.me/57${c.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="text-[12.5px] text-tinta/60">
                      WhatsApp {c.phone}
                    </a>
                  )}
                </td>
                <td className="px-4 py-3">{c.city ?? "—"}</td>
                <td className="px-4 py-3 text-right font-mono">{c.orders}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold">{money(c.spent)}</td>
                <td className="whitespace-nowrap px-4 py-3">{day(c.last_order_at)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-tinta/60">{day(c.created_at)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-tinta/50">{q ? "No encontramos clientes con esa búsqueda." : "Aún no hay clientes."}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
