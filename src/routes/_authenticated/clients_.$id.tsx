import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Bot, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clients_/$id")({
  head: () => ({ meta: [{ title: "Client Details — Nexus CRM" }] }),
  component: ClientDetailsPage,
});

type FaqItem = { q: string; a: string };

const SAMPLE_FAQ: FaqItem[] = [
  { q: "What are your hours?", a: "Mon–Sat 9am–7pm, closed Sunday." },
  { q: "Do you deliver?", a: "Yes, same-day delivery within 10 miles." },
];

function ClientDetailsPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id,business_name,whatsapp_number,ai_prompt,status,settings")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as (typeof data & { settings: Record<string, unknown> | null }) | null;
    },
  });

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("Retail");
  const [whatsapp, setWhatsapp] = useState("");
  const [status, setStatus] = useState<"active" | "paused" | "churned">("active");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const [tone, setTone] = useState("Friendly");
  const [faqs, setFaqs] = useState<FaqItem[]>(SAMPLE_FAQ);

  useEffect(() => {
    if (!client) return;
    setBusinessName(client.business_name ?? "");
    setWhatsapp(client.whatsapp_number ?? "");
    setStatus((client.status as typeof status) ?? "active");
    setPrompt(client.ai_prompt ?? "");
    const s = (client.settings ?? {}) as {
      business_type?: string;
      model?: string;
      tone?: string;
      faqs?: FaqItem[];
    };
    if (s.business_type) setBusinessType(s.business_type);
    if (s.model) setModel(s.model);
    if (s.tone) setTone(s.tone);
    if (Array.isArray(s.faqs)) setFaqs(s.faqs);
  }, [client]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("clients")
        .update({
          business_name: businessName,
          whatsapp_number: whatsapp || null,
          ai_prompt: prompt || null,
          status,
          settings: {
            business_type: businessType,
            model,
            tone,
            faqs: faqs.filter((f) => f.q.trim() || f.a.trim()),
          },
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client", id] });
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>;
  if (!client) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Client not found.</p>
        <Button onClick={() => navigate({ to: "/clients" })}>Back to clients</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/clients" className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{whatsapp || "—"}</p>
          <h1 className="truncate text-2xl font-bold tracking-tight">{businessName}</h1>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Bot className="h-5 w-5" />
        </div>
      </div>

      {/* Business info */}
      <Section title="Business information">
        <Field label="Business name" value={businessName} onChange={setBusinessName} />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Business type</Label>
            <Select value={businessType} onValueChange={setBusinessType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Retail", "Restaurant", "Salon & Spa", "Fitness", "Real Estate", "Healthcare", "Other"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Bot status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="churned">Churned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Field label="WhatsApp number" value={whatsapp} onChange={setWhatsapp} placeholder="+1 555 0100" />
      </Section>

      {/* Bot config */}
      <Section title="Bot configuration">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>AI model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Friendly", "Professional", "Playful", "Concise"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prompt">System prompt</Label>
          <Textarea id="prompt" rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="You are a helpful assistant for..." />
        </div>
      </Section>

      {/* FAQ */}
      <Section
        title="FAQ knowledge base"
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFaqs((f) => [...f, { q: "", a: "" }])}
            className="gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        }
      >
        <div className="space-y-3">
          {faqs.length === 0 && <p className="text-xs text-muted-foreground">No FAQs yet.</p>}
          {faqs.map((f, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-secondary/30 p-3">
              <div className="flex items-start gap-2">
                <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/15 text-[10px] font-bold text-primary">
                  Q{i + 1}
                </div>
                <Input
                  value={f.q}
                  onChange={(e) =>
                    setFaqs((arr) => arr.map((x, idx) => (idx === i ? { ...x, q: e.target.value } : x)))
                  }
                  placeholder="Question"
                  className="h-8 border-0 bg-transparent px-2 text-sm font-medium focus-visible:ring-1"
                />
                <button
                  onClick={() => setFaqs((arr) => arr.filter((_, idx) => idx !== i))}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <Textarea
                value={f.a}
                onChange={(e) =>
                  setFaqs((arr) => arr.map((x, idx) => (idx === i ? { ...x, a: e.target.value } : x)))
                }
                placeholder="Answer"
                rows={2}
                className="mt-2 border-0 bg-transparent text-sm text-muted-foreground focus-visible:ring-1"
              />
            </div>
          ))}
        </div>
      </Section>

      <div className="sticky bottom-20 z-10">
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full gap-2 shadow-lg">
          <Save className="h-4 w-4" />
          {save.isPending ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="glass-card space-y-4 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, ...rest }: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  );
}
