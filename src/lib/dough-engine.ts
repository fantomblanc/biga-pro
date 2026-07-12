// Dough calculation engine.
// Biga: 80% of flour at 50% hydration, yeast via cellar-temp curve (Giorilli-inspired).
// Direct 72h: 0.15% fresh yeast equivalent, cold fermentation.

export type EngineType = "biga" | "direct";
export type YeastType = "fresh" | "dry";

export interface RecipeInputs {
  engine: EngineType;
  ballsCount: number;
  ballWeight: number; // g
  hydration: number; // 0-100
  saltPct: number; // % of total flour
  yeastType: YeastType;
  flourW: number; // e.g. 300
  useMalt: boolean;
  maltPct: number; // % of total flour (0.5-1)
  useOil: boolean;
  oilPct: number; // % of total flour (1-3)
  cellarTemp: number; // °C
  targetBakeISO: string; // datetime string
}

export interface RecipeCalc {
  totalDough: number;
  totalFlour: number;
  totalWater: number;
  totalSalt: number;
  totalMalt: number;
  totalOil: number;
  // Biga breakdown
  bigaFlour: number;
  bigaWater: number;
  bigaYeastFresh: number; // grams fresh yeast
  bigaYeastShown: number; // grams shown (fresh or dry)
  refreshFlour: number;
  refreshWater: number;
  bassinageWater: number; // 15% of total water
  // Direct breakdown
  directYeastFresh: number;
  directYeastShown: number;
  // Warnings
  flourWarning: boolean;
  cellarWarning: boolean;
}

/**
 * Giorilli-inspired yeast curve for Biga (16-18h maturity).
 * Approximate percentages of fresh yeast relative to BIGA FLOUR by temperature.
 * Warmer cellar → less yeast. Colder cellar → more yeast.
 */
function bigaYeastPctByTemp(tempC: number): number {
  // Clamp
  const t = Math.max(12, Math.min(24, tempC));
  // Empirical linear-ish interpolation between anchor points
  // 14°C -> 1.2%, 16°C -> 1.0%, 18°C -> 0.8%, 20°C -> 0.6%, 22°C -> 0.5%, 24°C -> 0.4%
  const anchors: [number, number][] = [
    [12, 1.5], [14, 1.2], [16, 1.0], [18, 0.8],
    [20, 0.6], [22, 0.5], [24, 0.4],
  ];
  for (let i = 0; i < anchors.length - 1; i++) {
    const [t1, p1] = anchors[i];
    const [t2, p2] = anchors[i + 1];
    if (t >= t1 && t <= t2) {
      const ratio = (t - t1) / (t2 - t1);
      return p1 + (p2 - p1) * ratio;
    }
  }
  return 1.0;
}

export function calculateRecipe(inp: RecipeInputs): RecipeCalc {
  const hydrRatio = inp.hydration / 100;
  const saltRatio = inp.saltPct / 100;
  const maltRatio = inp.useMalt ? inp.maltPct / 100 : 0;
  const oilRatio = inp.useOil ? inp.oilPct / 100 : 0;

  const totalDough = inp.ballsCount * inp.ballWeight;

  // Total dough = flour + water + salt + malt + oil
  // = flour * (1 + hydr + salt + malt + oil)
  const divisor = 1 + hydrRatio + saltRatio + maltRatio + oilRatio;
  const totalFlour = totalDough / divisor;
  const totalWater = totalFlour * hydrRatio;
  const totalSalt = totalFlour * saltRatio;
  const totalMalt = totalFlour * maltRatio;
  const totalOil = totalFlour * oilRatio;

  // Biga phase: 80% of flour at 50% hydration
  const bigaFlour = totalFlour * 0.8;
  const bigaWater = bigaFlour * 0.5;

  const bigaYeastPct = bigaYeastPctByTemp(inp.cellarTemp);
  const bigaYeastFresh = bigaFlour * (bigaYeastPct / 100);
  const bigaYeastShown = inp.yeastType === "dry" ? bigaYeastFresh / 3 : bigaYeastFresh;

  // Refreshment (Day 2)
  const refreshFlour = totalFlour * 0.2;
  const refreshWater = totalWater - bigaWater;
  const bassinageWater = totalWater * 0.15;

  // Direct 72h: 0.15% fresh yeast on total flour
  const directYeastFresh = totalFlour * 0.0015;
  const directYeastShown = inp.yeastType === "dry" ? directYeastFresh / 3 : directYeastFresh;

  return {
    totalDough,
    totalFlour,
    totalWater,
    totalSalt,
    totalMalt,
    totalOil,
    bigaFlour,
    bigaWater,
    bigaYeastFresh,
    bigaYeastShown,
    refreshFlour,
    refreshWater,
    bassinageWater,
    directYeastFresh,
    directYeastShown,
    flourWarning: inp.flourW < 300,
    cellarWarning: inp.cellarTemp > 19,
  };
}

