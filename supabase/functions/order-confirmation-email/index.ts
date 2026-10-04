// Envía el correo de confirmación de un pedido pagado.
// Lo invoca el trigger orders_confirmation_email (pg_net) con { order_id }.
//
// Secretos (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY        obligatorio — https://resend.com/api-keys
//   EMAIL_FROM            remitente, p. ej. compras@productosnutoynola.com (dominio
//                         verificado en Resend). Si es solo la dirección se envía
//                         como "Nuto & Nola <dirección>". Sin él se usa
//                         onboarding@resend.dev, que solo entrega al dueño de la cuenta.
//   ORDER_NOTIFY_EMAIL    opcional — copia oculta para la tienda
//
// verify_jwt = false: el cuerpo solo trae el UUID del pedido (no adivinable), la
// función relee todo desde la base y envía como máximo un correo por pedido pagado.
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE = "https://www.productosnutoynola.com";
const C = { crema: "#FBF3E4", ciruela: "#5F1637", vino: "#8B2150", mostaza: "#DEA12C", rosa: "#EFB0CB", tinta: "#2A1018" };
const METHOD: Record<string, string> = {
  CARD: "Tarjeta", PSE: "PSE", NEQUI: "Nequi",
  BANCOLOMBIA_TRANSFER: "Botón Bancolombia", BANCOLOMBIA_QR: "QR Bancolombia",
};
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const SENDER_NAME = "Nuto & Nola";

/** Acepta "correo@dominio" o "Nombre <correo@dominio>" y siempre devuelve el segundo formato. */
function sender(): string {
  const raw = (Deno.env.get("EMAIL_FROM") ?? "").trim();
  if (!raw) return `${SENDER_NAME} <onboarding@resend.dev>`;
  return raw.includes("<") ? raw : `${SENDER_NAME} <${raw}>`;
}

const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");
const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

type Order = {
  id: string; reference: string; status: string; ship_name: string; ship_phone: string; ship_city: string;
  ship_region: string; ship_address: string; ship_notes: string | null; gross_cop: number; discount_cop: number;
  shipping_cop: number; total_cop: number; created_at: string; confirmation_email_sent_at: string | null;
  customers: { email: string } | null; shipping_zones: { eta_days: number } | null;
  order_items: { name: string; flavors: string[]; quantity: number; line_total_cop: number; kind: string }[];
  payments: { status: string; payment_method: string | null }[];
};

const FLAVOR_NAME: Record<string, string> = { "cinnamon-roll": "Cinnamon Roll", "melted-cocoa": "Melted Cocoa", berries: "Berries" };

