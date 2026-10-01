import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PublicAppSettings {
  app_name: string;
  paypal_email: string;
  buy_me_a_coffee_username: string;
  contact_email: string;
  banner_message: string;
  banner_active: boolean;
}

export const DEFAULT_APP_SETTINGS: PublicAppSettings = {
  app_name: "CarpiBiga Pro",
  paypal_email: "fantomblanc@gmail.com",
  buy_me_a_coffee_username: "",
  contact_email: "fantomblanc@gmail.com",
  banner_message: "",
  banner_active: false,
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
