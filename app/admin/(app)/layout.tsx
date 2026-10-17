import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { AdminSidebar } from "@/components/admin/sidebar";

// Siempre por solicitud: depende de la cookie de sesión.
export const dynamic = "force-dynamic";

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin");
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminSidebar email={admin} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
