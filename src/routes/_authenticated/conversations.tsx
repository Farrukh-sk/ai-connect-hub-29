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
import { Plus, User, Bot, Phone } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "./clients";

export const Route = createFileRoute("/_authenticated/conversations")({
  head: () => ({ meta: [{ title: "Conversations — Nexus CRM" }] }),
  component: ConversationsPage,
});

function ConversationsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*, clients(business_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-lite"],
    queryFn: async () => (await supabase.from("clients").select("id,business_name")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async (form: Record<string, string>) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("conversations").insert({
        user_id: u.user!.id,
        client_id: form.client_id || null,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        message: form.message,
        ai_reply: form.ai_reply || null,
        channel: "whatsapp",
        last_message_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Logged");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{conversations.length} messages</p>
          <h1 className="text-3xl font-bold tracking-tight">Conversations</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="shrink-0 gap-1"><Plus className="h-4 w-4" /> Log</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Log conversation</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>);
              }}
              className="space-y-3"
            >
              {clients.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Client (optional)</Label>
                  <Select name="client_id">
                    <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field name="customer_name" label="Customer" required />
                <Field name="customer_phone" label="Phone" placeholder="+1 555..." required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message">Customer message</Label>
                <Textarea id="message" name="message" rows={3} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ai_reply">AI reply</Label>
                <Textarea id="ai_reply" name="ai_reply" rows={3} />
              </div>
              <Button type="submit" disabled={create.isPending} className="w-full">Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {conversations.length === 0 ? (
        <EmptyState text="No conversations logged yet." />
      ) : (
        <ul className="space-y-3">
          {conversations.map((c) => (
            <li key={c.id} className="glass-card rounded-2xl p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{c.customer_name ?? "Customer"}</div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Phone className="h-2.5 w-2.5" /> {c.customer_phone ?? "—"}
                      {c.clients?.business_name && <span className="ml-1 truncate">· {c.clients.business_name}</span>}
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
                  {c.created_at ? new Date(c.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-secondary px-3 py-2 text-sm">
                    {c.message}
                  </div>
                </div>
                {c.ai_reply && (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                      <div className="mb-0.5 flex items-center gap-1 text-[10px] uppercase opacity-70">
                        <Bot className="h-2.5 w-2.5" /> AI
                      </div>
                      {c.ai_reply}
                    </div>
                  </div>
                )}
              </div>
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
