import { NextResponse } from "next/server";
import { checkPromo } from "@/lib/orders";

export const runtime = "nodejs";

/** Valida un código promocional para mostrar el descuento en el checkout. El cobro lo recalcula place_order. */
export async function POST(req: Request) {
  let code = "";
  try {
    code = String((await req.json()).code ?? "").slice(0, 40);
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  try {
    const promo = await checkPromo(code);
    if (!promo) {
      await new Promise((r) => setTimeout(r, 500)); // frena pruebas de códigos al azar
      return NextResponse.json({ error: "Este código no existe o ya no está activo." }, { status: 404 });
    }
    return NextResponse.json({ promo });
  } catch {
    return NextResponse.json({ error: "No pudimos validar el código. Intenta de nuevo." }, { status: 503 });
  }
}
