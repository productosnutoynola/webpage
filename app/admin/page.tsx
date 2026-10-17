import Image from "next/image";
import { redirect } from "next/navigation";
import { adminConfigured, getAdminSession } from "@/lib/admin-auth";
import { LoginForm } from "@/components/admin/login-form";
import { LoginFrame } from "@/components/admin/login-frame";

export const dynamic = "force-dynamic";

export default async function AdminLogin() {
  if (await getAdminSession()) redirect("/admin/panel");
  return (
    <LoginFrame>
    <main className="flex flex-col items-center px-5 py-16 sm:py-20">
      <Image src="/img/logo.png" alt="" width={64} height={64} priority className="size-16 rounded-2xl border-2 border-tinta" />
      <div className="mt-4 font-display text-[22px] font-extrabold tracking-[-.02em]">Nuto &amp; Nola</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[.2em] text-tinta/50">granola de verdad</div>

      <div className="mt-10 w-full max-w-[460px] rounded-[22px] border-2 border-tinta bg-white p-8 shadow-[6px_6px_0_var(--color-rosa)] sm:p-10">
        <h1 className="m-0 font-display text-[32px] font-extrabold leading-none tracking-[-.03em]">Administración</h1>
        <p className="mb-7 mt-3 text-[15px] leading-relaxed text-tinta/65">
          Ingresa tus credenciales de administrador para acceder al panel.
        </p>
        {adminConfigured() ? (
          <LoginForm />
        ) : (
          <p role="alert" className="rounded-xl border-2 border-tinta bg-rosa px-4 py-3 text-sm text-ciruela">
            El acceso no está configurado. Faltan las variables ADMIN_EMAIL, ADMIN_PASSWORD_HASH y ADMIN_SESSION_SECRET.
          </p>
        )}
      </div>
    </main>
    </LoginFrame>
  );
}
