import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LANGS } from "@/lib/translations";
import { loadSettings, saveSettings } from "@/lib/storage";
import { requestNotifPermission } from "@/lib/notifications";
import { toast } from "sonner";
import { Bell, Languages, Info } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · CarpiBiga Pro" },
      { name: "description", content: "Language, notifications and app preferences for CarpiBiga Pro." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const [notifEnabled, setNotifEnabled] = useState(false);

  useEffect(() => {
    setNotifEnabled(loadSettings().notificationsEnabled);
  }, []);

  async function toggleNotif(v: boolean) {
    if (v) {
      const perm = await requestNotifPermission();
      if (perm !== "granted") {
        toast.error(t("notif_denied"));
        return;
      }
      toast.success(t("notif_granted"));
    }
    setNotifEnabled(v);
    saveSettings({ notificationsEnabled: v });
  }

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold mb-1">{t("settings_title")}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t("app_name")}</p>

      <div className="space-y-4">
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Languages className="size-4 text-primary" />
            <h3 className="font-display font-semibold text-sm">{t("language")}</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`flex items-center gap-2 h-11 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  lang === l.code
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="text-lg leading-none">{l.flag}</span>
                {l.label}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            <h3 className="font-display font-semibold text-sm">{t("notifications")}</h3>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t("enable_notifications")}</Label>
            <Switch checked={notifEnabled} onCheckedChange={toggleNotif} />
          </div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-muted-foreground" />
            <h3 className="font-display font-semibold text-sm">About</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            CarpiBiga Pro · Precision dough engineering. 100% local — all data stored on your device.
            No account, no server, no tracking. Yeast curves inspired by Giorilli's constants.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
