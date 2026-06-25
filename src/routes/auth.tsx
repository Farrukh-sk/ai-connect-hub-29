import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Mail } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Nexus CRM" }] }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot" | "reset" | "confirm";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });

    if (window.location.hash.includes("type=recovery")) {
      setMode("reset");
    }
  }, [navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/auth" },
        });
        if (error) throw error;
        setMode("confirm");
        setResendCooldown(60);
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast.success("Password reset email sent — check your inbox.");
        setMode("signin");
        setEmail("");
      } else if (mode === "reset") {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match.");
          return;
        }
        if (password.length < 6) {
          toast.error("Password must be at least 6 characters.");
          return;
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Password updated — you are now signed in.");
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function resendConfirmation() {
    if (resendCooldown > 0 || !email) return;
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: window.location.origin + "/auth" },
      });
      if (error) throw error;
      toast.success("Confirmation email resent.");
      setResendCooldown(60);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (mode === "confirm") {
    return (
      <div className="flex min-h-dvh items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm text-center">
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <Mail className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">Check your inbox</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a confirmation link to{" "}
              <span className="font-medium text-foreground">{email}</span>.
              Click it to activate your account.
            </p>
          </div>
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Didn't receive it? Check your spam folder or resend below.
            </p>
            <Button
              onClick={resendConfirmation}
              disabled={resendCooldown > 0}
              variant="outline"
              className="w-full"
            >
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Resend confirmation email"}
            </Button>
            <button
              type="button"
              onClick={() => { setMode("signin"); setPassword(""); }}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  const titles: Record<Exclude<Mode, "confirm">, { heading: string; sub: string }> = {
    signin: { heading: "Nexus CRM", sub: "The CRM built for AI agencies." },
    signup: { heading: "Create account", sub: "Start managing your AI agency." },
    forgot: { heading: "Reset password", sub: "We'll email you a reset link." },
    reset: { heading: "Set new password", sub: "Choose a strong new password." },
  };

  const { heading, sub } = titles[mode as Exclude<Mode, "confirm">];

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">{heading}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
        </div>

        <form onSubmit={submit} className="glass-card space-y-4 rounded-2xl p-6">
          {mode !== "reset" && (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          {(mode === "signin" || mode === "signup") && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {mode === "reset" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </>
          )}

          <Button type="submit" disabled={loading} className="w-full h-11 text-base font-semibold">
            {loading
              ? "..."
              : mode === "signin"
              ? "Sign in"
              : mode === "signup"
              ? "Create account"
              : mode === "forgot"
              ? "Send reset link"
              : "Update password"}
          </Button>

          {mode === "signin" && (
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Need an account? Sign up
            </button>
          )}

          {mode === "signup" && (
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Have an account? Sign in
            </button>
          )}

          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Back to sign in
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
