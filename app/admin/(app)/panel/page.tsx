import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { getDashboard, listOrders, ORDER_TABS, RANGES, type AdminOrder, type OrderStatus, type OrderTab, type Range } from "@/lib/admin-data";
import { findFlavor } from "@/lib/catalog";
import { getCatalog } from "@/lib/store";
import { BarList, DailyColumns } from "@/components/admin/charts";
import { dayLabel, money } from "@/lib/admin-format";
import { OrderActions } from "@/components/admin/order-actions";
import { logout } from "../../actions";

export const dynamic = "force-dynamic";

type SP = Promise<{ rango?: string; pedidos?: string; q?: string }>;

const STATUS: Record<OrderStatus, { label: string; icon: string; color: string }> = {
  pending_payment: { label: "Pendiente de pago", icon: "○", color: "#8A7A7E" },
  paid: { label: "Pagado · por despachar", icon: "●", color: "#B77B12" },
  preparing: { label: "En preparación", icon: "●", color: "#B77B12" },
  shipped: { label: "Enviado", icon: "➜", color: "#2F5D8C" },
  delivered: { label: "Entregado", icon: "✓", color: "#2F7D4F" },
  payment_failed: { label: "Pago rechazado", icon: "✕", color: "#B42318" },
  cancelled: { label: "Cancelado", icon: "✕", color: "#8A7A7E" },
  needs_review: { label: "Revisar", icon: "!", color: "#B42318" },
};

const METHOD: Record<string, string> = {
  CARD: "Tarjeta", PSE: "PSE", NEQUI: "Nequi", BANCOLOMBIA_TRANSFER: "Botón Bancolombia", BANCOLOMBIA_QR: "QR Bancolombia",
};
const PAY: Record<string, string> = { APPROVED: "Aprobado", DECLINED: "Rechazado", ERROR: "Error", VOIDED: "Anulado", PENDING: "Pendiente" };

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });


const card = "rounded-[20px] border-2 border-tinta bg-white p-6";
const eyebrow = "font-mono text-[10.5px] uppercase tracking-[.16em] text-tinta/55";

