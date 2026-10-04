import { NextResponse } from "next/server";
import { fetchTransaction } from "@/lib/wompi";
import { applyTransaction, getOrderSummary } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tras la redirección de Wompi: consulta el estado real de la transacción,
 * lo aplica en Supabase (respaldo del webhook) y devuelve el pedido guardado,
 * incluido su order_id.
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
  if (!id || !/^[\w-]{1,64}$/.test(id) || !publicKey) {
    return NextResponse.json({ error: "Transacción inválida." }, { status: 400 });
  }
  const tx = await fetchTransaction(publicKey, id);
  if (!tx) return NextResponse.json({ error: "No encontramos la transacción." }, { status: 404 });
  try {
    await applyTransaction(tx);
  } catch (e) {
    console.error("[orders]", e);
  }
  const order = tx.status === "APPROVED" ? await getOrderSummary(tx.reference) : null;
  return NextResponse.json({ ...tx, order });
}
