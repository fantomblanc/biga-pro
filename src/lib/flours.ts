// Curated database of pizza flours: supermarket brands and professional /
// pizzeria flours, with average W value, protein content, manufacturer
// hydration range and recommended use.

export type FlourCat = "medium" | "strong" | "very_strong";

export interface FlourRef {
  id: string;
  brand: string;
  name: string;
  /** Strength (W index). */
  w: number;
  /** Protein content in g/100 g. */
  protein: number;
  hydrMin: number;
  hydrMax: number;
  category: FlourCat;
  /** i18n key describing the recommended use (direct short, biga 16 h, ...). */
  useKey: string;
}

function cat(w: number): FlourCat {
  if (w < 300) return "medium";
  if (w <= 350) return "strong";
  return "very_strong";
}

type Row = Omit<FlourRef, "category">;

const ROWS: Row[] = [
  /* ---------------- Supermarket / retail ---------------- */
  { id: "belbake_wheat_405",     brand: "Belbake (Lidl)",     name: "Weizenmehl Type 405 / T45",   w: 170, protein: 10,   hydrMin: 55, hydrMax: 60, useKey: "use_direct_short" },
  { id: "belbake_pizza",         brand: "Belbake (Lidl)",     name: "Farine spéciale Pizza",       w: 220, protein: 11,   hydrMin: 55, hydrMax: 62, useKey: "use_direct_short" },
  { id: "belbake_manitoba",      brand: "Belbake (Lidl)",     name: "Manitoba / Type 550",         w: 300, protein: 13,   hydrMin: 62, hydrMax: 70, useKey: "use_biga_16" },
  { id: "carrefour_t55",         brand: "Carrefour",          name: "Farine de blé T55",           w: 180, protein: 10.5, hydrMin: 55, hydrMax: 60, useKey: "use_direct_short" },
  { id: "carrefour_t45_gruau",   brand: "Carrefour",          name: "Farine de gruau T45",         w: 260, protein: 12,   hydrMin: 58, hydrMax: 65, useKey: "use_direct_24" },
  { id: "carrefour_pizza",       brand: "Carrefour",          name: "Farine Pizza & Pâtes",        w: 230, protein: 11.5, hydrMin: 55, hydrMax: 63, useKey: "use_direct_short" },
  { id: "francine_t45",          brand: "Francine",           name: "Farine de blé T45",           w: 180, protein: 10,   hydrMin: 55, hydrMax: 60, useKey: "use_direct_short" },
  { id: "francine_pizza",        brand: "Francine",           name: "Farine spéciale Pizza",       w: 220, protein: 11,   hydrMin: 55, hydrMax: 62, useKey: "use_direct_short" },
  { id: "francine_gruau",        brand: "Francine",           name: "Farine de gruau (Grand Cru)", w: 270, protein: 12.5, hydrMin: 58, hydrMax: 66, useKey: "use_direct_24" },
  { id: "soubry_pizza",          brand: "Soubry",             name: "Farine Pizza",                w: 230, protein: 11.5, hydrMin: 55, hydrMax: 63, useKey: "use_direct_short" },
  { id: "soubry_t55",            brand: "Soubry",             name: "Farine froment T55",          w: 190, protein: 10.5, hydrMin: 55, hydrMax: 60, useKey: "use_direct_short" },
  { id: "repere_00",             brand: "Marque Repère",      name: "Farina 00 Pizza",             w: 240, protein: 11.5, hydrMin: 55, hydrMax: 63, useKey: "use_direct_24" },
  { id: "auchan_00",             brand: "Auchan",             name: "Farine 00 Pizza",             w: 230, protein: 11,   hydrMin: 55, hydrMax: 62, useKey: "use_direct_short" },
  { id: "barilla_00",            brand: "Barilla",            name: "Farina 00 Pizza e Focaccia",  w: 250, protein: 11.5, hydrMin: 57, hydrMax: 64, useKey: "use_direct_24" },
  { id: "spadoni_pz2",           brand: "Molino Spadoni",     name: "PZ2 Pizza Napoletana",        w: 280, protein: 12.5, hydrMin: 60, hydrMax: 68, useKey: "use_direct_24" },
  { id: "spadoni_pz3",           brand: "Molino Spadoni",     name: "PZ3 Gran Mugnaio",            w: 320, protein: 13.5, hydrMin: 65, hydrMax: 75, useKey: "use_biga_24" },
  { id: "lo_conte_blu",          brand: "Lo Conte",           name: "Le Farine Magiche Blu",       w: 260, protein: 12,   hydrMin: 58, hydrMax: 65, useKey: "use_direct_24" },
  { id: "manitoba_generic",      brand: "Generic",            name: "Manitoba (supermarket)",      w: 350, protein: 14,   hydrMin: 65, hydrMax: 80, useKey: "use_biga_24" },

  /* ---------------- Professional / pizzeria ---------------- */
  { id: "caputo_pizzeria",       brand: "Caputo",             name: "Pizzeria (blue)",             w: 260, protein: 12.5, hydrMin: 55, hydrMax: 62, useKey: "use_direct_24" },
  { id: "caputo_classica",       brand: "Caputo",             name: "Classica",                    w: 250, protein: 12,   hydrMin: 55, hydrMax: 62, useKey: "use_direct_short" },
  { id: "caputo_nuvola",         brand: "Caputo",             name: "Nuvola",                      w: 270, protein: 12.5, hydrMin: 60, hydrMax: 70, useKey: "use_direct_24" },
  { id: "caputo_nuvola_super",   brand: "Caputo",             name: "Nuvola Super",                w: 325, protein: 13.5, hydrMin: 70, hydrMax: 80, useKey: "use_biga_24" },
  { id: "caputo_cuoco",          brand: "Caputo",             name: "Cuoco / Saccorosso",          w: 310, protein: 13,   hydrMin: 65, hydrMax: 75, useKey: "use_biga_24" },
  { id: "caputo_pizzeria_verde", brand: "Caputo",             name: "Pizza a Metro (green)",       w: 300, protein: 13,   hydrMin: 65, hydrMax: 75, useKey: "use_biga_16" },
  { id: "caputo_manitoba",       brand: "Caputo",             name: "Manitoba Oro",                w: 380, protein: 14.5, hydrMin: 70, hydrMax: 85, useKey: "use_biga_48" },
  { id: "caputo_integrale",      brand: "Caputo",             name: "Nuvola Integrale",            w: 290, protein: 13,   hydrMin: 65, hydrMax: 75, useKey: "use_biga_16" },
  { id: "stagioni_napoletana",   brand: "5 Stagioni",         name: "Napoletana",                  w: 300, protein: 13,   hydrMin: 60, hydrMax: 70, useKey: "use_biga_16" },
  { id: "stagioni_superiore",    brand: "5 Stagioni",         name: "Superiore",                   w: 340, protein: 13.5, hydrMin: 65, hydrMax: 75, useKey: "use_biga_24" },
  { id: "stagioni_manitoba",     brand: "5 Stagioni",         name: "Manitoba",                    w: 400, protein: 15,   hydrMin: 70, hydrMax: 85, useKey: "use_biga_48" },
  { id: "stagioni_teglia",       brand: "5 Stagioni",         name: "Pizza in Teglia",             w: 330, protein: 13.5, hydrMin: 75, hydrMax: 85, useKey: "use_teglia" },
  { id: "dalla_napoletana",      brand: "Dallagiovanna",      name: "La Napoletana",               w: 320, protein: 13.5, hydrMin: 65, hydrMax: 75, useKey: "use_biga_24" },
  { id: "dalla_uniqua_blu",      brand: "Dallagiovanna",      name: "Uniqua Blu",                  w: 350, protein: 14,   hydrMin: 70, hydrMax: 80, useKey: "use_biga_24" },
  { id: "dalla_uniqua_rossa",    brand: "Dallagiovanna",      name: "Uniqua Rossa",                w: 400, protein: 15,   hydrMin: 70, hydrMax: 85, useKey: "use_biga_48" },
  { id: "dalla_lina_verde",      brand: "Dallagiovanna",      name: "Lina Verde (bio)",            w: 300, protein: 13,   hydrMin: 62, hydrMax: 72, useKey: "use_biga_16" },
  { id: "pivetti_mimosa",        brand: "Pivetti",            name: "Mimosa",                      w: 290, protein: 12.5, hydrMin: 60, hydrMax: 70, useKey: "use_direct_24" },
  { id: "pivetti_manitoba",      brand: "Pivetti",            name: "Manitoba",                    w: 370, protein: 14.5, hydrMin: 70, hydrMax: 82, useKey: "use_biga_48" },
  { id: "polselli_super",        brand: "Polselli",           name: "Super",                       w: 360, protein: 14,   hydrMin: 70, hydrMax: 80, useKey: "use_biga_48" },
  { id: "polselli_classica",     brand: "Polselli",           name: "Classica 00",                 w: 270, protein: 12.5, hydrMin: 58, hydrMax: 66, useKey: "use_direct_24" },
  { id: "petra_1",               brand: "Petra (Molino Quaglia)", name: "Petra 1",                 w: 360, protein: 14,   hydrMin: 70, hydrMax: 80, useKey: "use_biga_48" },
  { id: "petra_3",               brand: "Petra (Molino Quaglia)", name: "Petra 3",                 w: 300, protein: 13,   hydrMin: 62, hydrMax: 72, useKey: "use_biga_16" },
  { id: "petra_9",               brand: "Petra (Molino Quaglia)", name: "Petra 9 (integrale)",     w: 280, protein: 13.5, hydrMin: 65, hydrMax: 75, useKey: "use_direct_24" },
  { id: "marino_buratto",        brand: "Mulino Marino",      name: "Buratto Tipo 2",              w: 260, protein: 12.5, hydrMin: 62, hydrMax: 72, useKey: "use_direct_24" },
  { id: "marino_manitoba",       brand: "Mulino Marino",      name: "Manitoba Tipo 0",             w: 350, protein: 14,   hydrMin: 68, hydrMax: 80, useKey: "use_biga_24" },
  { id: "bonsavoir_t65",         brand: "Bonsavoir",          name: "Farine Pizza T65",            w: 250, protein: 12,   hydrMin: 58, hydrMax: 66, useKey: "use_direct_24" },
  { id: "bonsavoir_gruau",       brand: "Bonsavoir",          name: "Gruau Force 300",             w: 300, protein: 13,   hydrMin: 62, hydrMax: 72, useKey: "use_biga_16" },
  { id: "vigevano_pizza",        brand: "Molino Vigevano",    name: "Pizza Napoletana 00",         w: 300, protein: 13,   hydrMin: 62, hydrMax: 72, useKey: "use_biga_16" },
  { id: "grandi_molini_00",      brand: "Grandi Molini",      name: "Verde Pizzeria 00",           w: 280, protein: 12.5, hydrMin: 60, hydrMax: 68, useKey: "use_direct_24" },
  { id: "denti_teglia",          brand: "Molino Denti",       name: "Teglia Romana",               w: 330, protein: 13.5, hydrMin: 75, hydrMax: 85, useKey: "use_teglia" },
  { id: "moulins_bourgeois_t65", brand: "Moulins Bourgeois",  name: "Tradition T65",               w: 230, protein: 11.5, hydrMin: 58, hydrMax: 66, useKey: "use_direct_short" },
];