export default async function Panel({ searchParams }: { searchParams: SP }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin");

  const sp = await searchParams;
  const range: Range = RANGES.some((r) => r.key === sp.rango) ? (sp.rango as Range) : "30";
  const tab: OrderTab = sp.pedidos && sp.pedidos in ORDER_TABS ? (sp.pedidos as OrderTab) : "despachar";
  const q = (sp.q ?? "").slice(0, 60);
  const href = (p: Partial<{ rango: string; pedidos: string; q: string }>) => {
    const u = new URLSearchParams({ rango: range, pedidos: tab, ...(q ? { q } : {}), ...p });
    if (!u.get("q")) u.delete("q");
    return `/admin/panel?${u}`;
  };

  let dash, orders: AdminOrder[], catalog;
  try {
    [dash, orders, catalog] = await Promise.all([getDashboard(range), listOrders(tab, q), getCatalog()]);
  } catch (e) {
    return (
      <main className="mx-auto max-w-[760px] px-5 py-20 text-center">
        <h1 className="font-display text-3xl font-extrabold">No pudimos cargar los datos</h1>
        <p className="mt-3 text-tinta/60">{e instanceof Error ? e.message : "Error desconocido"}</p>
      </main>
    );
  }

  const cat = catalog;
  const flavorName = (s: string) => findFlavor(cat, s)?.name ?? s;
  const k = dash.kpis;
  const st = dash.status;
  const count = (keys: readonly OrderStatus[]) => keys.reduce((a, s) => a + (st[s] ?? 0), 0);
  const top = dash.by_flavor[0];
  const share = dash.bags ? Math.round(((top?.bags ?? 0) / dash.bags) * 100) : 0;
  const cities = dash.by_city.length > 8
    ? [...dash.by_city.slice(0, 7), dash.by_city.slice(7).reduce((a, c) => ({ city: "Otras ciudades", region: `${dash.by_city.length - 7} ciudades`, revenue: a.revenue + c.revenue, orders: a.orders + c.orders }), { city: "", region: "", revenue: 0, orders: 0 })]
    : dash.by_city;
  const maxStock = Math.max(...dash.inventory.map((i) => i.on_hand), 1);
  const periodLabel = range === "all" ? "todo el histórico" : `últimos ${range} días`;

  return (
    <main className="mx-auto max-w-[1320px] px-5 pb-20 pt-10 sm:px-8">
      {/* Encabezado + filtros (una sola fila, por encima de todo lo que afectan) */}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex items-center gap-4">
          <Image src="/img/logo.png" alt="" width={52} height={52} className="size-[52px] rounded-xl border-2 border-tinta" />
          <div>
            <h1 className="m-0 font-display text-[clamp(26px,3vw,34px)] font-extrabold leading-none tracking-[-.03em]">Resumen de la operación</h1>
            <p className="m-0 mt-1.5 text-[13.5px] text-tinta/60">
              {dayLabel(dash.from)} – {dayLabel(dash.to)} · sesión de {admin}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <nav aria-label="Período" className="flex rounded-xl border-2 border-tinta bg-white p-1">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={href({ rango: r.key })}
                aria-current={r.key === range ? "page" : undefined}
                className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold ${r.key === range ? "bg-ciruela text-crema hover:text-crema" : "text-tinta hover:bg-rosa/40 hover:text-tinta"}`}
              >
                {r.label}
              </Link>
            ))}
          </nav>
          <form action={logout} className="lg:hidden">
            <button className="rounded-xl border-2 border-tinta/25 px-4 py-2 font-mono text-[11px] uppercase tracking-[.14em] text-tinta/70 hover:border-tinta hover:text-tinta">
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      {/* KPIs */}
      <section aria-label="Indicadores" className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div className="col-span-2 rounded-[20px] border-2 border-tinta bg-ciruela p-6 text-crema shadow-[4px_4px_0_var(--color-rosa)] lg:col-span-1">
          <div className="font-mono text-[10.5px] uppercase tracking-[.16em] text-rosa">Ventas · {periodLabel}</div>
          <div className="mt-3 font-display text-[clamp(36px,4.4vw,52px)] font-extrabold leading-none tracking-[-.03em]">{money(k.revenue)}</div>
          <div className="mt-2 text-[13px] text-rosa/90">Descuentos {money(k.discounts)} · Envíos {money(k.shipping)}</div>
        </div>
        {[
          ["Pedidos pagados", k.orders.toLocaleString("es-CO")],
          ["Ticket promedio", money(k.avg_ticket)],
          ["Bolsas vendidas", dash.bags.toLocaleString("es-CO")],
          ["Clientes", k.customers.toLocaleString("es-CO")],
        ].map(([l, v]) => (
          <div key={l} className={card}>
            <div className={eyebrow}>{l}</div>
            <div className="mt-3 font-display text-[30px] font-extrabold leading-none tracking-[-.02em]">{v}</div>
          </div>
        ))}
      </section>

      {/* Estado de la operación (histórico completo) */}
      <section aria-label="Estado de los pedidos" className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {(
          [
            ["despachar", "Por despachar", count(["paid", "preparing"]), "paid"],
            ["enviados", "En camino", count(["shipped"]), "shipped"],
            ["entregados", "Entregados", count(["delivered"]), "delivered"],
            ["otros", "Pendientes de pago", count(["pending_payment"]), "pending_payment"],
            ["otros", "Rechazados / revisión", count(["payment_failed", "needs_review", "cancelled"]), "payment_failed"],
          ] as [OrderTab, string, number, OrderStatus][]
        ).map(([t, l, n, s]) => (
          <Link key={l} href={href({ pedidos: t }) + "#pedidos"} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-tinta/15 bg-white px-4 py-3.5 text-tinta hover:border-tinta hover:text-tinta">
            <span className="flex items-center gap-2 text-[13px] font-medium">
              <span aria-hidden="true" style={{ color: STATUS[s].color }}>{STATUS[s].icon}</span>
              {l}
            </span>
            <span className="font-display text-[22px] font-extrabold">{n}</span>
          </Link>
        ))}
      </section>

      {/* Ventas por día + producto más vendido */}
      <section className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className={card}>
          <div className={eyebrow}>Ventas por día</div>
          <h2 className="m-0 mt-1 font-display text-xl font-extrabold">Ingresos diarios (COP)</h2>
          <div className="mt-5">
            <DailyColumns data={dash.by_day} />
          </div>
          <details className="mt-3 text-[13px]">
            <summary className="cursor-pointer text-vino">Ver tabla</summary>
            <table className="mt-3 w-full text-left" style={{ fontVariantNumeric: "tabular-nums" }}>
              <thead className="text-tinta/55"><tr><th className="py-1 font-medium">Día</th><th className="font-medium">Pedidos</th><th className="text-right font-medium">Ventas</th></tr></thead>
              <tbody>
                {dash.by_day.filter((d) => d.orders > 0).reverse().map((d) => (
                  <tr key={d.day} className="border-t border-tinta/10"><td className="py-1.5">{dayLabel(d.day)}</td><td>{d.orders}</td><td className="text-right">{money(d.revenue)}</td></tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>

        <div className={card}>
          <div className={eyebrow}>Producto más vendido</div>
          {top && top.bags > 0 ? (
            <>
              <h2 className="m-0 mt-1 font-display text-[26px] font-extrabold leading-tight">{top.name}</h2>
              <p className="m-0 mt-1 text-[13.5px] text-tinta/60">
                {top.bags} bolsas · {share} % de las {dash.bags} bolsas vendidas (incluye las de packs)
              </p>
            </>
          ) : (
            <h2 className="m-0 mt-1 font-display text-xl font-extrabold">Aún sin ventas</h2>
          )}
          <div className="mt-5">
            <BarList
              emphasizeFirst
              unit="bolsas"
              rows={dash.by_flavor.map((f) => ({
                label: f.name,
                value: f.bags,
                tip: `${f.name} · ${dash.bags ? Math.round((f.bags / dash.bags) * 100) : 0} % del total`,
              }))}
            />
          </div>
        </div>
      </section>

      {/* Ciudades + productos/packs + inventario */}
      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className={card}>
          <div className={eyebrow}>Ventas por ciudad</div>
          <h2 className="m-0 mt-1 font-display text-xl font-extrabold">¿Dónde se vende?</h2>
          <div className="mt-5">
            <BarList
              rows={cities.map((c) => {
                const sub = `${c.region} · ${c.orders} ${c.orders === 1 ? "pedido" : "pedidos"}`;
                return { label: c.city, value: c.revenue, sub, tip: `${c.city} · ${sub}` };
              })}
            />
          </div>
        </div>

        <div className={card}>
          <div className={eyebrow}>Ventas por producto y pack</div>
          <h2 className="m-0 mt-1 font-display text-xl font-extrabold">¿Qué se compra?</h2>
          {dash.by_item.length ? (
            <table className="mt-4 w-full text-left text-[13.5px]" style={{ fontVariantNumeric: "tabular-nums" }}>
              <thead className="text-[12px] text-tinta/55">
                <tr><th className="pb-2 font-medium">Producto</th><th className="pb-2 text-right font-medium">Unid.</th><th className="pb-2 text-right font-medium">Ventas</th></tr>
              </thead>
              <tbody>
                {dash.by_item.map((it) => (
                  <tr key={it.name} className="border-t border-tinta/10">
                    <td className="py-2.5">
                      <span className="font-medium">{it.name}</span>
                      <span className="ml-1.5 text-[11.5px] text-tinta/45">{it.kind === "bundle" ? "pack" : "bolsa"}</span>
                    </td>
                    <td className="py-2.5 text-right">{it.units}</td>
                    <td className="py-2.5 text-right font-semibold">{money(it.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="py-8 text-center text-sm text-tinta/50">Sin ventas en el período.</p>
          )}
        </div>

        <div className={card}>
          <div className={eyebrow}>Inventario actual</div>
          <h2 className="m-0 mt-1 font-display text-xl font-extrabold">Bolsas disponibles</h2>
          <div className="mt-5 flex flex-col gap-5">
            {dash.inventory.map((i) => (
              <div key={i.slug}>
                <div className="flex items-baseline justify-between text-[13.5px]">
                  <span className="font-medium">{i.name}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    <strong className="font-display text-lg">{i.available}</strong>
                    <span className="text-tinta/55"> / {i.on_hand}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-rosa/40">
                  <div className="h-full rounded-full" style={{ width: `${(i.available / maxStock) * 100}%`, background: i.low ? "#B42318" : "#8B2150" }} />
                </div>
                <div className="mt-1 text-[11.5px] text-tinta/55">
                  {i.reserved > 0 ? `${i.reserved} reservadas en checkout · ` : ""}
                  {i.low ? <span className="font-semibold text-[#B42318]">! Stock bajo</span> : "Stock suficiente"}
                </div>
              </div>
            ))}
          </div>
          <p className="mb-0 mt-5 text-[12px] leading-relaxed text-tinta/50">
            Para cargar stock: <code className="rounded bg-crema px-1">select public.restock(&apos;cinnamon-roll&apos;, 50, &apos;nota&apos;);</code> en el SQL Editor de Supabase.
          </p>
        </div>
      </section>

      {/* Pedidos */}
      <section id="pedidos" className="mt-10 scroll-mt-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className={eyebrow}>Pedidos</div>
            <h2 className="m-0 mt-1 font-display text-[26px] font-extrabold tracking-[-.02em]">Seguimiento de pedidos</h2>
          </div>
          <form action="/admin/panel#pedidos" className="flex gap-2">
            <input type="hidden" name="rango" value={range} />
            <input type="hidden" name="pedidos" value={tab} />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar: order ID, nombre, ciudad o celular"
              aria-label="Buscar pedidos"
              className="w-[min(320px,60vw)] rounded-xl border-2 border-tinta/20 bg-white px-4 py-2.5 text-[14px] outline-none focus:border-vino"
            />
            <button className="rounded-xl border-2 border-tinta bg-ciruela px-4 text-[13px] font-semibold text-crema">Buscar</button>
          </form>
        </div>

        <nav aria-label="Filtrar pedidos" className="mt-5 flex flex-wrap gap-2">
          {(Object.keys(ORDER_TABS) as OrderTab[]).map((t) => (
            <Link
              key={t}
              href={href({ pedidos: t }) + "#pedidos"}
              aria-current={t === tab ? "page" : undefined}
              className={`rounded-full border-2 px-4 py-1.5 text-[13px] font-semibold ${t === tab ? "border-tinta bg-tinta text-crema hover:text-crema" : "border-tinta/20 bg-white text-tinta hover:border-tinta hover:text-tinta"}`}
            >
              {ORDER_TABS[t].label} <span className="opacity-60">{count(ORDER_TABS[t].statuses)}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-5 flex flex-col gap-3">
          {orders.length === 0 && (
            <div className={`${card} text-center text-tinta/55`}>{q ? "Ningún pedido coincide con la búsqueda." : "No hay pedidos en esta categoría."}</div>
          )}
          {orders.map((o) => {
            const s = STATUS[o.status];
            const pay = o.payments.find((p) => p.status === "APPROVED") ?? o.payments[0];
            return (
              <article key={o.reference} className="rounded-[18px] border-2 border-tinta/15 bg-white p-5 hover:border-tinta/40">
                <div className="grid gap-5 lg:grid-cols-[1.1fr_1.2fr_1.4fr_1.4fr]">
                  <div>
                    <div className="font-mono text-[11px] text-tinta/50">{dateTime(o.created_at)}</div>
                    <div className="mt-1 font-display text-[19px] font-extrabold tracking-[-.01em]" style={{ fontVariantNumeric: "tabular-nums" }}>#{o.reference}</div>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-tinta/15 px-2.5 py-1 text-[12px] font-semibold">
                      <span aria-hidden="true" style={{ color: s.color }}>{s.icon}</span>
                      {s.label}
                    </div>
                    <div className="mt-2 text-[11.5px] leading-relaxed text-tinta/50">
                      {o.shipped_at && <div>Enviado {dateTime(o.shipped_at)}</div>}
                      {o.delivered_at && <div>Entregado {dateTime(o.delivered_at)}</div>}
                      {o.tracking_code && <div>Guía: <span className="font-mono text-tinta/70">{o.tracking_code}</span></div>}
                    </div>
                  </div>

                  <div className="text-[13.5px] leading-relaxed">
                    <div className={eyebrow}>Cliente</div>
                    <div className="mt-1 font-semibold">{o.ship_name}</div>
                    {o.customers?.email && <a href={`mailto:${o.customers.email}`} className="block break-all">{o.customers.email}</a>}
                    <a href={`https://wa.me/57${o.ship_phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">{o.ship_phone}</a>
                    {o.customers?.legal_id && <div className="text-tinta/55">CC/NIT {o.customers.legal_id}</div>}
                  </div>

                  <div className="text-[13.5px] leading-relaxed">
                    <div className={eyebrow}>Entrega</div>
                    <div className="mt-1">{o.ship_address}</div>
                    <div className="text-tinta/65">{o.ship_city}, {o.ship_region}</div>
                    {o.ship_notes && <div className="mt-1 text-[12.5px] italic text-tinta/55">“{o.ship_notes}”</div>}
                  </div>

                  <div className="text-[13.5px]">
                    <div className={eyebrow}>Artículos</div>
                    <ul className="m-0 mt-1 list-none space-y-1 p-0">
                      {o.order_items.map((it, i) => (
                        <li key={i} className="flex justify-between gap-3">
                          <span>
                            {it.quantity} × {it.name}
                            {it.kind === "bundle" && <span className="block text-[11.5px] text-tinta/50">{it.flavors.map(flavorName).join(" · ")}</span>}
                          </span>
                          <span className="shrink-0" style={{ fontVariantNumeric: "tabular-nums" }}>{money(it.line_total_cop)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex justify-between border-t border-tinta/10 pt-2 text-[12.5px] text-tinta/60">
                      <span>{o.discount_cop > 0 ? `Desc. −${money(o.discount_cop)} · ` : ""}Envío {o.shipping_cop ? money(o.shipping_cop) : "gratis"}</span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-[12.5px] text-tinta/60">
                        {pay ? `${METHOD[pay.payment_method ?? ""] ?? pay.payment_method ?? "Wompi"} · ${PAY[pay.status] ?? pay.status}` : "Sin pago"}
                      </span>
                      <span className="font-display text-[19px] font-extrabold text-vino">{money(o.total_cop)}</span>
                    </div>
                  </div>
                </div>
                {["paid", "preparing", "shipped"].includes(o.status) && (
                  <div className="mt-4 flex justify-end border-t border-dashed border-tinta/15 pt-4">
                    <OrderActions reference={o.reference} status={o.status} />
                  </div>
                )}
              </article>
            );
          })}
          {orders.length === 200 && <p className="text-center text-[12.5px] text-tinta/50">Mostrando los 200 más recientes. Usa la búsqueda para encontrar pedidos anteriores.</p>}
        </div>
      </section>
    </main>
  );
}
