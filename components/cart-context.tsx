"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { MAX_QTY, findFlavor, findPack, type Catalog } from "@/lib/catalog";
import { lineId, sanitizeLines, type CartLine } from "@/lib/pricing";

const STORAGE_KEY = "nyn-cart-v1";

type CartCtx = {
  lines: CartLine[];
  /** Catálogo vigente (Supabase): productos, packs y envíos. */
  catalog: Catalog;
  hydrated: boolean;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  addFlavor: (f: string, qty?: number) => void;
  addPack: (p: string, flavors?: string[]) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  /** Pack cuyo selector de sabores está abierto. */
  picking: string | null;
  openPicker: (p: string) => void;
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

export function CartProvider({ children, catalog }: { children: React.ReactNode; catalog: Catalog }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(sanitizeLines(catalog, JSON.parse(raw)));
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
    (flavor: string, qty = 1) => {
      const f = findFlavor(catalog, flavor);
      if (!f) return;
      addLine({ kind: "flavor", flavor, qty });
      flash(qty > 1 ? `${f.name} × ${qty} agregada` : `${f.name} agregada`);
    },
    [addLine, flash, catalog],
  );

  const addPack = useCallback(
    (pack: string, flavors?: string[]) => {
      const p = findPack(catalog, pack);
      if (!p) return;
      const chosen = p.fixed ?? flavors;
      if (!chosen || chosen.length !== p.bags) return;
      addLine({ kind: "pack", pack, flavors: [...chosen], qty: 1 });
      setPicking(null);
      flash(p.rate > 0 && p.extra === 0 ? `${p.name} agregado · −${Math.round(p.rate * 100)} %` : `${p.name} agregado`);
    },
    [addLine, flash, catalog],
  );

  const openPicker = useCallback(
    (pack: string) => {
      if (findPack(catalog, pack)?.fixed) addPack(pack);
      else setPicking(pack);
    },
    [addPack, catalog],
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
      catalog,
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
    [lines, catalog, hydrated, cartOpen, addFlavor, addPack, setQty, picking, openPicker, toast, flash],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