export const FLOURS: FlourRef[] = ROWS.map((r) => ({ ...r, category: cat(r.w) }));

export const FLOURS_BY_CATEGORY: Record<FlourCat, FlourRef[]> = {
  medium: FLOURS.filter((f) => f.category === "medium"),
  strong: FLOURS.filter((f) => f.category === "strong"),
  very_strong: FLOURS.filter((f) => f.category === "very_strong"),
};

/** "[BRAND] - Product (W300 | 13 g prot)" */
export function flourLabel(f: FlourRef): string {
  return `${f.brand} - ${f.name} (W${f.w} | ${f.protein}g prot)`;
}

export type FlourSort = "name" | "brand" | "w_asc" | "w_desc";

export const FLOUR_SORTS: FlourSort[] = ["brand", "name", "w_asc", "w_desc"];

export const FLOUR_SORT_LABEL_KEY: Record<FlourSort, string> = {
  brand: "flour_sort_brand",
  name: "flour_sort_name",
  w_asc: "flour_sort_w_asc",
  w_desc: "flour_sort_w_desc",
};

export function sortFlours(list: FlourRef[], sort: FlourSort): FlourRef[] {
  const out = [...list];
  switch (sort) {
    case "name":
      return out.sort((a, b) => a.name.localeCompare(b.name));
    case "w_asc":
      return out.sort((a, b) => a.w - b.w);
    case "w_desc":
      return out.sort((a, b) => b.w - a.w);
    default:
      return out.sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));
  }
}

