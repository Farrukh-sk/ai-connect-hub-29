import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Users, MessageCircle, Target, BarChart3, LogOut, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

const NAV = [
  { to: "/dashboard", label: "Home", Icon: LayoutDashboard },
  { to: "/clients", label: "Clients", Icon: Users },
  { to: "/livechat", label: "Chat", Icon: MessageCircle },
  { to: "/leads", label: "Leads", Icon: Target },
  { to: "/analytics", label: "Stats", Icon: BarChart3 },
] as const;

function AuthedLayout() {
  const router = useRouter();
  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="min-h-dvh pb-24">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-gold ring-2 ring-background" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-base font-bold tracking-tight">Nexus</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-gold/80">Agency CRM</div>
            </div>
          </Link>
          <button onClick={signOut} className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-6">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/50 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {NAV.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              className="group relative flex flex-col items-center gap-1 py-3 text-[11px] font-medium text-muted-foreground transition-colors data-[status=active]:text-primary"
              activeProps={{ "data-status": "active" } as never}
            >
              <span className="absolute inset-x-6 top-0 hidden h-[2px] rounded-full bg-gradient-to-r from-transparent via-primary to-transparent group-data-[status=active]:block" />
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
