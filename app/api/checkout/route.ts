import { NextResponse } from "next/server";
import { computeTotals, sanitizeLines } from "@/lib/pricing";
import { parseCustomer, resolvePlace, validateCustomer } from "@/lib/customer";
import { buildCheckoutUrl, newReference } from "@/lib/wompi";
import { createOrder } from "@/lib/orders";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
  if (!publicKey || !integritySecret) {
    return NextResponse.json({ error: "Los pagos aún no están configurados. Escríbenos por WhatsApp para completar tu pedido." }, { status: 503 });
  }

  let body: { lines?: unknown; customer?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const lines = sanitizeLines(body.lines);
  if (lines.length === 0) return NextResponse.json({ error: "Tu carrito está vacío." }, { status: 400 });

  const f = parseCustomer(body.customer);
  const missing = validateCustomer(f);
  if (missing.length) return NextResponse.json({ error: `Nos falta ${missing.join(", ")}.` }, { status: 400 });

  const { city, region } = resolvePlace(f);
  const totals = computeTotals(lines, f.ciudad);
  const reference = newReference();
  const phone = f.celular.replace(/\D/g, "").replace(/^57(?=\d{10}$)/, "");

  try {
    await createOrder({
      reference,
      customer: { name: f.nombre, legalId: f.cedula, email: f.correo, phone },
      shipping: { city, region, neighborhood: f.barrio, address: f.direccion, notes: f.notas },
      lines,
      totals,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No pudimos registrar tu pedido. Intenta de nuevo en un momento." }, { status: 500 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const url = buildCheckoutUrl({
    publicKey,
    integritySecret,
    reference,
    amountInCents: totals.total * 100,
    redirectUrl: `${origin}/pedido`,
    customer: { email: f.correo, fullName: f.nombre, phone, legalId: f.cedula.replace(/\D/g, "") || undefined },
    shipping: { address: [f.direccion, f.barrio].filter(Boolean).join(", "), city, region, phone },
  });

  return NextResponse.json({ url, reference, lines, totals, city });
}
