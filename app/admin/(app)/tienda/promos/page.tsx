import { listPromos, type AdminPromo } from "@/lib/admin-store";
import { money } from "@/lib/pricing";
import { LoadError, Page, PageHeader, card } from "@/components/admin/ui";
import { CopyCode, NewPromo, PromoToggle } from "@/components/admin/promo-editor";

export const dynamic = "force-dynamic";

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", year: "numeric" }) : "—";
const label = (p: AdminPromo) => (p.kind === "percent" ? `${p.percent} % de descuento` : "Envío gratis");

export default async function Promos() {
  let promos: AdminPromo[];
  try {
    promos = await listPromos();
  } catch (e) {
    return <Page><LoadError error={e} /></Page>;
  }
  const sum = (k: "uses" | "revenue" | "discount") => promos.reduce((a, p) => a + p[k], 0);

  return (
    <Page>
      <PageHeader
        eyebrow="Configuración de la tienda"
        title="Códigos promocionales"
        intro="Crea códigos de descuento o envío gratis para tus campañas. El cliente los escribe en el checkout y el valor a pagar en Wompi se actualiza solo."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {[
          ["Códigos activos", `${promos.filter((p) => p.active).length} de ${promos.length}`],
          ["Compras con código", sum("uses").toLocaleString("es-CO")],
          ["Ventas con código", money(sum("revenue"))],
          ["Descuento otorgado", money(sum("discount"))],
        ].map(([l, v]) => (
          <div key={l} className={`${card} p-5`}>
            <div className="font-mono text-[10.5px] uppercase tracking-[.16em] text-tinta/55">{l}</div>
            <div className="mt-2 font-display text-[26px] font-extrabold leading-none">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <NewPromo />
      </div>

      <h2 className="mb-3 mt-10 font-display text-[22px] font-extrabold">Tus códigos</h2>
      {promos.length === 0 && <p className="text-tinta/55">Aún no has creado códigos.</p>}
      <div className="flex flex-col gap-4">
        {promos.map((p) => (
          <article key={p.code} className={`${card} p-5 sm:p-6 ${p.active ? "" : "opacity-75"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-xl border-2 border-dashed border-tinta bg-mostaza px-3 py-1.5 font-mono text-[18px] font-bold tracking-[.08em]">{p.code}</span>
                <CopyCode code={p.code} />
                <span className="rounded-full bg-ciruela px-3 py-1 text-[12.5px] font-bold text-rosa">{label(p)}</span>
                {p.note && <span className="text-[13px] text-tinta/55">{p.note}</span>}
              </div>
              <PromoToggle code={p.code} active={p.active} />
            </div>

            <dl className="m-0 mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["Compras", p.uses.toLocaleString("es-CO")],
                ["Clientes", p.customers.toLocaleString("es-CO")],
                ["Ventas", money(p.revenue)],
                ["Descuento dado", money(p.discount)],
                ["Ticket promedio", p.uses ? money(Math.round(p.revenue / p.uses)) : "—"],
                ["Último uso", day(p.last_used)],
              ].map(([l, v]) => (
                <div key={l}>
                  <dt className="font-mono text-[10px] uppercase tracking-[.14em] text-tinta/50">{l}</dt>
                  <dd className="m-0 mt-1 font-display text-[19px] font-extrabold">{v}</dd>
                </div>
              ))}
            </dl>

            {(p.items.length > 0 || p.pending > 0) && (
              <div className="mt-5 grid gap-5 border-t border-dashed border-tinta/15 pt-4 sm:grid-cols-2">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[.14em] text-tinta/50">Productos comprados con el código</div>
                  <ul className="m-0 mt-2 list-none p-0 text-[13.5px]">
                    {p.items.map((i) => (
                      <li key={i.name} className="flex justify-between gap-3 py-0.5">
                        <span>{i.units} × {i.name}</span>
                        <span className="font-mono text-tinta/60">{money(i.revenue)}</span>
                      </li>
                    ))}
                    {p.items.length === 0 && <li className="text-tinta/50">Sin compras pagadas todavía.</li>}
                  </ul>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[.14em] text-tinta/50">Ciudades</div>
                  <div className="mt-2 text-[13.5px]">{p.cities.length ? p.cities.map((c) => `${c.city} (${c.orders})`).join(" · ") : "—"}</div>
                  {p.pending > 0 && (
                    <p className="m-0 mt-3 text-[12.5px] text-tinta/55">
                      {p.pending} {p.pending === 1 ? "pedido" : "pedidos"} con el código esperando pago.
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="mt-4 text-[12px] text-tinta/45">Creado el {day(p.created_at)}</div>
          </article>
        ))}
      </div>
    </Page>
  );
}
