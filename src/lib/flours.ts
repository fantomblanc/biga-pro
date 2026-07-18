// Curated database of common Italian pizza flours with average W value
// and manufacturer-recommended hydration ranges.

export type FlourCat = "medium" | "strong" | "very_strong";

export interface FlourRef {
  id: string;
  brand: string;
  name: string;
  w: number;
  hydrMin: number;
  hydrMax: number;
  category: FlourCat;
}

export const FLOURS: FlourRef[] = [
  { id: "caputo_pizzeria",         brand: "Caputo",         name: "Pizzeria (blue)",     w: 260, hydrMin: 55, hydrMax: 62, category: "medium" },
  { id: "caputo_classica",         brand: "Caputo",         name: "Classica",            w: 250, hydrMin: 55, hydrMax: 62, category: "medium" },
  { id: "caputo_nuvola",           brand: "Caputo",         name: "Nuvola",              w: 270, hydrMin: 60, hydrMax: 70, category: "medium" },
  { id: "caputo_cuoco",            brand: "Caputo",         name: "Cuoco / Saccorosso",  w: 310, hydrMin: 65, hydrMax: 75, category: "strong" },
  { id: "caputo_nuvola_super",     brand: "Caputo",         name: "Nuvola Super",        w: 325, hydrMin: 70, hydrMax: 80, category: "strong" },
  { id: "caputo_manitoba",         brand: "Caputo",         name: "Manitoba Oro",        w: 380, hydrMin: 70, hydrMax: 85, category: "very_strong" },
  { id: "stagioni_napoletana",     brand: "5 Stagioni",     name: "Napoletana",          w: 300, hydrMin: 60, hydrMax: 70, category: "strong" },
  { id: "stagioni_superiore",      brand: "5 Stagioni",     name: "Superiore",           w: 340, hydrMin: 65, hydrMax: 75, category: "strong" },
  { id: "pivetti_mimosa",          brand: "Pivetti",        name: "Mimosa",              w: 290, hydrMin: 60, hydrMax: 70, category: "medium" },
  { id: "dalla_napoletana",        brand: "Dallagiovanna",  name: "Napoletana",          w: 320, hydrMin: 65, hydrMax: 75, category: "strong" },
  { id: "polselli_super",          brand: "Polselli",       name: "Super",               w: 360, hydrMin: 70, hydrMax: 80, category: "very_strong" },
  { id: "petra_1",                 brand: "Petra",          name: "Petra 1",             w: 360, hydrMin: 70, hydrMax: 80, category: "very_strong" },
];

export const FLOURS_BY_CATEGORY: Record<FlourCat, FlourRef[]> = {
  medium: FLOURS.filter((f) => f.category === "medium"),
  strong: FLOURS.filter((f) => f.category === "strong"),
  very_strong: FLOURS.filter((f) => f.category === "very_strong"),
};

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
