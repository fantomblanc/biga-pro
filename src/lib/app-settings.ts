import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PublicAppSettings {
  app_name: string;
  paypal_email: string;
  buy_me_a_coffee_username: string;
  contact_email: string;
  banner_message: string;
  banner_active: boolean;
  banner_type: string; // info | new | maintenance
  banner_url: string;
  maintenance_mode: boolean;
  max_recipes_per_user: number; // 0 = illimité
  allow_signups: boolean;
  default_hydration: number;
  default_ball_weight: number;
  default_biga_pct: number;
  default_dough_temp: number;
  app_version: string;
  changelog: string;
  ga_measurement_id: string;
  ga_enabled: boolean;
}

export const DEFAULT_APP_SETTINGS: PublicAppSettings = {
  app_name: "CarpiBiga Pro",
  paypal_email: "fantomblanc@gmail.com",
  buy_me_a_coffee_username: "",
  contact_email: "fantomblanc@gmail.com",
  banner_message: "",
  banner_active: false,
  banner_type: "info",
  banner_url: "",
  maintenance_mode: false,
  max_recipes_per_user: 0,
  allow_signups: true,
  default_hydration: 65,
  default_ball_weight: 270,
  default_biga_pct: 100,
  default_dough_temp: 23,
  app_version: "v1.0.0",
  changelog: "",
  ga_measurement_id: "",
  ga_enabled: false,
};

export async function fetchAppSettings(): Promise<PublicAppSettings> {
  const { data } = await (supabase as any).from("app_settings").select("*").eq("id", 1).maybeSingle();
  return { ...DEFAULT_APP_SETTINGS, ...(data ?? {}) };
}

export function useAppSettings() {
  const [s, setS] = useState<PublicAppSettings>(DEFAULT_APP_SETTINGS);
  useEffect(() => {
    fetchAppSettings().then(setS).catch(() => {});
  }, []);
  return s;
}
