import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Bot, Phone, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({ meta: [{ title: "Clients — Nexus CRM" }] }),
  component: ClientsPage,
});

type ClientStatus = "active" | "paused" | "churned";
type ClientRow = {
  id: string;
  business_name: string;
  whatsapp_number: string | null;
  ai_prompt: string | null;
  status: ClientStatus;
};

const STATUS_STYLE: Record<string, string> = {
  active: "bg-primary/15 text-primary",
  paused: "bg-warning/15 text-warning",
  churned: "bg-destructive/15 text-destructive",
};

function ClientsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [deleting, setDeleting] = useState<ClientRow | null>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id,business_name,whatsapp_number,ai_prompt,status,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ClientRow[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["clients"] });
    qc.invalidateQueries({ queryKey: ["clients-lite"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  const create = useMutation({
    mutationFn: async (form: Record<string, string>) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("clients").insert({
        user_id: u.user!.id,
        business_name: form.business_name,
        whatsapp_number: form.whatsapp_number || null,
        ai_prompt: form.ai_prompt || null,
        status: (form.status || "active") as ClientStatus,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Client added"); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ClientRow> }) => {
      const { error } = await supabase.from("clients").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Updated"); setEditing(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Deleted"); setDeleting(null); },
    onError: (e: Error) => toast.error(e.message),
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
              <Field name="business_name" label="Business name" required />
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
                    <span className="truncate font-semibold">{c.business_name}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${STATUS_STYLE[c.status]}`}>{c.status}</span>
                  </div>
                  {c.whatsapp_number && (
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {c.whatsapp_number}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(c)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleting(c)} aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit client</DialogTitle></DialogHeader>
          {editing && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
                update.mutate({
                  id: editing.id,
                  patch: {
                    business_name: f.business_name,
                    whatsapp_number: f.whatsapp_number || null,
                    ai_prompt: f.ai_prompt || null,
                    status: f.status as ClientStatus,
                  },
                });
              }}
              className="space-y-3"
            >
              <Field name="business_name" label="Business name" defaultValue={editing.business_name} required />
              <Field name="whatsapp_number" label="WhatsApp number" defaultValue={editing.whatsapp_number ?? ""} />
              <div className="space-y-1.5">
                <Label htmlFor="edit_ai_prompt">AI prompt</Label>
                <Textarea id="edit_ai_prompt" name="ai_prompt" rows={4} defaultValue={editing.ai_prompt ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>Bot status</Label>
                <Select name="status" defaultValue={editing.status}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="churned">Churned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={update.isPending} className="w-full">Save changes</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.business_name}?</AlertDialogTitle>
            <AlertDialogDescription>This removes the client. Linked conversations stay but lose their client link.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && remove.mutate(deleting.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
