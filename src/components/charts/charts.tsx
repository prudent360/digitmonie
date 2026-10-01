"use client";

import { useId, useState } from "react";
import { formatCompactNaira, formatNairaWhole, formatNumber } from "@/lib/format";

/** Server pages can't pass functions to client components, so charts take a format key. */
export type ValueFormat = "naira" | "count";
const FORMATS: Record<ValueFormat, { value: (v: number) => string; axis: (v: number) => string }> = {
  naira: { value: formatNairaWhole, axis: formatCompactNaira },
  count: { value: formatNumber, axis: (v) => new Intl.NumberFormat("en-NG", { notation: "compact" }).format(v) },
};

type Point = { label: string; value: number };
type Pair = { label: string; inflow: number; outflow: number };

const W = 640;
const PAD = { top: 16, right: 12, bottom: 28, left: 56 };

function niceMax(max: number) {
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  return Math.ceil(max / exp) * exp;
}

/** `x` is in viewBox units; `yPct` is a percentage of the chart height. */
function Tooltip({ x, yPct, children, width }: { x: number; yPct: number; width: number; children: React.ReactNode }) {
  const left = Math.min(Math.max(x, 70), width - 70);
  return (
    <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-lg" style={{ left: `${(left / W) * 100}%`, top: `calc(${yPct}% - 10px)` }}>
      {children}
    </div>
  );
}

/** Single-series area chart with a crosshair tooltip. */
export function AreaChart({ data, valueFormat = "naira", height = 240 }: { data: Point[]; valueFormat?: ValueFormat; height?: number }) {
  const { value: format, axis: axisFormat } = FORMATS[valueFormat];
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const innerW = W - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const min = 0;
  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const x = (i: number) => PAD.left + (i / (data.length - 1)) * innerW;
  const y = (v: number) => PAD.top + innerH - ((v - min) / (max - min)) * innerH;
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.value)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${PAD.top + innerH} L${x(0)},${PAD.top + innerH} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + t * (max - min));

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.left) / innerW) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full touch-none" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Area chart">
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-series-1)" stopOpacity=".22" />
            <stop offset="100%" stopColor="var(--color-series-1)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeDasharray={t === 0 ? undefined : "3 4"} />
            <text x={PAD.left - 10} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-muted text-[11px]">{axisFormat(t)}</text>
          </g>
        ))}
        {data.map((d, i) => (
          <text key={d.label} x={x(i)} y={height - 8} textAnchor="middle" className="fill-muted text-[11px]">{d.label}</text>
        ))}
        <path d={area} fill={`url(#${id}-fill)`} className="rise-in" />
        <path d={line} fill="none" stroke="var(--color-series-1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="draw-line" style={{ strokeDasharray: 2000, strokeDashoffset: 2000 }} />
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--color-muted)" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(data[hover].value)} r="5" fill="var(--color-series-1)" stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover !== null && (
        <Tooltip x={x(hover)} yPct={(y(data[hover].value) / height) * 100} width={W}>
          <p className="text-white/60">{data[hover].label}</p>
          <p className="font-bold tabular-nums">{format(data[hover].value)}</p>
        </Tooltip>
      )}
    </div>
  );
}

