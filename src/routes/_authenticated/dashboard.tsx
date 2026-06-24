import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Target, MessageCircle, Bot, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Nexus CRM" }] }),
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [clients, leads, convs] = await Promise.all([
        supabase.from("clients").select("id,status,name"),
        supabase.from("leads").select("id"),
        supabase.from("conversations").select("id,customer_name,phone,message,created_at,clients(name)").order("created_at", { ascending: false }).limit(5),
      ]);
      const c = clients.data ?? [];
      return {
        totalClients: c.length,
        activeBots: c.filter(x => x.status === "active").length,
        totalLeads: (leads.data ?? []).length,
        totalConversations: (convs.data ?? []).length,
        recent: convs.data ?? [],
      };
    },
  });

  const seed = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user!.id;

      const sampleClients = [
        { user_id: userId, name: "Bloom Florist", company: "Bloom Florist", whatsapp_number: "+1 415 555 0101", ai_prompt: "You are a friendly florist assistant. Help customers pick bouquets, take orders, and answer delivery questions.", status: "active" as const, monthly_value: 299 },
        { user_id: userId, name: "Pizza Roma", company: "Pizza Roma", whatsapp_number: "+1 415 555 0102", ai_prompt: "You are Roma, the pizza order bot. Take orders, suggest sides, and confirm delivery time.", status: "active" as const, monthly_value: 499 },
        { user_id: userId, name: "FitLab Gym", company: "FitLab Gym", whatsapp_number: "+1 415 555 0103", ai_prompt: "Help leads book a trial class and answer membership questions.", status: "paused" as const, monthly_value: 199 },
        { user_id: userId, name: "GlowSpa", company: "GlowSpa", whatsapp_number: "+1 415 555 0104", ai_prompt: "You are GlowSpa's booking concierge. Book appointments and recommend treatments.", status: "active" as const, monthly_value: 349 },
      ];
      const { data: insClients, error: cErr } = await supabase.from("clients").insert(sampleClients).select("id,name");
      if (cErr) throw cErr;
      const byName = Object.fromEntries((insClients ?? []).map(x => [x.name, x.id]));

      const sampleLeads = [
        { user_id: userId, name: "Acme Dental", phone: "+1 415 555 0201", requirement: "WhatsApp bot to book cleanings and send reminders.", status: "new" as const, estimated_value: 800 },
        { user_id: userId, name: "Sunset Realty", phone: "+1 415 555 0202", requirement: "Lead qualifier bot for property inquiries.", status: "qualified" as const, estimated_value: 1500 },
        { user_id: userId, name: "Crave Burgers", phone: "+1 415 555 0203", requirement: "Order intake + menu Q&A in WhatsApp.", status: "proposal" as const, estimated_value: 600 },
        { user_id: userId, name: "Zen Yoga", phone: "+1 415 555 0204", requirement: "Class schedule and booking bot.", status: "contacted" as const, estimated_value: 400 },
      ];
      const { error: lErr } = await supabase.from("leads").insert(sampleLeads);
      if (lErr) throw lErr;

      const sampleConvs = [
        { user_id: userId, client_id: byName["Bloom Florist"], channel: "whatsapp", customer_name: "Sarah Chen", phone: "+1 415 555 0301", message: "Hi! Do you deliver red roses tomorrow morning?", ai_reply: "Yes! We deliver 9am–12pm tomorrow. A dozen red roses is $59. Want me to place the order?" },
        { user_id: userId, client_id: byName["Pizza Roma"], channel: "whatsapp", customer_name: "Mike Patel", phone: "+1 415 555 0302", message: "Large pepperoni, extra cheese. Delivery to 22 Mission St.", ai_reply: "Got it — Large pepperoni with extra cheese ($18.50) to 22 Mission St. ETA 35 min. Confirm?" },
        { user_id: userId, client_id: byName["GlowSpa"], channel: "whatsapp", customer_name: "Aisha Khan", phone: "+1 415 555 0303", message: "Can I book a facial for Saturday afternoon?", ai_reply: "We have 2pm or 4pm open Saturday. Which works better?" },
        { user_id: userId, client_id: byName["Pizza Roma"], channel: "whatsapp", customer_name: "Jordan Lee", phone: "+1 415 555 0304", message: "What vegan options do you have?", ai_reply: "We offer Vegan Margherita and Vegan Veggie Supreme — both with house-made cashew mozzarella." },
        { user_id: userId, client_id: byName["Bloom Florist"], channel: "whatsapp", customer_name: "Priya Shah", phone: "+1 415 555 0305", message: "Need a birthday bouquet under $40.", ai_reply: "Our Sunshine Mix ($35) is bright and cheerful — sunflowers, daisies, and lilies. Add a card for $3?" },
      ];
      const { error: mErr } = await supabase.from("conversations").insert(sampleConvs.map(c => ({ ...c, last_message_at: new Date().toISOString() })));
      if (mErr) throw mErr;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Sample data loaded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = [
    { label: "Active Bots", value: data?.activeBots ?? 0, Icon: Bot, accent: true },
    { label: "Clients", value: data?.totalClients ?? 0, Icon: Users, to: "/clients" as const },
    { label: "Leads", value: data?.totalLeads ?? 0, Icon: Target, to: "/leads" as const },
    { label: "Conversations", value: data?.totalConversations ?? 0, Icon: MessageCircle, to: "/conversations" as const },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">WhatsApp AI bots overview</p>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, Icon, accent, to }) => {
          const card = (
            <div className={`glass-card h-full rounded-2xl p-4 ${accent ? "ring-1 ring-primary/40" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
                <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className={`mt-3 text-3xl font-bold ${accent ? "text-primary" : ""}`}>{value}</div>
            </div>
          );
          return to ? <Link key={label} to={to}>{card}</Link> : <div key={label}>{card}</div>;
        })}
      </div>

      {data && data.totalClients === 0 && (
        <div className="glass-card rounded-2xl p-5 text-center">
          <Sparkles className="mx-auto mb-2 h-5 w-5 text-primary" />
          <h3 className="font-semibold">No data yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">Load sample clients, leads, and conversations to explore.</p>
          <Button onClick={() => seed.mutate()} disabled={seed.isPending} className="mt-4">
            {seed.isPending ? "Loading..." : "Load sample data"}
          </Button>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent messages</h2>
          <Link to="/conversations" className="flex items-center gap-1 text-xs text-primary">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="glass-card divide-y divide-border/60 rounded-2xl">
          {(data?.recent ?? []).length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No conversations yet.</p>
          ) : (
            data!.recent.map((c) => (
              <Link key={c.id} to="/conversations" className="flex items-start gap-3 px-4 py-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">{c.customer_name ?? "Customer"}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                    </span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {c.clients?.name ? `${c.clients.name} · ` : ""}{c.message}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
