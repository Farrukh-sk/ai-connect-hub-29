import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Hand, Phone, MoreVertical, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/livechat")({
  head: () => ({ meta: [{ title: "Live Chat — Nexus CRM" }] }),
  component: LiveChatPage,
});

type Sender = "customer" | "ai" | "agent";
type Msg = { id: string; sender: Sender; text: string; time: string };

const CONTACTS = [
  { id: "1", name: "Sarah Chen", phone: "+1 415 555 0301", business: "Bloom Florist", last: "Perfect, I'll take the dozen!", unread: 2, online: true },
  { id: "2", name: "Mike Patel", phone: "+1 415 555 0302", business: "Pizza Roma", last: "ETA on my order?", unread: 1, online: true },
  { id: "3", name: "Aisha Khan", phone: "+1 415 555 0303", business: "GlowSpa", last: "4pm Saturday works", unread: 0, online: false },
  { id: "4", name: "Jordan Lee", phone: "+1 415 555 0304", business: "Pizza Roma", last: "Thanks!", unread: 0, online: false },
];

const SEED: Record<string, Msg[]> = {
  "1": [
    { id: "a", sender: "customer", text: "Hi! Do you deliver red roses tomorrow morning?", time: "10:21" },
    { id: "b", sender: "ai", text: "Yes! We deliver 9am–12pm tomorrow. A dozen red roses is $59. Want me to place the order?", time: "10:21" },
    { id: "c", sender: "customer", text: "How about 18 roses?", time: "10:22" },
    { id: "d", sender: "ai", text: "18 long-stem red roses are $79 — also available for 9am–12pm delivery. Shall I lock that in?", time: "10:22" },
    { id: "e", sender: "customer", text: "Perfect, I'll take the dozen!", time: "10:24" },
  ],
  "2": [
    { id: "a", sender: "customer", text: "Large pepperoni, extra cheese. Delivery to 22 Mission St.", time: "12:02" },
    { id: "b", sender: "ai", text: "Got it — Large pepperoni with extra cheese ($18.50) to 22 Mission St. ETA 35 min. Confirm?", time: "12:02" },
    { id: "c", sender: "customer", text: "Confirmed", time: "12:03" },
    { id: "d", sender: "customer", text: "ETA on my order?", time: "12:28" },
  ],
  "3": [
    { id: "a", sender: "customer", text: "Can I book a facial for Saturday afternoon?", time: "09:10" },
    { id: "b", sender: "ai", text: "We have 2pm or 4pm open Saturday. Which works better?", time: "09:10" },
    { id: "c", sender: "customer", text: "4pm Saturday works", time: "09:12" },
  ],
  "4": [
    { id: "a", sender: "customer", text: "What vegan options do you have?", time: "18:40" },
    { id: "b", sender: "ai", text: "Vegan Margherita and Vegan Veggie Supreme — both with house-made cashew mozzarella.", time: "18:40" },
    { id: "c", sender: "customer", text: "Thanks!", time: "18:41" },
  ],
};

function LiveChatPage() {
  const [activeId, setActiveId] = useState<string>("1");
  const [threads, setThreads] = useState<Record<string, Msg[]>>(SEED);
  const [draft, setDraft] = useState("");
  const [humanMode, setHumanMode] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const active = CONTACTS.find((c) => c.id === activeId)!;
  const msgs = threads[activeId] ?? [];
  const isHuman = !!humanMode[activeId];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [activeId, msgs.length]);

  function send() {
    const text = draft.trim();
    if (!text) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const next: Msg = { id: crypto.randomUUID(), sender: isHuman ? "agent" : "ai", text, time: now };
    setThreads((t) => ({ ...t, [activeId]: [...(t[activeId] ?? []), next] }));
    setDraft("");
  }

  function toggleHuman() {
    setHumanMode((m) => {
      const v = !m[activeId];
      toast.success(v ? "Human takeover — AI paused" : "AI bot resumed");
      return { ...m, [activeId]: v };
    });
  }

  return (
    <div className="-mx-5 -mt-5 grid h-[calc(100dvh-9.5rem)] grid-rows-[auto_1fr] md:mx-0 md:mt-0 md:grid-cols-[280px_1fr] md:grid-rows-1 md:gap-4 md:rounded-2xl">
      {/* Sidebar contacts */}
      <aside className="border-b border-border/60 md:rounded-2xl md:border md:bg-card/30">
        <div className="hidden p-4 md:block">
          <h2 className="text-sm font-semibold">Conversations</h2>
        </div>
        <div className="flex overflow-x-auto md:block md:max-h-[calc(100dvh-12rem)] md:overflow-y-auto">
          {CONTACTS.map((c) => {
            const isActive = c.id === activeId;
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`flex shrink-0 items-center gap-3 px-4 py-3 text-left transition-colors md:w-full md:shrink ${
                  isActive ? "bg-primary/10" : "hover:bg-secondary/50"
                }`}
              >
                <div className="relative">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-sm font-semibold">
                    {c.name.split(" ").map((p) => p[0]).join("")}
                  </div>
                  {c.online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />}
                </div>
                <div className="hidden min-w-0 flex-1 md:block">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{c.name}</span>
                    {c.unread > 0 && (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                        {c.unread}
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{c.last}</div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Chat panel */}
      <section className="flex min-h-0 flex-col md:rounded-2xl md:border md:border-border/60 md:bg-card/30">
        <header className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold">
            {active.name.split(" ").map((p) => p[0]).join("")}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{active.name}</div>
            <div className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
              <Phone className="h-3 w-3" /> {active.phone} · {active.business}
            </div>
          </div>
          <Button
            size="sm"
            variant={isHuman ? "default" : "outline"}
            onClick={toggleHuman}
            className="shrink-0 gap-1.5"
          >
            <Hand className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isHuman ? "AI Paused" : "Take over"}</span>
          </Button>
          <button className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary">
            <MoreVertical className="h-4 w-4" />
          </button>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto px-3 py-4"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, oklch(0.78 0.18 145 / 0.05), transparent 50%), radial-gradient(circle at 80% 90%, oklch(0.78 0.18 145 / 0.05), transparent 50%)",
          }}
        >
          {msgs.map((m) => {
            const fromMe = m.sender !== "customer";
            return (
              <div key={m.id} className={`flex ${fromMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] space-y-1 ${fromMe ? "items-end" : "items-start"}`}>
                  {fromMe && (
                    <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                      {m.sender === "ai" ? (
                        <><Bot className="h-2.5 w-2.5" /> AI</>
                      ) : (
                        <><User className="h-2.5 w-2.5" /> Agent</>
                      )}
                    </div>
                  )}
                  <div
                    className={`relative rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      fromMe
                        ? m.sender === "ai"
                          ? "rounded-br-sm bg-primary/90 text-primary-foreground"
                          : "rounded-br-sm bg-accent text-accent-foreground"
                        : "rounded-bl-sm bg-card text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] opacity-70">
                      {m.time}
                      {fromMe && <CheckCheck className="h-3 w-3" />}
                      {!fromMe && <Check className="h-3 w-3" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-2 border-t border-border/60 bg-background/80 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={isHuman ? "Reply as agent..." : "Send as AI..."}
            className="flex-1 rounded-full border border-border/60 bg-secondary/50 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          <button
            type="submit"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </section>
    </div>
  );
}
