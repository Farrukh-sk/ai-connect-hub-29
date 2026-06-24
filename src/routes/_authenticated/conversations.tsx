import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MessageCircle, ChevronLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "./clients";

export const Route = createFileRoute("/_authenticated/conversations")({
  head: () => ({ meta: [{ title: "Conversations — Nexus CRM" }] }),
  component: ConversationsPage,
});

type Sender = "user" | "client" | "ai";

function ConversationsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("conversations").select("*").order("last_message_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-lite"],
    queryFn: async () => (await supabase.from("clients").select("id,name")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async (form: Record<string, string>) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("conversations").insert({
        user_id: u.user!.id,
        title: form.title,
        channel: form.channel || "chat",
        client_id: form.client_id || null,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      setOpen(false);
      setActiveId(row.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (activeId) {
    const conv = conversations.find(c => c.id === activeId);
    return <ConversationView id={activeId} title={conv?.title ?? "Chat"} onBack={() => setActiveId(null)} />;
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{conversations.length} total</p>
          <h1 className="text-3xl font-bold tracking-tight">Conversations</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="shrink-0 gap-1"><Plus className="h-4 w-4" /> New</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>New conversation</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>);
              }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="space-y-1.5">
                <Label>Channel</Label>
                <Select name="channel" defaultValue="chat">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chat">Chat</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {clients.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Client (optional)</Label>
                  <Select name="client_id">
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" disabled={create.isPending} className="w-full">Start conversation</Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {conversations.length === 0 ? (
        <EmptyState text="No conversations yet. Start one to track client and lead chats." />
      ) : (
        <ul className="space-y-2.5">
          {conversations.map((c) => (
            <li key={c.id}>
              <button onClick={() => setActiveId(c.id)} className="glass-card flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-colors hover:border-primary/50">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{c.title}</div>
                  <div className="text-xs text-muted-foreground capitalize">{c.channel}</div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString() : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ConversationView({ id, title, onBack }: { id: string; title: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sender, setSender] = useState<Sender>("user");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("*").eq("conversation_id", id).order("created_at");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const send = useMutation({
    mutationFn: async () => {
      const content = text.trim();
      if (!content) return;
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("messages").insert({
        user_id: u.user!.id, conversation_id: id, sender, content,
      });
      if (error) throw error;
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", id);
      setText("");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages", id] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex h-[calc(100dvh-12rem)] flex-col">
      <div className="flex items-center gap-2 pb-3">
        <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-secondary">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="truncate text-lg font-bold">{title}</h1>
      </div>

      <div ref={scrollRef} className="glass-card flex-1 overflow-y-auto rounded-2xl p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No messages yet.</p>
        ) : messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
              m.sender === "user" ? "bg-primary text-primary-foreground"
              : m.sender === "ai" ? "bg-secondary text-foreground ring-1 ring-primary/30"
              : "bg-secondary text-foreground"
            }`}>
              <div className="mb-0.5 text-[10px] uppercase opacity-70">{m.sender}</div>
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send.mutate(); }}
        className="mt-3 flex items-center gap-2"
      >
        <Select value={sender} onValueChange={(v) => setSender(v as Sender)}>
          <SelectTrigger className="h-11 w-24 shrink-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="user">You</SelectItem>
            <SelectItem value="client">Client</SelectItem>
            <SelectItem value="ai">AI</SelectItem>
          </SelectContent>
        </Select>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" className="h-11" />
        <Button type="submit" size="icon" className="h-11 w-11 shrink-0"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
