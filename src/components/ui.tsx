import { initials } from "@/lib/format";

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <section className={`min-w-0 rounded-2xl border border-line bg-white ${className}`}>{children}</section>;
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5">
      <div>
        <h2 className="text-[15px] font-bold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const TONES = {
  neutral: "bg-canvas text-body ring-line",
  brand: "bg-brand-50 text-brand ring-brand-100",
  success: "bg-success-soft text-success ring-success/15",
  warning: "bg-warning-soft text-warning ring-warning/15",
  danger: "bg-danger-soft text-danger ring-danger/15",
  gold: "bg-gold-50 text-gold-700 ring-gold/30",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "neutral", children, dot = false }: { tone?: Tone; children: React.ReactNode; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${TONES[tone]}`}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, Tone> = {
  successful: "success", verified: "success", active: "success", approved: "success", disbursed: "brand", paid: "success",
  pending: "warning", due: "warning", maturing: "gold", upcoming: "neutral", unverified: "neutral",
  failed: "danger", rejected: "danger", declined: "danger", frozen: "danger", restricted: "warning",
};

/** A status badge: always a dot plus the word, never colour alone. */
export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONES[status] ?? "neutral"} dot>{status}</Badge>;
}

export function Avatar({ name, className = "size-9 text-xs" }: { name: string; className?: string }) {
  const hues = ["bg-brand-100 text-brand", "bg-gold-100 text-gold-700", "bg-success-soft text-success", "bg-brand-900 text-white"];
  const hue = hues[name.length % hues.length];
  return <span className={`flex shrink-0 items-center justify-center rounded-full font-bold ${hue} ${className}`}>{initials(name)}</span>;
}

export function Progress({ value, tone = "bg-brand", track = "bg-brand-50", className = "h-2" }: { value: number; tone?: string; track?: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-full ${track} ${className}`} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`grow-x h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, value * 100)}%` }} />
    </div>
  );
}

/** A KPI tile: label, the headline number, and an optional change with direction. */
export function StatTile({ label, value, change, icon, hint }: { label: string; value: string; change?: number; icon?: React.ReactNode; hint?: string }) {
  const up = (change ?? 0) >= 0;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon && <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand">{icon}</span>}
      </div>
      <p className="mt-3 font-display text-2xl font-bold tabular-nums text-ink">{value}</p>
      {change !== undefined && (
        <p className={`mt-1.5 text-xs font-semibold ${up ? "text-success" : "text-danger"}`}>
          {up ? "▲" : "▼"} {Math.abs(change * 100).toFixed(1)}% <span className="font-normal text-muted">vs last month</span>
        </p>
      )}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export const buttonPrimary = "inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-50";
export const buttonSecondary = "inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand-200 hover:bg-brand-50";

export function Table({ head, children }: { head: React.ReactNode[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
            {head.map((h, i) => <th key={i} className="whitespace-nowrap px-5 py-3 font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}
