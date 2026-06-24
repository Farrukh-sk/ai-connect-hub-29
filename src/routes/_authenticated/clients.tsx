import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Bot, Phone } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({ meta: [{ title: "Clients — Nexus CRM" }] }),
  component: ClientsPage,
});

const STATUS_STYLE: Record<string, string> = {
  active: "bg-primary/15 text-primary",
  paused: "bg-warning/15 text-warning",
  churned: "bg-destructive/15 text-destructive",
};

function ClientsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async (form: Record<string, string>) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("clients").insert({
        user_id: u.user!.id,
        name: form.name,
        company: form.name,
        whatsapp_number: form.whatsapp_number || null,
        ai_prompt: form.ai_prompt || null,
        status: (form.status || "active") as "active" | "paused" | "churned",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Client added");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "paused" | "churned" }) => {
      const { error } = await supabase.from("clients").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{clients.length} businesses</p>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="shrink-0 gap-1"><Plus className="h-4 w-4" /> Add</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>New client</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>);
              }}
              className="space-y-3"
            >
              <Field name="name" label="Business name" required />
              <Field name="whatsapp_number" label="WhatsApp number" placeholder="+1 555 0100" required />
              <div className="space-y-1.5">
                <Label htmlFor="ai_prompt">AI prompt</Label>
                <Textarea id="ai_prompt" name="ai_prompt" rows={4} placeholder="You are a friendly assistant for..." />
              </div>
              <div className="space-y-1.5">
                <Label>Bot status</Label>
                <Select name="status" defaultValue="active">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="churned">Churned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={create.isPending} className="w-full">Save client</Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {clients.length === 0 ? (
        <EmptyState text="No clients yet. Add a business to deploy its WhatsApp bot." />
      ) : (
        <ul className="space-y-2.5">
          {clients.map((c) => (
            <li key={c.id} className="glass-card rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{c.name}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${STATUS_STYLE[c.status]}`}>{c.status}</span>
                  </div>
                  {c.whatsapp_number && (
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {c.whatsapp_number}
                    </div>
                  )}
                </div>
                <Select
                  value={c.status}
                  onValueChange={(v) => toggleStatus.mutate({ id: c.id, status: v as "active" | "paused" | "churned" })}
                >
                  <SelectTrigger className="h-8 w-auto shrink-0 border-0 px-2 text-[11px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="churned">Churned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {c.ai_prompt && (
                <p className="mt-3 line-clamp-2 rounded-lg bg-secondary/60 p-2.5 text-xs italic text-muted-foreground">
                  "{c.ai_prompt}"
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ name, label, ...rest }: { name: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...rest} />
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="glass-card rounded-2xl px-6 py-12 text-center text-sm text-muted-foreground">{text}</div>
  );
}
