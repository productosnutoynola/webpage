import { NextResponse } from "next/server";
import { verifyEventChecksum, type TransactionStatus, type WompiEvent } from "@/lib/wompi";
import { applyTransaction } from "@/lib/orders";

export const runtime = "nodejs";

/** Webhook de eventos de Wompi. Configurar en el panel: <sitio>/api/wompi/events */
export async function POST(req: Request) {
  const secret = process.env.WOMPI_EVENTS_SECRET;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 503 });

  let evt: WompiEvent;
  try {
    evt = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!verifyEventChecksum(evt, secret)) {
    return NextResponse.json({ error: "invalid checksum" }, { status: 401 });
  }

  if (evt.event === "transaction.updated") {
    const t = (evt.data as { transaction?: Record<string, unknown> }).transaction;
    if (t) {
      try {
        await applyTransaction({
          id: String(t.id),
          reference: String(t.reference),
          status: t.status as TransactionStatus,
          amountInCents: Number(t.amount_in_cents),
          paymentMethodType: (t.payment_method_type as string) ?? null,
        });
      } catch (e) {
        console.error("[wompi/events]", e);
        return NextResponse.json({ error: "db" }, { status: 500 }); // Wompi reintenta
      }
    }
  }
  return NextResponse.json({ ok: true });
}
