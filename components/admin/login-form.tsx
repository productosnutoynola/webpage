"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "@/app/admin/actions";

const label = "mb-2 block font-mono text-[11px] uppercase tracking-[.16em] text-tinta/60";
const input = "w-full rounded-xl border-2 border-tinta/20 bg-crema/40 px-4 py-3.5 text-[15px] outline-none focus:border-vino";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null });
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <label htmlFor="email" className={label}>Correo electrónico</label>
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={state.email} placeholder="admin@correo.com" className={input} />
      </div>
      <div>
        <label htmlFor="password" className={label}>Contraseña</label>
        <div className="relative">
          <input id="password" name="password" autoFocus={Boolean(state.error)} type={show ? "text" : "password"} autoComplete="current-password" required className={`${input} pr-12`} />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-tinta/50 hover:text-vino"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
              {show && <path d="M3 3l18 18" />}
            </svg>
          </button>
        </div>
      </div>
      {state.error && (
        <p role="alert" className="m-0 rounded-xl bg-rosa/60 px-4 py-2.5 text-sm font-medium text-ciruela">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 w-full rounded-xl border-2 border-tinta bg-ciruela py-4 font-mono text-[13px] font-medium uppercase tracking-[.2em] text-crema shadow-[4px_4px_0_var(--color-tinta)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--color-tinta)] disabled:opacity-60"
      >
        {pending ? "Verificando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
