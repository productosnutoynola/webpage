"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkCredentials, createSessionToken, getAdminSession, SESSION_COOKIE } from "@/lib/admin-auth";
import { resendShippedEmail, setOrderStatus, TransitionError } from "@/lib/admin-data";
import { findCarrier } from "@/lib/carriers";

export type LoginState = { error: string | null; email?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (!checkCredentials(email, password)) {
    await new Promise((r) => setTimeout(r, 700)); // frena intentos por fuerza bruta
    return { error: "Correo o contraseña incorrectos.", email };
  }
  const { token, maxAge } = createSessionToken(email);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge,
  });
  redirect("/admin/panel");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin");
}

export type StatusState = { error: string | null; ok: boolean };

export async function updateOrderStatus(_prev: StatusState, form: FormData): Promise<StatusState> {
  if (!(await getAdminSession())) redirect("/admin");
  const reference = String(form.get("reference") ?? "");
  const status = String(form.get("status") ?? "");
  const tracking = String(form.get("tracking") ?? "").trim().slice(0, 80);
  const carrierName = String(form.get("carrier") ?? "");
  if (!/^\d{10}$/.test(reference) || (status !== "shipped" && status !== "delivered")) {
    return { error: "Solicitud inválida.", ok: false };
  }
  if (status === "shipped") {
    const carrier = findCarrier(carrierName);
    if (!carrier) return { error: "Elige la empresa transportadora.", ok: false };
    if (carrier.needsTracking && !/^[A-Za-z0-9-]{4,40}$/.test(tracking)) {
      return { error: "Escribe el número de guía (solo letras, números o guiones).", ok: false };
    }
  }
  try {
    await setOrderStatus(reference, status, tracking, status === "shipped" ? carrierName : undefined);
  } catch (e) {
    return { error: e instanceof TransitionError ? e.message : "No se pudo actualizar. Intenta de nuevo.", ok: false };
  }
  revalidatePath("/admin/panel");
  return { error: null, ok: true };
}

export async function resendShipped(_prev: StatusState, form: FormData): Promise<StatusState> {
  if (!(await getAdminSession())) redirect("/admin");
  const reference = String(form.get("reference") ?? "");
  if (!/^\d{10}$/.test(reference)) return { error: "Solicitud inválida.", ok: false };
  try {
    await resendShippedEmail(reference);
  } catch (e) {
    return { error: e instanceof TransitionError ? e.message : "No se pudo reenviar.", ok: false };
  }
  revalidatePath("/admin/panel");
  return { error: null, ok: true };
}
