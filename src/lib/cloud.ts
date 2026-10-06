import { supabase } from "@/integrations/supabase/client";
import type { SavedRecipe, AppSettings } from "@/lib/storage";
import type { Json } from "@/integrations/supabase/types";

export interface BakeLog {
  id?: string;
  recipeId?: string | null;
  recipeName: string;
  recipeSnapshot?: unknown;
  ratingCrumb?: number | null;
  ratingChew?: number | null;
  ratingCornicione?: number | null;
  comment: string;
  photos: string[];
  bakedAt?: string;
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

function rowToRecipe(row: {
  id: string;
  name: string;
  created_at: string;
  inputs: Json;
  calc: Json;
  timeline: Json;
  final_proof_h: number;
  notes: string;
  photos: Json;
  custom_bake_voute: Json | null;
  custom_bake_sole: Json | null;
  is_shared: boolean;
  share_token: string;
}): SavedRecipe {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    inputs: row.inputs as unknown as SavedRecipe["inputs"],
    calc: row.calc as unknown as SavedRecipe["calc"],
    timeline: row.timeline as unknown as SavedRecipe["timeline"],
    finalProofH: row.final_proof_h,
    notes: row.notes,
    photos: (row.photos as unknown as string[]) ?? [],
    customBakeVoute: (row.custom_bake_voute as unknown as [number, number] | null) ?? undefined,
    customBakeSole: (row.custom_bake_sole as unknown as [number, number] | null) ?? undefined,
    isShared: row.is_shared,
    shareToken: row.share_token,
  };
}

export async function listRecipes(): Promise<SavedRecipe[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToRecipe);
}

export async function getRecipe(id: string): Promise<SavedRecipe | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRecipe(data) : null;
}

export async function saveRecipe(r: SavedRecipe): Promise<SavedRecipe> {
  const userId = await requireUserId();
  // Enforce per-user recipe limit (0 = unlimited)
  const { data: settingsRow } = await (supabase as any)
    .from("app_settings").select("max_recipes_per_user").eq("id", 1).maybeSingle();
  const limit = settingsRow?.max_recipes_per_user ?? 0;
  if (limit > 0) {
    const { count } = await supabase
      .from("recipes").select("id", { count: "exact", head: true })
      .eq("user_id", userId).neq("id", r.id);
    if ((count ?? 0) >= limit) {
      throw new Error(`Limite de ${limit} recettes atteinte. Supprimez une recette pour en créer une nouvelle.`);
    }
  }
  const payload = {
    id: r.id,
    user_id: userId,
    name: r.name,
    inputs: r.inputs as unknown as Json,
    calc: r.calc as unknown as Json,
    timeline: r.timeline as unknown as Json,
    final_proof_h: r.finalProofH,
    notes: r.notes,
    photos: r.photos as unknown as Json,
    custom_bake_voute: (r.customBakeVoute ?? null) as unknown as Json,
    custom_bake_sole: (r.customBakeSole ?? null) as unknown as Json,
  };
  const { data, error } = await supabase
    .from("recipes")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return rowToRecipe(data);
}

export async function removeRecipe(id: string): Promise<void> {
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  if (error) throw error;
}

export async function shareRecipe(id: string): Promise<string> {
  const { data, error } = await supabase
    .from("recipes")
    .update({ is_shared: true })
    .eq("id", id)
    .select("share_token")
    .single();
  if (error) throw error;
  return `${window.location.origin}/share/${data.share_token}`;
}

export async function unshareRecipe(id: string): Promise<void> {
  const { error } = await supabase.from("recipes").update({ is_shared: false }).eq("id", id);
  if (error) throw error;
}

export async function getSharedRecipe(token: string): Promise<SavedRecipe | null> {
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("share_token", token)
    .eq("is_shared", true)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRecipe(data) : null;
}

export async function uploadPhoto(recipeId: string, file: File): Promise<string> {
  const userId = await requireUserId();
  const path = `${userId}/${recipeId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("recipe-photos").upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

export async function photoUrl(pathOrDataUrl: string): Promise<string> {
  if (pathOrDataUrl.startsWith("data:") || pathOrDataUrl.startsWith("http")) return pathOrDataUrl;
  const { data, error } = await supabase.storage
    .from("recipe-photos")
    .createSignedUrl(pathOrDataUrl, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function deletePhoto(path: string): Promise<void> {
  if (path.startsWith("data:") || path.startsWith("http")) return;
  const { error } = await supabase.storage.from("recipe-photos").remove([path]);
  if (error) throw error;
}

function rowToBakeLog(row: {
  id: string;
  recipe_id: string | null;
  recipe_name: string;
  recipe_snapshot: Json | null;
  rating_crumb: number | null;
  rating_chew: number | null;
  rating_cornicione: number | null;
  comment: string;
  photos: Json;
  baked_at: string;
}): BakeLog {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    recipeName: row.recipe_name,
    recipeSnapshot: row.recipe_snapshot ?? undefined,
    ratingCrumb: row.rating_crumb,
    ratingChew: row.rating_chew,
    ratingCornicione: row.rating_cornicione,
    comment: row.comment,
    photos: (row.photos as unknown as string[]) ?? [],
    bakedAt: row.baked_at,
  };
}

export async function listBakeLogs(): Promise<BakeLog[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("bake_logs")
    .select("*")
    .eq("user_id", userId)
    .order("baked_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToBakeLog);
}

export async function saveBakeLog(l: BakeLog): Promise<BakeLog> {
  const userId = await requireUserId();
  const payload = {
    ...(l.id ? { id: l.id } : {}),
    user_id: userId,
    recipe_id: l.recipeId ?? null,
    recipe_name: l.recipeName,
    recipe_snapshot: (l.recipeSnapshot ?? null) as unknown as Json,
    rating_crumb: l.ratingCrumb ?? null,
    rating_chew: l.ratingChew ?? null,
    rating_cornicione: l.ratingCornicione ?? null,
    comment: l.comment,
    photos: l.photos as unknown as Json,
    ...(l.bakedAt ? { baked_at: l.bakedAt } : {}),
  };
  const { data, error } = await supabase.from("bake_logs").upsert(payload).select("*").single();
  if (error) throw error;
  return rowToBakeLog(data);
}

export async function removeBakeLog(id: string): Promise<void> {
  const { error } = await supabase.from("bake_logs").delete().eq("id", id);
  if (error) throw error;
}

export async function getCloudSettings(): Promise<AppSettings> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return { notificationsEnabled: data?.notifications_enabled ?? false };
}

export async function saveCloudSettings(s: AppSettings): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId, notifications_enabled: s.notificationsEnabled });
  if (error) throw error;
}