function render(o: Order) {
  const first = o.ship_name.split(" ")[0] || o.ship_name;
  const eta = new Date(new Date(o.created_at).getTime() + (o.shipping_zones?.eta_days ?? 2) * 86400000);
  const etaTxt = `${eta.getUTCDate()} de ${MESES[eta.getUTCMonth()]}`;
  const method = o.payments.find((p) => p.status === "APPROVED")?.payment_method;
  const methodTxt = method ? METHOD[method] ?? method : "Wompi";
  const items = o.order_items.map((i) => {
    const detail = i.kind === "bundle" ? i.flavors.map((f) => FLAVOR_NAME[f] ?? f).join(" · ") : "";
    return { label: `${i.quantity} × ${i.name}`, detail, amount: i.line_total_cop };
  });

  const row = (l: string, r: string, color = C.tinta, bold = false) =>
    `<tr><td style="padding:6px 0;font-size:14px;color:${color};${bold ? "font-weight:700;" : ""}">${l}</td>` +
    `<td align="right" style="padding:6px 0;font-size:14px;color:${color};font-family:'Courier New',monospace;${bold ? "font-weight:700;" : ""}">${r}</td></tr>`;

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pedido ${esc(o.reference)}</title></head>
<body style="margin:0;padding:0;background:${C.crema};font-family:Arial,Helvetica,sans-serif;color:${C.tinta};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.crema};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
  <tr><td style="background:${C.ciruela};color:${C.rosa};font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;text-align:center;padding:10px;border:2px solid ${C.tinta};border-bottom:0;border-radius:16px 16px 0 0;">Gracias por tu compra ✳</td></tr>
  <tr><td style="background:#ffffff;border:2px solid ${C.tinta};border-radius:0 0 16px 16px;padding:28px;">
    <table role="presentation" width="100%"><tr>
      <td width="64"><img src="${SITE}/img/logo.png" width="56" height="56" alt="Nuto &amp; Nola" style="display:block;border-radius:12px;border:2px solid ${C.tinta};"></td>
      <td style="padding-left:12px;"><div style="font-size:20px;font-weight:800;color:${C.tinta};">Nuto &amp; Nola</div>
      <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#8a7a7e;text-transform:uppercase;">granola de verdad</div></td>
    </tr></table>
    <h1 style="margin:24px 0 8px;font-size:28px;line-height:1.1;color:${C.vino};">¡Pedido confirmado!</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4a3a3f;">Hola ${esc(first)}, recibimos tu pago. Te escribimos por WhatsApp cuando el mensajero salga.</p>
    <table role="presentation" width="100%" style="background:${C.rosa};border:2px solid ${C.tinta};border-radius:12px;"><tr>
      <td style="padding:14px 16px;"><div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.ciruela};">Número de pedido (order ID)</div>
      <div style="font-size:20px;font-weight:800;color:${C.ciruela};margin-top:2px;">${esc(o.reference)}</div></td>
      <td align="right" style="padding:14px 16px;"><div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.ciruela};">Entrega estimada</div>
      <div style="font-size:16px;font-weight:800;color:${C.ciruela};margin-top:2px;">${etaTxt}</div></td>
    </tr></table>
    <table role="presentation" width="100%" style="margin-top:20px;border-top:2px dashed #e3d6c8;">
      ${items.map((i) => `<tr><td style="padding:10px 0 2px;font-size:14px;">${esc(i.label)}${i.detail ? `<div style="font-size:12px;color:#8a7a7e;">${esc(i.detail)}</div>` : ""}</td><td align="right" valign="top" style="padding:10px 0 2px;font-size:14px;font-family:'Courier New',monospace;">${money(i.amount)}</td></tr>`).join("")}
    </table>
    <table role="presentation" width="100%" style="margin-top:12px;border-top:2px dashed #e3d6c8;padding-top:6px;">
      ${row("Subtotal", money(o.gross_cop), "#4a3a3f")}
      ${o.discount_cop > 0 ? row("Descuento packs", "−" + money(o.discount_cop), C.vino) : ""}
      ${row(`Envío · ${esc(o.ship_city)}`, o.shipping_cop === 0 ? "Gratis" : money(o.shipping_cop), "#4a3a3f")}
      <tr><td colspan="2" style="border-top:2px solid ${C.tinta};padding-top:4px;"></td></tr>
      ${row("Total pagado", money(o.total_cop), C.vino, true)}
    </table>
    <table role="presentation" width="100%" style="margin-top:20px;background:${C.crema};border-radius:12px;"><tr><td style="padding:14px 16px;font-size:13px;line-height:1.6;color:#4a3a3f;">
      <strong style="color:${C.tinta};">Enviamos a:</strong> ${esc(o.ship_address)}, ${esc(o.ship_city)}, ${esc(o.ship_region)}<br>
      ${o.ship_notes ? `<strong style="color:${C.tinta};">Indicaciones:</strong> ${esc(o.ship_notes)}<br>` : ""}
      <strong style="color:${C.tinta};">Pago:</strong> ${esc(methodTxt)}
    </td></tr></table>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#4a3a3f;">¿Dudas con tu pedido? Escríbenos por
      <a href="https://wa.me/573014373392" style="color:${C.vino};font-weight:700;">WhatsApp</a> o a
      <a href="mailto:productosnutoynola@gmail.com" style="color:${C.vino};font-weight:700;">productosnutoynola@gmail.com</a>
      con tu número de pedido.</p>
  </td></tr>
  <tr><td align="center" style="padding:16px;font-family:'Courier New',monospace;font-size:11px;color:#8a7a7e;">© 2026 Nuto &amp; Nola · <a href="${SITE}" style="color:#8a7a7e;">productosnutoynola.com</a></td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    `¡Pedido confirmado! Hola ${first}, recibimos tu pago.`,
    ``,
    `Número de pedido (order ID): ${o.reference}`,
    `Entrega estimada: ${etaTxt}`,
    ``,
    ...items.map((i) => `${i.label}${i.detail ? ` (${i.detail})` : ""}: ${money(i.amount)}`),
    ``,
    `Subtotal: ${money(o.gross_cop)}`,
    ...(o.discount_cop > 0 ? [`Descuento packs: −${money(o.discount_cop)}`] : []),
    `Envío (${o.ship_city}): ${o.shipping_cop === 0 ? "Gratis" : money(o.shipping_cop)}`,
    `Total pagado: ${money(o.total_cop)}`,
    ``,
    `Enviamos a: ${o.ship_address}, ${o.ship_city}, ${o.ship_region}`,
    `Pago: ${methodTxt}`,
    ``,
    `Dudas: WhatsApp +57 301 437 3392 · productosnutoynola@gmail.com`,
  ].join("\n");

  return { html, text, subject: `Pedido confirmado ${o.reference} · Nuto & Nola` };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  let orderId: string;
  try {
    orderId = String((await req.json()).order_id ?? "");
  } catch {
    return json({ error: "bad json" }, 400);
  }
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return json({ error: "order_id inválido" }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // Reclama el envío de forma atómica: solo una invocación gana.
  const { data: claimed, error: claimErr } = await db
    .from("orders")
    .update({ confirmation_email_sent_at: new Date().toISOString(), confirmation_email_error: null })
    .eq("id", orderId)
    .eq("status", "paid")
    .is("confirmation_email_sent_at", null)
    .select("id");
  if (claimErr) return json({ error: claimErr.message }, 500);
  if (!claimed?.length) return json({ skipped: "pedido no pagado o correo ya enviado" });

  const fail = async (msg: string, status: number) => {
    await db.from("orders").update({ confirmation_email_sent_at: null, confirmation_email_error: msg }).eq("id", orderId);
    console.error(`[order-confirmation-email] ${orderId}: ${msg}`);
    return json({ error: msg }, status);
  };

  const { data, error } = await db
    .from("orders")
    .select(
      "id, reference, status, ship_name, ship_phone, ship_city, ship_region, ship_address, ship_notes, gross_cop, discount_cop, " +
        "shipping_cop, total_cop, created_at, confirmation_email_sent_at, customers(email), shipping_zones(eta_days), " +
        "order_items(name, flavors, quantity, line_total_cop, kind), payments(status, payment_method)",
    )
    .eq("id", orderId)
    .single();
  if (error || !data) return fail(error?.message ?? "pedido no encontrado", 500);
  const order = data as unknown as Order;
  const to = order.customers?.email;
  if (!to) return fail("pedido sin correo de cliente", 422);

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return fail("RESEND_API_KEY no configurada en los secretos de Edge Functions", 503);

  const { html, text, subject } = render(order);
  const bcc = Deno.env.get("ORDER_NOTIFY_EMAIL");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: sender(),
      to: [to],
      ...(bcc ? { bcc: [bcc] } : {}),
      reply_to: "productosnutoynola@gmail.com",
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) return fail(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`, 502);

  return json({ sent: true, to, reference: order.reference });
});
