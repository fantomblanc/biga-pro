import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useAppSettings } from "@/lib/app-settings";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Pro access: always open while monetization is off; otherwise plan_type='pro' or admin. */
export function usePlanAccess() {
  const settings = useAppSettings();
  const { user } = useAuth();
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    if (!user || !settings.enable_monetization) { setIsPro(false); return; }
    Promise.all([
      (supabase as any).from("profiles").select("plan_type").eq("id", user.id).maybeSingle(),
      (supabase as any).rpc("has_role", { _user_id: user.id, _role: "admin" }),
    ]).then(([p, r]: any[]) => setIsPro(p.data?.plan_type === "pro" || !!r.data)).catch(() => setIsPro(false));
  }, [user, settings.enable_monetization]);

  const monetized = settings.enable_monetization;
  return { monetized, isPro, canUsePro: !monetized || isPro };
}

export function UpgradeProModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const s = useAppSettings();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>🔥 Débloquer la version Pro</DialogTitle>
          <DialogDescription>
            Le Mode Pro, les pré-ferments (Biga / Poolish) et le Journal de cuisson sont réservés aux comptes Pro.
          </DialogDescription>
        </DialogHeader>
        <Button asChild>
          <a href={`mailto:${s.contact_email}?subject=${encodeURIComponent("Passer en Pro")}`}>Passer en Pro</a>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
