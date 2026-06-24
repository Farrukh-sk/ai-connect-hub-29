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
import { Plus, Building2 } from "lucide-react";
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
        company: form.company || null,
        email: form.email || null,
        phone: form.phone || null,
        monthly_value: Number(form.monthly_value || 0),
        status: (form.status || "active") as "active" | "paused" | "churned",
        notes: form.notes || null,
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

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    create.mutate(Object.fromEntries(fd) as Record<string, string>);
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{clients.length} total</p>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="shrink-0 gap-1"><Plus className="h-4 w-4" /> Add</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>New client</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <Field name="name" label="Name" required />
              <Field name="company" label="Company" />
              <div className="grid grid-cols-2 gap-3">
                <Field name="email" label="Email" type="email" />
                <Field name="phone" label="Phone" />
              </div>
              <Field name="monthly_value" label="Monthly value ($)" type="number" step="0.01" />
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select name="status" defaultValue="active">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="churned">Churned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={3} />
              </div>
              <Button type="submit" disabled={create.isPending} className="w-full">Save client</Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {clients.length === 0 ? (
        <EmptyState text="No clients yet. Add your first to start tracking MRR." />
      ) : (
        <ul className="space-y-2.5">
          {clients.map((c) => (
            <li key={c.id} className="glass-card flex items-center gap-3 rounded-2xl p-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-foreground">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{c.name}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${STATUS_STYLE[c.status]}`}>{c.status}</span>
                </div>
                <div className="truncate text-xs text-muted-foreground">{c.company ?? c.email ?? "—"}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold text-primary">${Number(c.monthly_value ?? 0).toLocaleString()}</div>
                <div className="text-[10px] uppercase text-muted-foreground">MRR</div>
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

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="glass-card rounded-2xl px-6 py-12 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
