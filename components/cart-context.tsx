"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { FLAVORS, MAX_QTY, PACKS, type FlavorKey, type PackKey } from "@/lib/catalog";
import { lineId, sanitizeLines, type CartLine } from "@/lib/pricing";

const STORAGE_KEY = "nyn-cart-v1";

type CartCtx = {
  lines: CartLine[];
  hydrated: boolean;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  addFlavor: (f: FlavorKey, qty?: number) => void;
  addPack: (p: PackKey, flavors?: FlavorKey[]) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  /** Pack cuyo selector de sabores está abierto. */
  picking: PackKey | null;
  openPicker: (p: PackKey) => void;
  closePicker: () => void;
  toast: string | null;
  flash: (msg: string) => void;
};

const Ctx = createContext<CartCtx | null>(null);

export function useCart(): CartCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart fuera de CartProvider");
  return c;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [picking, setPicking] = useState<PackKey | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(sanitizeLines(JSON.parse(raw)));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {}
  }, [lines, hydrated]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const addLine = useCallback((line: CartLine) => {
    setLines((prev) => {
      const id = lineId(line);
      const i = prev.findIndex((l) => lineId(l) === id);
      if (i === -1) return [...prev, line];
      const next = [...prev];
      next[i] = { ...next[i], qty: Math.min(MAX_QTY, next[i].qty + line.qty) };
      return next;
    });
    setCartOpen(true);
  }, []);

  const addFlavor = useCallback(
    (flavor: FlavorKey, qty = 1) => {
      addLine({ kind: "flavor", flavor, qty });
      flash(qty > 1 ? `${FLAVORS[flavor].name} × ${qty} agregada` : `${FLAVORS[flavor].name} agregada`);
    },
    [addLine, flash],
  );

  const addPack = useCallback(
    (pack: PackKey, flavors?: FlavorKey[]) => {
      const p = PACKS[pack];
      const chosen = p.fixed ?? flavors;
      if (!chosen || chosen.length !== p.bags) return;
      addLine({ kind: "pack", pack, flavors: [...chosen], qty: 1 });
      setPicking(null);
      flash(p.rate > 0 && pack !== "regalo" ? `${p.name} agregado · −${Math.round(p.rate * 100)} %` : `${p.name} agregada`);
    },
    [addLine, flash],
  );

  const openPicker = useCallback(
    (pack: PackKey) => {
      if (PACKS[pack].fixed) addPack(pack);
      else setPicking(pack);
    },
    [addPack],
  );

  const setQty = useCallback((id: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => lineId(l) !== id)
        : prev.map((l) => (lineId(l) === id ? { ...l, qty: Math.min(MAX_QTY, qty) } : l)),
    );
  }, []);

  const value = useMemo<CartCtx>(
    () => ({
      lines,
      hydrated,
      cartOpen,
      setCartOpen,
      addFlavor,
      addPack,
      setQty,
      clear: () => setLines([]),
      picking,
      openPicker,
      closePicker: () => setPicking(null),
      toast,
      flash,
    }),
    [lines, hydrated, cartOpen, addFlavor, addPack, setQty, picking, openPicker, toast, flash],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
