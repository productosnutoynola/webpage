import { getAdminSession } from "@/lib/admin-auth";
import { listCustomers } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Evita fórmulas al abrir en Excel/Sheets.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET(req: Request) {
  if (!(await getAdminSession())) return new Response("No autorizado", { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 60);
  const rows = await listCustomers(q);
  const head = ["Nombre", "Correo", "Celular", "Cédula", "Ciudad", "Compras", "Total comprado", "Última compra", "Cliente desde"];
  const body = rows.map((c) =>
    [c.full_name, c.email, c.phone, c.legal_id, c.city, c.orders, c.spent, c.last_order_at?.slice(0, 10), c.created_at.slice(0, 10)].map(cell).join(","),
  );
  return new Response("﻿" + [head.map(cell).join(","), ...body].join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="clientes-nuto-nola-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
