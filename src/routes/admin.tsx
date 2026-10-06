import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { setAppSettings, fetchAppSettings, type PublicAppSettings, DEFAULT_APP_SETTINGS } from "@/lib/app-settings";
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

interface Report { id: string; type: string; message: string; user_email: string | null; created_at: string; status: string }
interface UserRow { id: string; email: string | null; created_at: string; role: string }

const card = "rounded-2xl border border-border/60 bg-card p-4 space-y-3";

function AdminPage() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [s, setS] = useState<PublicAppSettings>(DEFAULT_APP_SETTINGS);
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [recipes, setRecipes] = useState<{ created_at: string }[]>([]);
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
    (supabase as any).from("recipes").select("created_at")
      .then(({ data }: any) => setRecipes(data ?? []));
    // Users: profiles + roles
    Promise.all([
      (supabase as any).from("profiles").select("id, email, created_at"),
      (supabase as any).from("user_roles").select("user_id, role"),
    ]).then(([p, r]: any[]) => {
      const roleByUser = new Map<string, string>();
      (r.data ?? []).forEach((row: any) => roleByUser.set(row.user_id, row.role));
      setUsers((p.data ?? []).map((u: any) => ({ ...u, role: roleByUser.get(u.id) ?? "user" })));
    });
  }, [isAdmin]);

  const weekly = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const r of recipes) {
      const d = new Date(r.created_at);
      const day = d.getDay() || 7;
      const monday = new Date(d); monday.setDate(d.getDate() - day + 1);
      const key = monday.toISOString().slice(0, 10);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
  }, [recipes]);

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
      banner_type: s.banner_type, banner_url: s.banner_url,
      maintenance_mode: s.maintenance_mode, max_recipes_per_user: s.max_recipes_per_user,
      allow_signups: s.allow_signups,
      default_hydration: s.default_hydration, default_ball_weight: s.default_ball_weight,
      default_biga_pct: s.default_biga_pct, default_dough_temp: s.default_dough_temp,
      app_version: s.app_version, changelog: s.changelog,
      ga_measurement_id: s.ga_measurement_id, ga_enabled: s.ga_enabled,
    }).eq("id", 1);
    setSaving(false);
    if (!error) setAppSettings(s);
    error ? toast.error("Échec de l'enregistrement") : toast.success("Paramètres enregistrés");
  };

  const del = async (id: string) => {
    await (supabase as any).from("feedback_reports").delete().eq("id", id);
    setReports((r) => r.filter((x) => x.id !== id));
  };
  const setReportStatus = async (id: string, status: string) => {
    await (supabase as any).from("feedback_reports").update({ status }).eq("id", id);
    setReports((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
  };
  const setRole = async (userId: string, role: string) => {
    if (role === "user") {
      await (supabase as any).from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    } else {
      await (supabase as any).from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
    }
    setUsers((u) => u.map((x) => (x.id === userId ? { ...x, role } : x)));
    toast.success("Rôle mis à jour");
  };

  const field = (k: keyof PublicAppSettings, label: string, type: "text" | "number" = "text") => (
    <label className="block space-y-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <input type={type} value={String(s[k])}
        onChange={(e) => setS({ ...s, [k]: type === "number" ? Number(e.target.value) : e.target.value })}
        className="w-full rounded-xl border border-input bg-background p-2.5" />
    </label>
  );
  const toggle = (k: keyof PublicAppSettings, label: string, hint?: string) => (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}{hint && <span className="block text-xs text-muted-foreground">{hint}</span>}</span>
      <Switch checked={Boolean(s[k])} onCheckedChange={(v) => setS({ ...s, [k]: v })} />
    </label>
  );

  const maxBar = Math.max(1, ...weekly.map(([, n]) => n));
  const statusColor: Record<string, string> = {
    new: "bg-primary/15 text-primary",
    read: "bg-muted text-muted-foreground",
    archived: "bg-muted/50 text-muted-foreground line-through",
  };

  return (
    <AppShell>
      <h1 className="text-3xl font-bold tracking-tight mt-2 mb-4">Administration</h1>
      <div className="space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { label: "Recettes créées", value: recipes.length, icon: "🍕" },
            { label: "Utilisateurs", value: users.length, icon: "👥" },
            { label: "Retours reçus", value: reports.length, icon: "💬" },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-border/60 bg-card p-4 text-center">
              <div className="text-2xl">{k.icon}</div>
              <div className="text-2xl font-bold text-primary">{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
            </div>
          ))}
        </section>

        {/* Graphique hebdomadaire */}
        <section className={card}>
          <h2 className="text-lg font-semibold">Recettes créées par semaine</h2>
          {weekly.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnée pour l'instant.</p>
          ) : (
            <div className="flex items-end gap-1.5 h-32">
              {weekly.map(([week, n]) => (
                <div key={week} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <span className="text-[10px] text-muted-foreground">{n}</span>
                  <div className="w-full rounded-t-md bg-primary/80" style={{ height: `${(n / maxBar) * 100}%` }} title={`${week}: ${n}`} />
                  <span className="text-[9px] text-muted-foreground truncate w-full text-center">{week.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Statistiques de trafic / GA */}
        <section className={card}>
          <h2 className="text-lg font-semibold">Statistiques de trafic (Google Analytics 4)</h2>
          {field("ga_measurement_id", "ID de mesure GA4 (G-XXXXXXXXXX)")}
          {toggle("ga_enabled", "Activer le suivi Google Analytics", "Le script gtag.js est injecté sur toutes les pages.")}
        </section>

        {/* Régulation & sécurité */}
        <section className={card}>
          <h2 className="text-lg font-semibold">Régulation & sécurité</h2>
          {toggle("maintenance_mode", "🛠️ Mode maintenance", "Les utilisateurs non-admin voient une page d'attente.")}
          {toggle("allow_signups", "Autoriser les nouvelles inscriptions")}
          <label className="block space-y-1">
            <span className="text-sm text-muted-foreground">Limite de recettes par utilisateur (0 = illimité)</span>
            <input type="number" min={0} value={s.max_recipes_per_user}
              onChange={(e) => setS({ ...s, max_recipes_per_user: Number(e.target.value) })}
              className="w-full rounded-xl border border-input bg-background p-2.5" />
          </label>
        </section>

        {/* Gestion des utilisateurs */}
        <section className={card}>
          <h2 className="text-lg font-semibold">Utilisateurs ({users.length})</h2>
          {users.length === 0 && <p className="text-sm text-muted-foreground">Aucun utilisateur.</p>}
          <div className="divide-y divide-border">
            {users.map((u) => (
              <div key={u.id} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{u.email ?? u.id}</p>
                  <p className="text-xs text-muted-foreground">Inscrit le {new Date(u.created_at).toLocaleDateString("fr-FR")}</p>
                </div>
                <select value={u.role} onChange={(e) => setRole(u.id, e.target.value)}
                  className="rounded-lg border border-input bg-background px-2 py-1 text-xs">
                  <option value="user">Utilisateur</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            ))}
          </div>
        </section>

        {/* Paramètres par défaut de la pâte */}
        <section className={card}>
          <h2 className="text-lg font-semibold">Valeurs par défaut des recettes</h2>
          <div className="grid grid-cols-2 gap-3">
            {field("default_hydration", "Hydratation (%)", "number")}
            {field("default_ball_weight", "Poids par pâton (g)", "number")}
            {field("default_biga_pct", "Biga par défaut (%)", "number")}
            {field("default_dough_temp", "T° cible pâte (°C)", "number")}
          </div>
        </section>

        {/* Bannière & version */}
        <section className={card}>
          <h2 className="text-lg font-semibold">Bannière & version</h2>
          {field("banner_message", "Message de bannière")}
          <label className="block space-y-1">
            <span className="text-sm text-muted-foreground">Type de bannière</span>
            <select value={s.banner_type} onChange={(e) => setS({ ...s, banner_type: e.target.value })}
              className="w-full rounded-xl border border-input bg-background p-2.5">
              <option value="info">ℹ️ Info</option>
              <option value="new">✨ Nouveauté</option>
              <option value="maintenance">🛠️ Maintenance</option>
            </select>
          </label>
          {field("banner_url", "Lien / URL de la bannière (facultatif)")}
          {toggle("banner_active", "Bannière active")}
          {field("app_version", "Version actuelle (ex: v1.4.0)")}
          <label className="block space-y-1">
            <span className="text-sm text-muted-foreground">Notes de mise à jour (changelog)</span>
            <textarea value={s.changelog} onChange={(e) => setS({ ...s, changelog: e.target.value })} rows={4}
              className="w-full rounded-xl border border-input bg-background p-2.5 text-sm" />
          </label>
        </section>

        {/* Paramètres globaux */}
        <section className={card}>
          <h2 className="text-lg font-semibold">Paramètres globaux</h2>
          {field("app_name", "Nom de l'application")}
          {field("paypal_email", "Compte PayPal (email)")}
          {field("buy_me_a_coffee_username", "Identifiant Buy Me a Coffee")}
          {field("contact_email", "Email de contact")}
        </section>

        <button onClick={save} disabled={saving}
          className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50">
          {saving ? "Enregistrement…" : "Enregistrer tous les paramètres"}
        </button>

        {/* Retours utilisateurs */}
        <section className={card}>
          <h2 className="text-lg font-semibold">Retours utilisateurs ({reports.length})</h2>
          {reports.length === 0 && <p className="text-sm text-muted-foreground">Aucun retour pour l'instant.</p>}
          <div className="divide-y divide-border">
            {reports.map((r) => (
              <div key={r.id} className="py-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 font-medium uppercase">{r.type}</span>
                    <span className={`rounded-full px-2 py-0.5 font-medium ${statusColor[r.status] ?? statusColor.new}`}>
                      {r.status === "new" ? "Nouveau" : r.status === "read" ? "Lu" : "Archivé"}
                    </span>
                  </div>
                  <span>{new Date(r.created_at).toLocaleString("fr-FR")}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{r.message}</p>
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="text-muted-foreground truncate">{r.user_email ?? "anonyme"}</span>
                  <div className="flex gap-3 shrink-0">
                    {r.status !== "read" && <button onClick={() => setReportStatus(r.id, "read")} className="text-primary">Marquer lu</button>}
                    {r.status !== "archived" && <button onClick={() => setReportStatus(r.id, "archived")} className="text-muted-foreground">Archiver</button>}
                    <button onClick={() => del(r.id)} className="text-destructive">Supprimer</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
