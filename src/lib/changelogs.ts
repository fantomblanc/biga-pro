import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
export type Changelog = Tables<"changelogs">;
export const changelogsOptions = queryOptions({ queryKey: ["changelogs"], queryFn: async () => {
  const { data, error } = await supabase.from("changelogs").select("*").order("date", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}, refetchInterval: 60_000 });
export function localizedChangelog(row: Changelog, lang: string) {
  if (lang === "nl" && row.title_nl) return { title: row.title_nl, content: row.content_nl };
  const translations = row.translations as Record<string, { title?: string; content?: string }> | null;
  const entry = translations?.[lang];
  return { title: entry?.title ?? row.title_fr, content: entry?.content ?? row.content_fr };
}