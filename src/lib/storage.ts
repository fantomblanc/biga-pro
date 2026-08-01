import type { RecipeInputs, RecipeCalc, TimelineStep } from "./dough-engine";

export interface SavedRecipe {
  id: string;
  name: string;
  createdAt: string;
  inputs: RecipeInputs;
  calc: RecipeCalc;
  timeline: TimelineStep[];
  finalProofH: number;
  notes: string;
  photos: string[]; // base64 data URLs
  customBakeVoute?: [number, number];
  customBakeSole?: [number, number];
  isShared?: boolean;
  shareToken?: string;
}

const RECIPES_KEY = "carpibiga_recipes";
const ACTIVE_KEY = "carpibiga_active";
const SETTINGS_KEY = "carpibiga_settings";

export interface AppSettings {
  notificationsEnabled: boolean;
}

function safeLS() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function loadRecipes(): SavedRecipe[] {
  const ls = safeLS();
  if (!ls) return [];
  try {
    return JSON.parse(ls.getItem(RECIPES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveRecipes(recipes: SavedRecipe[]) {
  const ls = safeLS();
  if (!ls) return;
  ls.setItem(RECIPES_KEY, JSON.stringify(recipes));
}

export function upsertRecipe(r: SavedRecipe) {
  const all = loadRecipes();
  const idx = all.findIndex((x) => x.id === r.id);
  if (idx >= 0) all[idx] = r;
  else all.unshift(r);
  saveRecipes(all);
}

export function deleteRecipe(id: string) {
  saveRecipes(loadRecipes().filter((r) => r.id !== id));
  const active = loadActiveId();
  if (active === id) clearActiveId();
}

export function loadRecipe(id: string): SavedRecipe | null {
  return loadRecipes().find((r) => r.id === id) ?? null;
}

export function loadActiveId(): string | null {
  const ls = safeLS();
  if (!ls) return null;
  return ls.getItem(ACTIVE_KEY);
}

export function setActiveId(id: string) {
  const ls = safeLS();
  if (!ls) return;
  ls.setItem(ACTIVE_KEY, id);
}

export function clearActiveId() {
  const ls = safeLS();
  if (!ls) return;
  ls.removeItem(ACTIVE_KEY);
}

export function loadSettings(): AppSettings {
  const ls = safeLS();
  if (!ls) return { notificationsEnabled: false };
  try {
    return JSON.parse(ls.getItem(SETTINGS_KEY) || "{}") as AppSettings;
  } catch {
    return { notificationsEnabled: false };
  }
}

export function saveSettings(s: AppSettings) {
  const ls = safeLS();
  if (!ls) return;
  ls.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
