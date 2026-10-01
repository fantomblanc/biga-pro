import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { fetchAppSettings, type PublicAppSettings, DEFAULT_APP_SETTINGS } from "@/lib/app-settings";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Administration · CarpiBiga Pro" },
      { name: "description", content: "Espace d'administration de CarpiBiga Pro." },
      { property: "og:title", content: "Administration · CarpiBiga Pro" },
      { property: "og:description", content: "Gestion des paramètres et des retours." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

interface Report { id: string; type: string; message: string; user_email: string | null; created_at: string }

function AdminPage() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [s, setS] = useState<PublicAppSettings>(DEFAULT_APP_SETTINGS);
  const [reports, setReports] = useState<Report[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(null); return; }
    (supabase as any).rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }: any) => setIsAdmin(!!data));
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAppSettings().then(setS);
    (supabase as any).from("feedback_reports").select("*").order("created_at", { ascending: false })
      .then(({ data }: any) => setReports(data ?? []));
  }, [isAdmin]);

  if (loading) return <AppShell><p className="py-10 text-center text-muted-foreground">Chargement…</p></AppShell>;
  if (!user) return (
    <AppShell>
      <div className="mt-10 rounded-2xl border border-border/60 bg-card p-6 text-center space-y-3">
        <h1 className="text-2xl font-bold">Accès administrateur</h1>
        <p className="text-muted-foreground">Connectez-vous avec le compte administrateur.</p>
        <Link to="/auth" className="inline-block rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground">Se connecter</Link>
      </div>
    </AppShell>
  );
  if (isAdmin === null) return <AppShell><p className="py-10 text-center text-muted-foreground">Vérification…</p></AppShell>;
  if (!isAdmin) return <AppShell><p className="py-10 text-center text-muted-foreground">Accès refusé pour ce compte.</p></AppShell>;

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any).from("app_settings").update({
      app_name: s.app_name, paypal_email: s.paypal_email, buy_me_a_coffee_username: s.buy_me_a_coffee_username,
      contact_email: s.contact_email, banner_message: s.banner_message, banner_active: s.banner_active,
    }).eq("id", 1);
    setSaving(false);
    error ? toast.error("Échec de l'enregistrement") : toast.success("Paramètres enregistrés");
  };
  const del = async (id: string) => {
    await (supabase as any).from("feedback_reports").delete().eq("id", id);
    setReports((r) => r.filter((x) => x.id !== id));
  };

  const field = (k: keyof PublicAppSettings, label: string) => (
    <label className="block space-y-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <input value={String(s[k])} onChange={(e) => setS({ ...s, [k]: e.target.value })}
        className="w-full rounded-xl border border-input bg-background p-2.5" />
    </label>
  );
  const card = "rounded-2xl border border-border/60 bg-card p-4 space-y-3";

  return (
    <AppShell>
      <h1 className="text-3xl font-bold tracking-tight mt-2 mb-4">Administration</h1>
      <div className="space-y-4">
        <section className={card}>
          <h2 className="text-lg font-semibold">Paramètres globaux</h2>
          {field("app_name", "Nom de l'application")}
          {field("paypal_email", "Compte PayPal (email)")}
          {field("buy_me_a_coffee_username", "Identifiant Buy Me a Coffee")}
          {field("contact_email", "Email de contact")}
          {field("banner_message", "Message de bannière")}
          <label className="flex items-center justify-between">
            <span>Bannière active</span>
            <Switch checked={s.banner_active} onCheckedChange={(v) => setS({ ...s, banner_active: v })} />
          </label>
          <button onClick={save} disabled={saving} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </section>

        <section className={card}>
          <h2 className="text-lg font-semibold">Retours utilisateurs ({reports.length})</h2>
          {reports.length === 0 && <p className="text-sm text-muted-foreground">Aucun retour pour l'instant.</p>}
          <div className="divide-y divide-border">
            {reports.map((r) => (
              <div key={r.id} className="py-3 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5 font-medium uppercase">{r.type}</span>
                  <span>{new Date(r.created_at).toLocaleString("fr-FR")}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{r.message}</p>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{r.user_email ?? "anonyme"}</span>
                  <button onClick={() => del(r.id)} className="text-destructive">Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="text-lg font-semibold">Statistiques de trafic</h2>
          <p className="text-sm text-muted-foreground">Emplacement réservé pour un widget Plausible ou Google Analytics. Fournissez l'identifiant du site pour l'activer.</p>
        </section>
      </div>
    </AppShell>
  );
}