/** Two-series grouped bars (e.g. money in vs money out) with legend and per-group tooltip. */
export function GroupedBars({ data, labels, valueFormat = "naira", height = 240 }: { data: Pair[]; labels: [string, string]; valueFormat?: ValueFormat; height?: number }) {
  const { value: format, axis: axisFormat } = FORMATS[valueFormat];
  const [hover, setHover] = useState<number | null>(null);
  const innerW = W - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(...data.flatMap((d) => [d.inflow, d.outflow])));
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const band = innerW / data.length;
  const barW = Math.min(22, band * 0.28);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

  const bar = (x: number, v: number, color: string, delay: number) => {
    const top = y(v);
    const h = PAD.top + innerH - top;
    const r = Math.min(4, h);
    return <path className="grow-y" style={{ animationDelay: `${delay}ms` }} d={`M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${top + h} Z`} fill={color} />;
  };

  return (
    <div>
      <div className="mb-3 flex gap-4 px-1 text-xs font-medium text-body">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-series-1" />{labels[0]}</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-series-2" />{labels[1]}</span>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label={`${labels[0]} and ${labels[1]} by month`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeDasharray={t === 0 ? undefined : "3 4"} />
              <text x={PAD.left - 10} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-muted text-[11px]">{axisFormat(t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = PAD.left + band * i + band / 2;
            return (
              <g key={d.label} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
                <rect x={PAD.left + band * i} y={PAD.top} width={band} height={innerH} fill={hover === i ? "var(--color-canvas)" : "transparent"} />
                {bar(cx - barW - 1, d.inflow, "var(--color-series-1)", i * 60)}
                {bar(cx + 1, d.outflow, "var(--color-series-2)", i * 60 + 30)}
                <text x={cx} y={height - 8} textAnchor="middle" className="fill-muted text-[11px]">{d.label}</text>
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <Tooltip x={PAD.left + band * hover + band / 2} yPct={(y(Math.max(data[hover].inflow, data[hover].outflow)) / height) * 100} width={W}>
            <p className="text-white/60">{data[hover].label}</p>
            <p className="tabular-nums"><span className="mr-1.5 inline-block size-2 rounded-sm bg-series-1" />{labels[0]}: <b>{format(data[hover].inflow)}</b></p>
            <p className="tabular-nums"><span className="mr-1.5 inline-block size-2 rounded-sm bg-series-2" />{labels[1]}: <b>{format(data[hover].outflow)}</b></p>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

const DONUT_COLORS = ["var(--color-series-1)", "var(--color-series-2)", "var(--color-series-3)", "var(--color-series-4)"];

/** Up to four categories; legend carries labels and values so colour is never the only cue. */
export function Donut({ data, centerLabel, valueFormat = "naira" }: { data: Point[]; centerLabel: string; valueFormat?: ValueFormat }) {
  const format = valueFormat === "naira" ? formatCompactNaira : FORMATS[valueFormat].value;
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const R = 70;
  const C = 2 * Math.PI * R;
  const GAP = 3;
  const offsets = data.map((_, i) => data.slice(0, i).reduce((sum, d) => sum + (d.value / total) * C, 0));

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row lg:flex-col xl:flex-row">
      <div className="relative size-44 shrink-0">
        <svg viewBox="0 0 180 180" className="size-full -rotate-90" role="img" aria-label={`${centerLabel} breakdown`}>
          {data.map((d, i) => {
            const len = (d.value / total) * C;
            return (
              <circle key={d.label} cx="90" cy="90" r={R} fill="none" stroke={DONUT_COLORS[i]} strokeWidth={hover === i ? 22 : 18}
                strokeDasharray={`${Math.max(0, len - GAP)} ${C}`} strokeDashoffset={-offsets[i]} className="cursor-pointer transition-[stroke-width]"
                onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] text-muted">{hover === null ? centerLabel : data[hover].label}</span>
          <span className="font-display text-lg font-bold tabular-nums text-ink">{format(hover === null ? total : data[hover].value)}</span>
          {hover !== null && <span className="text-[11px] font-semibold text-muted">{((data[hover].value / total) * 100).toFixed(1)}%</span>}
        </div>
      </div>
      <ul className="w-full space-y-2.5">
        {data.map((d, i) => (
          <li key={d.label} className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1 text-sm transition-colors ${hover === i ? "bg-canvas" : ""}`} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
            <span className="flex items-center gap-2 text-body"><span className="size-2.5 rounded-sm" style={{ background: DONUT_COLORS[i] }} />{d.label}</span>
            <span className="font-semibold tabular-nums text-ink">{((d.value / total) * 100).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
