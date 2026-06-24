import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Target, Clock, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Nexus CRM" }] }),
  component: AnalyticsPage,
});

const KPIS = [
  { label: "Total Messages", value: "12,847", delta: +18.4, Icon: MessageCircle },
  { label: "Leads Generated", value: "342", delta: +12.1, Icon: Target },
  { label: "Avg Response Time", value: "1.8s", delta: -23.0, Icon: Clock, invert: true },
  { label: "Conversion Rate", value: "27.4%", delta: +4.2, Icon: TrendingUp },
] as const;

const WEEK = [
  { d: "Mon", msgs: 1420, leads: 38 },
  { d: "Tue", msgs: 1810, leads: 51 },
  { d: "Wed", msgs: 1620, leads: 44 },
  { d: "Thu", msgs: 2110, leads: 62 },
  { d: "Fri", msgs: 2340, leads: 71 },
  { d: "Sat", msgs: 1980, leads: 49 },
  { d: "Sun", msgs: 1567, leads: 27 },
];

const TOP_BOTS = [
  { name: "Pizza Roma", msgs: 4210, conv: "31%" },
  { name: "Bloom Florist", msgs: 3180, conv: "28%" },
  { name: "GlowSpa", msgs: 2870, conv: "34%" },
  { name: "FitLab Gym", msgs: 1490, conv: "19%" },
];

function AnalyticsPage() {
  const maxMsgs = Math.max(...WEEK.map((w) => w.msgs));
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Last 7 days</p>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {KPIS.map(({ label, value, delta, Icon, invert }) => {
          const positive = invert ? delta < 0 : delta > 0;
          return (
            <div key={label} className="glass-card rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-3 text-2xl font-bold">{value}</div>
              <div className={`mt-1 flex items-center gap-1 text-[11px] font-medium ${positive ? "text-primary" : "text-destructive"}`}>
                {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {Math.abs(delta)}% vs last week
              </div>
            </div>
          );
        })}
      </div>

      <section className="glass-card rounded-2xl p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Messages this week</h2>
          <span className="text-xs text-muted-foreground">{WEEK.reduce((a, b) => a + b.msgs, 0).toLocaleString()} total</span>
        </div>
        <div className="mt-5 flex h-40 items-end gap-2">
          {WEEK.map((w) => (
            <div key={w.d} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-primary/30 to-primary"
                style={{ height: `${(w.msgs / maxMsgs) * 100}%` }}
              />
              <span className="text-[10px] text-muted-foreground">{w.d}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Top performing bots</h2>
        <div className="glass-card divide-y divide-border/60 rounded-2xl">
          {TOP_BOTS.map((b, i) => (
            <div key={b.name} className="flex items-center gap-3 px-4 py-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{b.name}</div>
                <div className="text-xs text-muted-foreground">{b.msgs.toLocaleString()} messages</div>
              </div>
              <span className="shrink-0 rounded-full bg-primary/15 px-2 py-1 text-[11px] font-semibold text-primary">
                {b.conv}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
