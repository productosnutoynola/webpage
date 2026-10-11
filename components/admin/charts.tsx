"use client";

import { useEffect, useRef, useState } from "react";
import { dayLabel, money, moneyCompact } from "@/lib/admin-format";

// Paleta del panel: un solo tono (vino) para magnitud; gris para atenuar en
// gráficas de énfasis. Validada con el validador de dataviz (ΔE CVD 35.7).
const ACCENT = "#8B2150";
const MUTED = "#C9B8BD";
const GRID = "rgba(42,16,24,.10)";
const INK_MUTED = "rgba(42,16,24,.55)";

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

type Tip = { x: number; y: number; value: string; label: string } | null;

function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-tinta/15 bg-white px-3 py-2 shadow-[0_6px_20px_rgba(42,16,24,.12)]"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      <div className="font-display text-[15px] font-extrabold text-tinta">{tip.value}</div>
      <div className="mt-0.5 text-[12px] text-tinta/60">{tip.label}</div>
    </div>
  );
}

/** Columnas por día (una serie: el título nombra la métrica, sin leyenda). */
export function DailyColumns({ data }: { data: { day: string; revenue: number; orders: number }[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<Tip>(null);
  const [hover, setHover] = useState<number | null>(null);
  const H = 220, top = 12, bottom = 26, left = 56, right = 8;
  const plotW = Math.max(0, width - left - right), plotH = H - top - bottom;
  const max = niceMax(Math.max(...data.map((d) => d.revenue), 0));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const step = data.length ? plotW / data.length : 0;
  const bw = Math.max(2, Math.min(24, step * 0.62));
  const y = (v: number) => top + plotH - (v / max) * plotH;
  const every = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(plotW / 64))));

  const show = (i: number) => {
    const d = data[i];
    setHover(i);
    setTip({
      x: left + step * i + step / 2,
      y: y(d.revenue),
      value: money(d.revenue),
      label: `${dayLabel(d.day)} · ${d.orders} ${d.orders === 1 ? "pedido" : "pedidos"}`,
    });
  };
  const hide = () => {
    setHover(null);
    setTip(null);
  };

  return (
    <div ref={ref} className="relative" onPointerLeave={hide}>
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label="Ventas por día">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={left} x2={width - right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={INK_MUTED} style={{ fontVariantNumeric: "tabular-nums" }}>
                {t === 0 ? "0" : moneyCompact(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = left + step * i + step / 2;
            const h = Math.max(0, y(0) - y(d.revenue));
            const r = Math.min(4, h, bw / 2);
            const x0 = cx - bw / 2, y0 = y(0);
            const path = h > 0
              ? `M${x0},${y0} V${y0 - h + r} Q${x0},${y0 - h} ${x0 + r},${y0 - h} H${x0 + bw - r} Q${x0 + bw},${y0 - h} ${x0 + bw},${y0 - h + r} V${y0} Z`
              : "";
            return (
              <g key={d.day}>
                {path && <path d={path} fill={ACCENT} opacity={hover === null || hover === i ? 1 : 0.55} />}
                {i % every === 0 && (
                  <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fill={INK_MUTED}>{dayLabel(d.day)}</text>
                )}
                <rect
                  x={left + step * i}
                  y={top}
                  width={step}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${dayLabel(d.day)}: ${money(d.revenue)}, ${d.orders} pedidos`}
                  onPointerMove={() => show(i)}
                  onFocus={() => show(i)}
                  onBlur={hide}
                  style={{ outline: "none" }}
                />
              </g>
            );
          })}
          <line x1={left} x2={width - right} y1={y(0)} y2={y(0)} stroke="rgba(42,16,24,.35)" strokeWidth={1} />
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  );
}

/**
 * Barras horizontales con el valor en la punta.
 * emphasizeFirst: la primera barra (el máximo) en el acento y el resto en gris.
 */
type Row = { label: string; value: number; sub?: string; tip?: string };

const FORMATS = {
  money,
  bolsas: (n: number) => `${n.toLocaleString("es-CO")} ${n === 1 ? "bolsa" : "bolsas"}`,
};

export function BarList({
  rows,
  unit = "money",
  emphasizeFirst = false,
}: {
  rows: Row[];
  unit?: keyof typeof FORMATS;
  emphasizeFirst?: boolean;
}) {
  const format = FORMATS[unit];
  const [tip, setTip] = useState<Tip>(null);
  const ref = useRef<HTMLDivElement>(null);
  const max = Math.max(...rows.map((r) => r.value), 0) || 1;
  if (!rows.length) return <p className="m-0 py-8 text-center text-sm text-tinta/50">Sin ventas en el período.</p>;

  return (
    <div ref={ref} className="relative flex flex-col gap-3" onPointerLeave={() => setTip(null)}>
      {rows.map((r, i) => {
        const pct = (r.value / max) * 100;
        const color = emphasizeFirst && i > 0 ? MUTED : ACCENT;
        const showTip = (el: HTMLElement) => {
          const box = el.getBoundingClientRect(), host = ref.current!.getBoundingClientRect();
          setTip({ x: box.left - host.left + box.width / 2, y: box.top - host.top, value: format(r.value), label: r.tip ?? r.label });
        };
        return (
          <div
            key={r.label}
            tabIndex={0}
            className="grid grid-cols-[minmax(84px,30%)_1fr] items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-vino/40"
            onPointerMove={(e) => showTip(e.currentTarget.querySelector("[data-bar]") as HTMLElement)}
            onFocus={(e) => showTip(e.currentTarget.querySelector("[data-bar]") as HTMLElement)}
            onBlur={() => setTip(null)}
          >
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-medium text-tinta">{r.label}</div>
              {r.sub && <div className="truncate text-[11.5px] text-tinta/50">{r.sub}</div>}
            </div>
            <div className="flex items-center gap-2.5">
              <div
                data-bar
                className="h-5 rounded-r-[4px]"
                style={{ width: `max(${pct * 0.78}%, 3px)`, background: color }}
              />
              <span className="shrink-0 text-[13px] font-semibold text-tinta" style={{ fontVariantNumeric: "tabular-nums" }}>
                {format(r.value)}
              </span>
            </div>
          </div>
        );
      })}
      <Tooltip tip={tip} />
    </div>
  );
}
