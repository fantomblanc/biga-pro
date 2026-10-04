import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAppSettings } from "@/lib/app-settings";

export const Route = createFileRoute("/maintenance")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Maintenance · CarpiBiga Pro" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MaintenancePage,
});

function MaintenancePage() {
  const s = useAppSettings();
  return (
    <AppShell>
      <div className="mt-16 mx-auto max-w-md text-center space-y-4 rounded-2xl border border-border/60 bg-card p-8">
        <span className="text-5xl">🛠️</span>
        <h1 className="text-2xl font-bold">Maintenance en cours</h1>
        <p className="text-muted-foreground text-sm">
          {s.app_name} est momentanément indisponible pendant une mise à jour.
          Revenez dans quelques instants — vos recettes sont en sécurité.
        </p>
        {s.banner_message && (
          <p className="text-xs text-muted-foreground border-t border-border/60 pt-3">{s.banner_message}</p>
        )}
      </div>
    </AppShell>
  );
}
