"use client";

import { useCart } from "./cart-context";

export function Toast() {
  const { toast } = useCart();
  if (!toast) return null;
  return (
    <div
      role="status"
      className="fixed bottom-[26px] left-1/2 z-70 -translate-x-1/2 animate-up rounded-full border-[2.5px] border-tinta bg-mostaza px-[22px] py-[13px] text-sm font-semibold text-tinta shadow-[5px_5px_0_var(--color-ciruela)]"
    >
      {toast}
    </div>
  );
}
