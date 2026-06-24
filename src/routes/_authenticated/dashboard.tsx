import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Target, MessageCircle, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Nexus CRM" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [clients, leads, convs] = await Promise.all([
        supabase.from("clients").select("monthly_value,status"),
        supabase.from("leads").select("estimated_value,status"),
        supabase.from("conversations").select("id,title,last_message_at,channel").order("last_message_at", { ascending: false }).limit(5),
      ]);
      const activeClients = (clients.data ?? []).filter(c => c.status === "active");
      const mrr = activeClients.reduce((s, c) => s + Number(c.monthly_value ?? 0), 0);
      const openLeads = (leads.data ?? []).filter(l => !["won", "lost"].includes(l.status));
      const pipeline = openLeads.reduce((s, l) => s + Number(l.estimated_value ?? 0), 0);
      return {
        mrr, pipeline,
        clientsCount: activeClients.length,
        leadsCount: openLeads.length,
        recent: convs.data ?? [],
      };
    },
  });

  const stats = [
    { label: "MRR", value: `$${(data?.mrr ?? 0).toLocaleString()}`, Icon: TrendingUp, accent: true },
    { label: "Pipeline", value: `$${(data?.pipeline ?? 0).toLocaleString()}`, Icon: Target },
    { label: "Active Clients", value: data?.clientsCount ?? 0, Icon: Users },
    { label: "Open Leads", value: data?.leadsCount ?? 0, Icon: MessageCircle },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Good to see you</p>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, Icon, accent }) => (
          <div key={label} className={`glass-card rounded-2xl p-4 ${accent ? "ring-1 ring-primary/40" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
              <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className={`mt-3 text-2xl font-bold ${accent ? "text-primary" : ""}`}>{value}</div>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent conversations</h2>
          <Link to="/conversations" className="flex items-center gap-1 text-xs text-primary">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="glass-card divide-y divide-border/60 rounded-2xl">
          {(data?.recent ?? []).length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No conversations yet.</p>
          ) : (
            data!.recent.map((c) => (
              <Link key={c.id} to="/conversations" className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{c.title}</div>
                  <div className="text-xs text-muted-foreground">{c.channel}</div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString() : ""}
                </span>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
