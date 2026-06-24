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
import { Plus, Target, Phone } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "./clients";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({ meta: [{ title: "Leads — Nexus CRM" }] }),
  component: LeadsPage,
});

const STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;
type Status = typeof STATUSES[number];

const STATUS_STYLE: Record<Status, string> = {
  new: "bg-secondary text-foreground",
  contacted: "bg-warning/15 text-warning",
  qualified: "bg-primary/15 text-primary",
  proposal: "bg-primary/25 text-primary",
  won: "bg-primary text-primary-foreground",
  lost: "bg-destructive/15 text-destructive",
};

function LeadsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Status | "all">("all");

  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = filter === "all" ? leads : leads.filter(l => l.status === filter);

  const create = useMutation({
    mutationFn: async (form: Record<string, string>) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("leads").insert({
        user_id: u.user!.id,
        name: form.name,
        phone: form.phone || null,
        requirement: form.requirement || null,
        status: (form.status || "new") as Status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Lead added");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{leads.length} total</p>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="shrink-0 gap-1"><Plus className="h-4 w-4" /> Add</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>New lead</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>);
              }}
              className="space-y-3"
            >
              <Field name="name" label="Name" required />
              <Field name="phone" label="Phone" placeholder="+1 555..." />
              <div className="space-y-1.5">
                <Label htmlFor="requirement">Requirement</Label>
                <Textarea id="requirement" name="requirement" rows={3} placeholder="What kind of bot do they need?" />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select name="status" defaultValue="new">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={create.isPending} className="w-full">Save lead</Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="-mx-5 overflow-x-auto px-5">
        <div className="flex gap-2">
          {(["all", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                filter === s ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="No leads here yet." />
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((l) => (
            <li key={l.id} className="glass-card rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary">
                  <Target className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{l.name}</div>
                  {l.phone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {l.phone}
                    </div>
                  )}
                </div>
                <Select value={l.status} onValueChange={(v) => updateStatus.mutate({ id: l.id, status: v as Status })}>
                  <SelectTrigger className={`h-7 w-auto shrink-0 gap-1 border-0 px-2 text-[10px] font-semibold uppercase ${STATUS_STYLE[l.status as Status]}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {l.requirement && (
                <p className="mt-3 rounded-lg bg-secondary/60 p-2.5 text-xs text-muted-foreground">
                  {l.requirement}
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
