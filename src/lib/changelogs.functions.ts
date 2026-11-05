import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const publishChangelog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid().optional(), version: z.string().min(1).max(40), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), title_fr: z.string().min(1).max(200), content_fr: z.string().min(1).max(12000), title_nl: z.string().max(200), content_nl: z.string().max(12000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !admin) throw new Error("Forbidden");
    const { translateRelease } = await import("./changelogs.server");
    const result = await translateRelease(data.title_fr, data.content_fr);
    if (!result.ok) return result;
    const translations = { ...result.translations, nl: { title: data.title_nl || result.translations.nl.title, content: data.content_nl || result.translations.nl.content } };
    const payload = { ...data, title_nl: translations.nl.title, content_nl: translations.nl.content, translations };
    const query = data.id ? context.supabase.from("changelogs").update(payload).eq("id", data.id) : context.supabase.from("changelogs").insert(payload);
    const { data: row, error: writeError } = await query.select("*").single();
    if (writeError) return { ok: false as const, error: "Échec de l’enregistrement de la note." };
    return { ok: true as const, row };
  });