/** Loose text search over brand, product name and W value. */
export function searchFlours(list: FlourRef[], query: string): FlourRef[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  const terms = q.split(/\s+/);
  return list.filter((f) => {
    const hay = `${f.brand} ${f.name} w${f.w} ${f.protein}`.toLowerCase();
    return terms.every((tk) => hay.includes(tk));
  });
}

/** Total-hours maturation window recommended for a given flour W. */
export function maturationRange(w: number): [number, number] {
  if (w < 220) return [4, 16];
  if (w <= 280) return [12, 36];
  if (w <= 350) return [24, 72];
  return [48, 120];
}

export type MaturationVerdict = "under" | "optimal" | "over";

export function maturationVerdict(totalH: number, w: number): MaturationVerdict {
  const [lo, hi] = maturationRange(w);
  if (totalH < lo) return "under";
  if (totalH > hi) return "over";
  return "optimal";
}

/* ------------------------------------------------------------------ */
/* Compatibility: flour strength vs style and vs mixing method         */
/* ------------------------------------------------------------------ */

/** Minimum reasonable W index per pizza style id. */
export const STYLE_MIN_W: Record<string, number> = {
  napoletana: 240,
  contemporanea: 280,
  canotto: 300,
  teglia: 300,
  focaccia: 300,
  romana: 220,
  pala: 300,
  detroit: 260,
  nyc: 250,
};

export function styleMinW(style: string): number {
  return STYLE_MIN_W[style] ?? 250;
}

/** True when the flour is too weak for the requested style. */
export function isFlourTooWeak(w: number, style: string): boolean {
  return w < styleMinW(style);
}

export type WizardMethod = "direct_short" | "direct_long" | "biga" | "poolish" | "unsure";

export type MethodVerdict = "good" | "bad";

/** Green / red badge for a mixing method given the flour strength. */
export function methodVerdict(w: number, method: WizardMethod): MethodVerdict {
  switch (method) {
    case "direct_short":
      return w <= 300 ? "good" : "bad";
    case "direct_long":
      return w >= 260 ? "good" : "bad";
    case "biga":
      return w >= 300 ? "good" : "bad";
    case "poolish":
      return w >= 260 ? "good" : "bad";
    default:
      return "good";
  }
}
