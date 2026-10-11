import "server-only";
import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Acceso al panel /admin. Variables de entorno (solo servidor):
//   ADMIN_EMAIL            correo del administrador
//   ADMIN_PASSWORD_HASH    scrypt:N:r:p:<salt b64>:<hash b64>  (generar con `npm run admin:hash`)
//   ADMIN_SESSION_SECRET   32+ bytes aleatorios para firmar la cookie de sesión

export const SESSION_COOKIE = "nyn_admin";
const SESSION_HOURS = 12;

const b64url = (b: Buffer) => b.toString("base64url");

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

function verifyPassword(password: string, stored: string): boolean {
  const [alg, N, r, p, salt, hash] = stored.split(":");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = scryptSync(password, Buffer.from(salt, "base64"), expected.length, {
    N: Number(N), r: Number(r), p: Number(p),
  });
  return safeEqual(actual, expected);
}

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH && (process.env.ADMIN_SESSION_SECRET?.length ?? 0) >= 32);
}

export function checkCredentials(email: string, password: string): boolean {
  if (!adminConfigured()) return false;
  const emailOk = safeEqual(
    Buffer.from(email.trim().toLowerCase()),
    Buffer.from(process.env.ADMIN_EMAIL!.trim().toLowerCase()),
  );
  // Siempre se calcula el hash para no revelar por tiempo si el correo existe.
  const passOk = verifyPassword(password, process.env.ADMIN_PASSWORD_HASH!);
  return emailOk && passOk;
}

function sign(payload: string): string {
  return b64url(createHmac("sha256", process.env.ADMIN_SESSION_SECRET!).update(payload).digest());
}

export function createSessionToken(email: string): { token: string; maxAge: number } {
  const maxAge = SESSION_HOURS * 3600;
  const payload = b64url(Buffer.from(JSON.stringify({ e: email.trim().toLowerCase(), exp: Date.now() + maxAge * 1000 })));
  return { token: `${payload}.${sign(payload)}`, maxAge };
}

/** Correo del admin si la cookie es válida y vigente; null en otro caso. */
export async function getAdminSession(): Promise<string | null> {
  if (!adminConfigured()) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEqual(Buffer.from(sig), Buffer.from(sign(payload)))) return null;
  try {
    const { e, exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { e: string; exp: number };
    if (Date.now() > exp || e !== process.env.ADMIN_EMAIL!.trim().toLowerCase()) return null;
    return e;
  } catch {
    return null;
  }
}
