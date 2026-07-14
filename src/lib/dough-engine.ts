// Dough calculation engine.
// Biga: user-selectable % of total flour (20–100) at 50% hydration, yeast via cellar-temp curve (Giorilli-inspired).
// Direct 72h: 0.15% fresh yeast equivalent, cold-blocked at 4°C; room temp only drives bulk & final proof.

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
  cellarTemp: number; // °C — cellar (biga) or kitchen/room (direct)
  targetBakeISO: string; // datetime string
  bigaPct?: number; // % of total flour that goes into the Biga (20-100). Default 80.
}

export interface RecipeCalc {
  totalDough: number;
  totalFlour: number;
  totalWater: number;
  totalSalt: number;
  totalMalt: number;
  totalOil: number;
  // Biga breakdown
  bigaPct: number; // 20-100
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
  bulkFermentMin: number; // minutes at room temp before fridge (Direct engine)
  bulkTooHot: boolean; // room temp > 25°C warning
  // Baking temperatures (°C ranges)
  bakeVoute: [number, number];
  bakeSole: [number, number];
  bakeTipKey: string; // i18n key for technical tip
  // Warnings
  flourWarning: boolean;
  cellarWarning: boolean;
}

/**
 * Giorilli-inspired yeast curve for Biga (16-18h maturity).
 * Approximate percentages of fresh yeast relative to BIGA FLOUR by temperature.
 */
function bigaYeastPctByTemp(tempC: number): number {
  const t = Math.max(12, Math.min(24, tempC));
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

/** Room-temp bulk ferment (minutes) for the Direct 72h engine. */
export function calcBulkFermentMin(roomTempC: number): number {
  if (roomTempC < 20) return 45;
  if (roomTempC <= 22) return 30;
  if (roomTempC <= 25) return 20;
  return 15;
}

/** Ideal Voûte / Sole temperature bands and a technical tip i18n key. */
export function calcBakingTemps(engine: EngineType, hydration: number): {
  voute: [number, number]; sole: [number, number]; tipKey: string;
} {
  if (engine === "direct") {
    return { voute: [400, 420], sole: [360, 380], tipKey: "bake_tip_direct" };
  }
  if (hydration < 67) {
    return { voute: [430, 450], sole: [380, 400], tipKey: "bake_tip_biga_low" };
  }
  return { voute: [420, 440], sole: [350, 370], tipKey: "bake_tip_biga_high" };
}

export function calculateRecipe(inp: RecipeInputs): RecipeCalc {
  const hydrRatio = inp.hydration / 100;
  const saltRatio = inp.saltPct / 100;
  const maltRatio = inp.useMalt ? inp.maltPct / 100 : 0;
  const oilRatio = inp.useOil ? inp.oilPct / 100 : 0;

  const totalDough = inp.ballsCount * inp.ballWeight;
  const divisor = 1 + hydrRatio + saltRatio + maltRatio + oilRatio;
  const totalFlour = totalDough / divisor;
  const totalWater = totalFlour * hydrRatio;
  const totalSalt = totalFlour * saltRatio;
  const totalMalt = totalFlour * maltRatio;
  const totalOil = totalFlour * oilRatio;

  // Biga phase: N% of flour at 50% hydration
  const bigaPct = Math.min(100, Math.max(20, inp.bigaPct ?? 80));
  const bigaFlour = totalFlour * (bigaPct / 100);
  const bigaWater = bigaFlour * 0.5;

  const bigaYeastPct = bigaYeastPctByTemp(inp.cellarTemp);
  const bigaYeastFresh = bigaFlour * (bigaYeastPct / 100);
  const bigaYeastShown = inp.yeastType === "dry" ? bigaYeastFresh / 3 : bigaYeastFresh;

  // Refreshment (Day 2)
  const refreshFlour = totalFlour - bigaFlour;
  const refreshWater = Math.max(0, totalWater - bigaWater);
  const bassinageWater = totalWater * 0.15;

  // Direct 72h: fixed 0.15% fresh yeast on total flour (cold-blocked, independent of room temp)
  const directYeastFresh = totalFlour * 0.0015;
  const directYeastShown = inp.yeastType === "dry" ? directYeastFresh / 3 : directYeastFresh;

  const bulkFermentMin = calcBulkFermentMin(inp.cellarTemp);
  const bulkTooHot = inp.engine === "direct" && inp.cellarTemp > 25;

  const bt = calcBakingTemps(inp.engine, inp.hydration);

  return {
    totalDough,
    totalFlour,
    totalWater,
    totalSalt,
    totalMalt,
    totalOil,
    bigaPct,
    bigaFlour,
    bigaWater,
    bigaYeastFresh,
    bigaYeastShown,
    refreshFlour,
    refreshWater,
    bassinageWater,
    directYeastFresh,
    directYeastShown,
    bulkFermentMin,
    bulkTooHot,
    bakeVoute: bt.voute,
    bakeSole: bt.sole,
    bakeTipKey: bt.tipKey,
    flourWarning: inp.flourW < 300,
    cellarWarning: inp.engine === "biga" && inp.cellarTemp > 19,
  };
}

// Water temp: Rule of 55
export function calculateWaterTemp(room: number, flour: number, friction: number): number {
  return 55 - (room + flour + friction);
}

// Final proof recalibration based on kitchen temp
export function calcFinalProofHours(kitchenTempC: number): number {
  const t = Math.max(16, Math.min(30, kitchenTempC));
  if (t <= 20) return 4 + (20 - t) * 0.5;
  if (t <= 24) return 4 - (t - 20) * 0.375;
  return Math.max(1, 2.5 - (t - 24) * 0.25);
}

export interface TimelineStep {
  id: string;
  labelKey: string;
  zone: "cellar" | "fridge" | "final" | "bake";
  timeISO: string;
}

export function buildTimeline(inp: RecipeInputs, finalProofH: number): TimelineStep[] {
  const bake = new Date(inp.targetBakeISO).getTime();
  const h = 3600_000;

  if (inp.engine === "biga") {
    const proofStart = bake - finalProofH * h;
    const fridgeEnd = proofStart;
    const knead = 0.5 * h;
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
    // Direct 72h: Kneading -> Bulk (room temp) -> Fridge (4°C) -> Final proof (room) -> Bake
    // Total cold-block held constant at 72h regardless of bulk length.
    const bulkMin = calcBulkFermentMin(inp.cellarTemp);
    const proofStart = bake - finalProofH * h;
    const fridgeEnd = proofStart;
    const fridgeStart = fridgeEnd - 72 * h;
    const bulkStart = fridgeStart - bulkMin * 60_000;
    const mixStart = bulkStart - 0.5 * h; // 30 min kneading
    return [
      { id: "mix", labelKey: "step_knead", zone: "cellar", timeISO: new Date(mixStart).toISOString() },
      { id: "bulk", labelKey: "step_bulk", zone: "cellar", timeISO: new Date(bulkStart).toISOString() },
      { id: "fridge_start", labelKey: "step_fridge_start", zone: "fridge", timeISO: new Date(fridgeStart).toISOString() },
      { id: "fridge_end", labelKey: "step_fridge_end", zone: "fridge", timeISO: new Date(fridgeEnd).toISOString() },
      { id: "proof_start", labelKey: "step_proof_start", zone: "final", timeISO: new Date(proofStart).toISOString() },
      { id: "bake", labelKey: "step_bake", zone: "bake", timeISO: new Date(bake).toISOString() },
    ];
  }
}