// Water temp: Rule of 55
export function calculateWaterTemp(room: number, flour: number, friction: number): number {
  return 55 - (room + flour + friction);
}

// Final proof recalibration based on kitchen temp
export function calcFinalProofHours(kitchenTempC: number): number {
  // Linear-ish: 20°C -> 4h, 22°C -> 3h, 24°C -> 2.5h, 26°C -> 2h, 28°C -> 1.5h
  const t = Math.max(16, Math.min(30, kitchenTempC));
  if (t <= 20) return 4 + (20 - t) * 0.5;
  if (t <= 24) return 4 - (t - 20) * 0.375; // 20->4, 24->2.5
  return Math.max(1, 2.5 - (t - 24) * 0.25);
}

export interface TimelineStep {
  id: string;
  labelKey: string; // translation key
  zone: "cellar" | "fridge" | "final" | "bake";
  timeISO: string;
}

export function buildTimeline(inp: RecipeInputs, finalProofH: number): TimelineStep[] {
  const bake = new Date(inp.targetBakeISO).getTime();
  const h = 3600_000;

  if (inp.engine === "biga") {
    // Bake time
    // - proof start = bake - finalProofH
    // - fridge end = proof start
    // - fridge start = refreshment end (assume kneading 30min)
    // - refreshment start = biga end = 16-18h after biga start (use 17h)
    // - biga start = refreshment - 17h
    const proofStart = bake - finalProofH * h;
    const fridgeEnd = proofStart;
    const knead = 0.5 * h;
    // 24h cold block for biga variant
    const fridgeStart = fridgeEnd - 24 * h;
    const refreshmentStart = fridgeStart - knead;
    const bigaStart = refreshmentStart - 17 * h;
    return [
      { id: "biga_start", labelKey: "step_biga_start", zone: "cellar", timeISO: new Date(bigaStart).toISOString() },
      { id: "refresh", labelKey: "step_biga_end", zone: "cellar", timeISO: new Date(refreshmentStart).toISOString() },
      { id: "fridge_start", labelKey: "step_fridge_start", zone: "fridge", timeISO: new Date(fridgeStart).toISOString() },
      { id: "fridge_end", labelKey: "step_fridge_end", zone: "fridge", timeISO: new Date(fridgeEnd).toISOString() },
      { id: "proof_start", labelKey: "step_proof_start", zone: "final", timeISO: new Date(proofStart).toISOString() },
      { id: "bake", labelKey: "step_bake", zone: "bake", timeISO: new Date(bake).toISOString() },
    ];
  } else {
    // Direct 72h: mix -> straight to fridge for ~72h -> proof at room temp -> bake
    const proofStart = bake - finalProofH * h;
    const fridgeEnd = proofStart;
    const fridgeStart = fridgeEnd - 72 * h;
    const mixStart = fridgeStart - 0.75 * h;
    return [
      { id: "mix", labelKey: "step_biga_end", zone: "cellar", timeISO: new Date(mixStart).toISOString() },
      { id: "fridge_start", labelKey: "step_fridge_start", zone: "fridge", timeISO: new Date(fridgeStart).toISOString() },
      { id: "fridge_end", labelKey: "step_fridge_end", zone: "fridge", timeISO: new Date(fridgeEnd).toISOString() },
      { id: "proof_start", labelKey: "step_proof_start", zone: "final", timeISO: new Date(proofStart).toISOString() },
      { id: "bake", labelKey: "step_bake", zone: "bake", timeISO: new Date(bake).toISOString() },
    ];
  }
}
