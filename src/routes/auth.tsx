import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · CarpiBiga Pro" },
      { name: "description", content: "Sign in or create an account to save your dough recipes and bake journal to the cloud." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/" });
    }
  }, [loading, user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (err) throw err;
        setCheckEmail(true);
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        navigate({ to: "/" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth_error"));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    setError(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) {
        setError(t("auth_error"));
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-sm mx-auto space-y-6">
        <div className="text-center space-y-2">
          <span className="grid place-items-center size-12 rounded-xl ember-gradient shadow-lg shadow-primary/30 mx-auto">
            <Flame className="size-6 text-primary-foreground" />
          </span>
          <h1 className="font-display text-2xl font-bold">{t("auth_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("auth_subtitle")}</p>
        </div>

        <Card className="p-5 space-y-4">
          {checkEmail ? (
            <p className="text-sm text-center text-muted-foreground py-4">{t("auth_check_email")}</p>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("auth_email")}</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">{t("auth_password")}</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" className="w-full font-semibold" disabled={busy}>
                  {mode === "signup" ? t("auth_sign_up") : t("auth_sign_in")}
                </Button>
              </form>

              <button
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {mode === "signup" ? t("auth_have_account") : t("auth_no_account")}
              </button>

              <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                {t("auth_or")}
                <div className="h-px flex-1 bg-border" />
              </div>

              <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
                {t("auth_google")}
              </Button>
            </>
          )}
        </Card>

        <div className="text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            ← {t("nav_dashboard")}
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
