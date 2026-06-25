import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Lock, Mail } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Nexus CRM" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useRouteContext({ from: "/_authenticated" });

  const [displayName, setDisplayName] = useState(
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? ""
  );
  const [nameLoading, setNameLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const isOAuthUser = (user.app_metadata?.provider ?? "") !== "email";

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setNameLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName },
      });
      if (error) throw error;
      toast.success("Display name updated.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setNameLoading(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setPwLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });
      if (signInError) throw new Error("Current password is incorrect.");

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account details.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email address</p>
            <p className="text-sm font-medium">{user.email}</p>
          </div>
        </div>
      </div>

      <form onSubmit={saveName} className="glass-card rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Display name</p>
            <p className="text-xs text-muted-foreground">
              Shown across the app.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="display-name">Name</Label>
          <Input
            id="display-name"
            type="text"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <Button type="submit" disabled={nameLoading} className="w-full">
          {nameLoading ? "Saving…" : "Save name"}
        </Button>
      </form>

      {!isOAuthUser && (
        <form onSubmit={changePassword} className="glass-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Change password</p>
              <p className="text-xs text-muted-foreground">
                Confirm your current password first.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">Confirm new password</Label>
            <Input
              id="confirm-new-password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={pwLoading} className="w-full">
            {pwLoading ? "Updating…" : "Update password"}
          </Button>
        </form>
      )}

      {isOAuthUser && (
        <div className="glass-card rounded-2xl p-6 flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Password</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You signed in with Google — password changes are managed through your Google account.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
