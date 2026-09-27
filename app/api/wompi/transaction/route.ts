import { NextResponse } from "next/server";
import { fetchTransaction } from "@/lib/wompi";
import { applyTransaction } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Consulta el estado real de una transacción en Wompi (tras la redirección). */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
  if (!id || !/^[\w-]{1,64}$/.test(id) || !publicKey) {
    return NextResponse.json({ error: "Transacción inválida." }, { status: 400 });
  }
  const tx = await fetchTransaction(publicKey, id);
  if (!tx) return NextResponse.json({ error: "No encontramos la transacción." }, { status: 404 });
  // Respaldo del webhook: el estado viene de Wompi, no del cliente.
  try {
    await applyTransaction(tx);
  } catch (e) {
    console.error("[orders]", e);
  }
  return NextResponse.json(tx);
}
