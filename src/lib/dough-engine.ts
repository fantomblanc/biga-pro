// Dough calculation engine.
// Biga: user-selectable % of total flour (20–100) at 50% hydration, yeast via cellar-temp curve (Giorilli-inspired).
// Poolish: user-selectable % of total flour (20–100) at 100% hydration, yeast via room-temp curve.
// Direct 72h: 0.15% fresh yeast equivalent, cold-blocked at 4°C; room temp only drives bulk & final proof.

import {
  REFRESH_FRICTION,
  bigaWaterTemp as bigaWaterTempThermo,
  refreshWaterTemp as refreshWaterTempThermo,
  directWaterTemp as directWaterTempThermo,
  type KneadMode,
} from "./dough-thermo";

export type EngineType = "biga" | "direct";
export type YeastType = "fresh" | "dry";
export type PreFermentType = "biga" | "poolish";
export type PizzaStyle =
  | "napoletana"
  | "contemporanea"
  | "canotto"
  | "focaccia"
  | "romana"
  | "teglia";

export interface StyleConfig {
  hydrMin: number;
  hydrMax: number;
  allowIndirect: boolean;
  labelKey: string;
  descKey: string;
}

export const STYLE_CONFIG: Record<PizzaStyle, StyleConfig> = {
  napoletana:    { hydrMin: 55, hydrMax: 62, allowIndirect: false, labelKey: "style_napoletana",    descKey: "style_napoletana_desc" },
  contemporanea: { hydrMin: 63, hydrMax: 70, allowIndirect: true,  labelKey: "style_contemporanea", descKey: "style_contemporanea_desc" },
  canotto:       { hydrMin: 70, hydrMax: 75, allowIndirect: true,  labelKey: "style_canotto",       descKey: "style_canotto_desc" },
  focaccia:      { hydrMin: 75, hydrMax: 85, allowIndirect: true,  labelKey: "style_focaccia",      descKey: "style_focaccia_desc" },
  romana:        { hydrMin: 55, hydrMax: 60, allowIndirect: false, labelKey: "style_romana",        descKey: "style_romana_desc" },
  teglia:        { hydrMin: 75, hydrMax: 85, allowIndirect: true,  labelKey: "style_teglia",        descKey: "style_teglia_desc" },
};

export const PIZZA_STYLES: PizzaStyle[] = ["napoletana", "contemporanea", "canotto", "focaccia", "romana", "teglia"];

export function styleMidpoint(s: PizzaStyle): number {
  const c = STYLE_CONFIG[s];
  return Math.round((c.hydrMin + c.hydrMax) / 2);
}

export function clampHydrationToStyle(h: number, s?: PizzaStyle): number {
  if (!s) return h;
  const c = STYLE_CONFIG[s];
  return Math.min(c.hydrMax, Math.max(c.hydrMin, h));
}

export interface TrayConfig {
  count: number;
  lengthCm: number;
  widthCm: number;
  /** g of dough per cm² (0.6 by default). */
  coef: number;
}

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
  bigaPct?: number; // % of total flour that goes into the pre-ferment (20-100). Default 80.
  style?: PizzaStyle; // selected pizza style
  preFerment?: PreFermentType; // "biga" (default) or "poolish" — used only when engine === "biga"

  /* --- Professional extensions (all optional / backwards compatible) --- */
  ovenType?: "domestic" | "gas_high" | "electric_pro";
  /** -100 extensible … 0 balanced … +100 tenacious */
  tenacity?: number;
  autolyse?: import("./dough-pro").AutolyseConfig;
  blend?: import("./dough-pro").FlourBlend;
  prefermentLoc?: import("./dough-pro").PrefermentLocation;
  /** Overrides the pre-ferment hydration (biga 44–50%, default 45; poolish 100%). */
  preFermentHydrPct?: number;
  /** Optional yeast added at refreshment, % of refreshment flour (0–0.3). */
  refreshYeastPct?: number;
  /** Biga fermentation conditions (drives Biga yeast dosage). */
  bigaFermMode?: BigaFermMode;
  bigaRoomTemp?: number;
  bigaHours?: number;
  /** Ambient (kitchen) temperature where mixing happens — drives water temperatures. */
  ambientTemp?: number;
  trays?: TrayConfig;
  mixer?: "hand" | "spiral";
  flourTemp?: number;
  targetDoughTemp?: number;
  /** Water temperature suggested by the professional formula, stored for the protocol. */
  waterTempSuggested?: number;
  /** Bulk rest override in minutes (tenacity arbitration). */
  bulkOverrideMin?: number;
  /** Flour actually available, when scaling in reverse. */
  flourAvailable?: number;
  /** Autolyse water-temperature penalty already applied upstream. */
  autolyseTempPenalty?: number;

  /* --- Thermal modules (two separate calculators) --- */
  /** Kneading equipment for the REFRESHMENT / full knead. */
  kneadMode?: import("./dough-thermo").KneadMode;
  /** Kneading equipment for the BIGA / pre-ferment mix — fully independent. */
  bigaKneadMode?: import("./dough-thermo").KneadMode;
  /** Cellar / storage temperature used for the Biga water calculation. */
  storageTemp?: number;
  /** Measured temperature of the mature pre-ferment. */
  bigaRealTemp?: number;
  /** Temperature of the flour added at refreshment (Biga < 100%). */
  refreshFlourTemp?: number;
  /** Friction of the full knead (°C), user adjustable. */
  refreshFriction?: number;
  /** Real maximum temperature of the user's oven. */
  ovenMaxTempC?: number;
  /** Simplified oven family. */
  simpleOven?: import("./dough-thermo").SimpleOven;
  /** Target ball weight used by the informational preview. */
  targetBallWeight?: number;
  /** Recipe generated by the guided wizard. */
  createdByWizard?: boolean;
  /** Split maturation plan. */
  maturation?: {
    prefermentLoc: import("./dough-pro").PrefermentLocation;
    prefermentHours: number;
    bulkFridgeH: number;
    bulkRoomH: number;
    /** Cold maturation of the shaped balls (fridge 4°C). */
    ballsFridgeH?: number;
    proofRoomH: number;
  };
}






export interface RecipeCalc {
  totalDough: number;
  totalFlour: number;
  totalWater: number;
  totalSalt: number;
  totalMalt: number;
  totalOil: number;
  /** Exact (fractional) number of balls implied by the flour/dough weights. */
  ballsExact: number;
  // Pre-ferment breakdown (biga or poolish)
  preFerment: PreFermentType; // which kind of pre-ferment was used
  bigaPct: number; // 20-100 — share of total flour in the pre-ferment
  /** Actual pre-ferment hydration used (%) — 44–50 for biga, 100 for poolish. */
  preFermentHydrPct: number;
  bigaFlour: number; // pre-ferment flour weight
  bigaWater: number; // pre-ferment water weight = bigaFlour × preFermentHydrPct
  bigaYeastFresh: number; // grams fresh yeast in pre-ferment
  bigaYeastShown: number; // grams shown (fresh or dry)
  refreshFlour: number;
  refreshWater: number;
  /** Optional yeast added at refreshment. */
  refreshYeastPct: number;
  refreshYeastFresh: number;
  refreshYeastShown: number;
  bassinageWater: number; // 15% of total water
  /** Water temperature (°C) for the pre-ferment mix (target dough 19–20°C). */
  bigaWaterTemp: number;
  /** Water temperature (°C) for the refreshment / main mix (target dough 23–24°C). */
  refreshWaterTemp: number;
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

/**
 * Poolish yeast curve for ~12–16h maturity.
 * Approx % fresh yeast relative to POOLISH FLOUR by room temperature.
 */
export type BigaFermMode = "ambient" | "fridge" | "mixed";

/**
 * Biga fresh-yeast % on BIGA FLOUR from fermentation conditions.
 * Ambient: 0.3% @16h → 0.2% @24h at 18–20°C, −0.05%/°C above 20°C (+0.05%/°C below 18°C).
 * Fridge (4–6°C): 0.7% @12h → 0.5% @24h (max 0.7%).
 * Mixed: midway between both.
 */
export function bigaYeastPctPro(mode: BigaFermMode, roomTemp: number, hours: number): number {
  const h = Math.max(12, Math.min(24, hours));
  const r = (h - 12) / 12; // 0 at 12h, 1 at 24h
  const ambientBase = h <= 16 ? 0.35 - 0.05 * ((h - 12) / 4) : 0.3 - 0.1 * ((h - 16) / 8);
  let tempAdj = 0;
  if (roomTemp > 20) tempAdj = -0.05 * (roomTemp - 20);
  else if (roomTemp < 18) tempAdj = 0.05 * (18 - roomTemp);
  const ambient = Math.max(0.05, ambientBase + tempAdj);
  const fridge = 0.7 - 0.2 * r;
  const pct = mode === "ambient" ? ambient : mode === "fridge" ? fridge : Math.max(0.1, (ambientBase + tempAdj / 2 + fridge) / 2);
  return Number(Math.min(0.7, pct).toFixed(3));
}

function poolishYeastPctByTemp(tempC: number): number {
  const t = Math.max(12, Math.min(26, tempC));
  const anchors: [number, number][] = [
    [12, 2.5], [15, 1.2], [18, 0.5], [20, 0.3], [22, 0.2], [24, 0.15], [26, 0.1],
  ];
  for (let i = 0; i < anchors.length - 1; i++) {
    const [t1, p1] = anchors[i];
    const [t2, p2] = anchors[i + 1];
    if (t >= t1 && t <= t2) {
      const ratio = (t - t1) / (t2 - t1);
      return p1 + (p2 - p1) * ratio;
    }
  }
  return 0.3;
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

  const divisor = 1 + hydrRatio + saltRatio + maltRatio + oilRatio;

  // Strict mathematical sync:
  //  - normal mode: total dough = balls × ball weight, flour = dough / divisor
  //  - "available flour" mode: flour is fixed, dough = flour × divisor
  const fixedFlour = inp.flourAvailable && inp.flourAvailable > 0 ? inp.flourAvailable : undefined;
  const totalFlour = fixedFlour ?? (inp.ballsCount * inp.ballWeight) / divisor;
  const totalDough = fixedFlour ? fixedFlour * divisor : inp.ballsCount * inp.ballWeight;
  const ballsExact = inp.ballWeight > 0 ? totalDough / inp.ballWeight : 0;

  const totalWater = totalFlour * hydrRatio;
  const totalSalt = totalFlour * saltRatio;
  const totalMalt = totalFlour * maltRatio;
  const totalOil = totalFlour * oilRatio;

  // Pre-ferment: biga (44–50% hydration, 45% default) or poolish (100% hydration)
  const preFerment: PreFermentType = inp.preFerment ?? "biga";
  const preFermentHydrPct = inp.preFermentHydrPct ?? (preFerment === "poolish" ? 100 : 45);
  const bigaPct = Math.min(100, Math.max(20, inp.bigaPct ?? 80));
  const bigaFlour = totalFlour * (bigaPct / 100);
  const bigaWater = bigaFlour * (preFermentHydrPct / 100);

  const preYeastPct = preFerment === "poolish"
    ? poolishYeastPctByTemp(inp.cellarTemp)
    : inp.bigaFermMode
      ? bigaYeastPctPro(inp.bigaFermMode, inp.bigaRoomTemp ?? 20, inp.bigaHours ?? 18)
      : bigaYeastPctByTemp(inp.cellarTemp);
  const bigaYeastFresh = bigaFlour * (preYeastPct / 100);
  const bigaYeastShown = inp.yeastType === "dry" ? bigaYeastFresh / 3 : bigaYeastFresh;

  // Refreshment (Day 2)
  const refreshFlour = Math.max(0, totalFlour - bigaFlour);
  const refreshWater = Math.max(0, totalWater - bigaWater);
  const bassinageWater = refreshWater * 0.3;

  const refreshYeastPct = Math.min(0.3, Math.max(0, inp.refreshYeastPct ?? 0));
  const refreshYeastFresh = totalFlour * (refreshYeastPct / 100);
  const refreshYeastShown = inp.yeastType === "dry" ? refreshYeastFresh / 3 : refreshYeastFresh;

  // Direct 72h: fixed 0.15% fresh yeast on total flour (cold-blocked, independent of room temp)
  const directYeastFresh = totalFlour * 0.0015;
  const directYeastShown = inp.yeastType === "dry" ? directYeastFresh / 3 : directYeastFresh;

  const bulkFermentMin = Math.round(inp.bulkOverrideMin ?? calcBulkFermentMin(inp.cellarTemp));
  const bulkTooHot = inp.engine === "direct" && inp.cellarTemp > 25;

  // Two distinct, explicit water temperatures (see dough-thermo).
  const ambient = inp.ambientTemp ?? (inp.engine === "direct" ? inp.cellarTemp : 22);
  const flourT = inp.flourTemp ?? 20;
  const mode: KneadMode = inp.kneadMode ?? (inp.mixer === "spiral" ? "spiral" : "hand");
  const bigaMode: KneadMode = inp.bigaKneadMode ?? mode;
  const friction = inp.refreshFriction ?? REFRESH_FRICTION[mode];

  const bigaWaterTemp = bigaWaterTempThermo({
    storageTemp: inp.storageTemp ?? inp.cellarTemp,
    flourTemp: flourT,
    mode: bigaMode,
  }).waterTemp;


  const refreshWaterTemp = inp.engine === "biga"
    ? refreshWaterTempThermo({
        bigaTemp: inp.bigaRealTemp ?? inp.storageTemp ?? inp.cellarTemp,
        ambientTemp: ambient,
        friction,
        autolysePenalty: inp.autolyseTempPenalty ?? 0,
      }).waterTemp
    : directWaterTempThermo({ ambientTemp: ambient, flourTemp: flourT, friction }).waterTemp;



  const bt = calcBakingTemps(inp.engine, inp.hydration);

  return {
    totalDough,
    totalFlour,
    totalWater,
    totalSalt,
    totalMalt,
    totalOil,
    ballsExact,
    preFerment,
    bigaPct,
    preFermentHydrPct,
    bigaFlour,
    bigaWater,
    bigaYeastFresh,
    bigaYeastShown,
    refreshFlour,
    refreshWater,
    refreshYeastPct,
    refreshYeastFresh,
    refreshYeastShown,
    bassinageWater,
    bigaWaterTemp,
    refreshWaterTemp,
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

/* --- Two-stage water temperature (also re-exported from dough-pro) --- */

/** Biga / pre-ferment: short slow mix, target dough 19–20°C, low friction (+2°C). */
export function bigaWaterTempPro(ambient: number, flourTemp: number): number {
  return Number((19.5 * 3 - (ambient + flourTemp + 2)).toFixed(1));
}

/** Refreshment / full mix: target dough 23–24°C, friction depends on the mixer. */
export function refreshWaterTempPro(
  ambient: number,
  flourTemp: number,
  mixer: "hand" | "spiral",
  autolysePenalty = 0,
): number {
  const friction = mixer === "spiral" ? 9 : 2;
  return Number((23.5 * 3 - (ambient + flourTemp + friction) - autolysePenalty).toFixed(1));
}


// Water temp: Rule of 55
export function calculateWaterTemp(room: number, flour: number, friction: number): number {
  return 55 - (room + flour + friction);
}

// Biga water temp (target dough 18–20°C after mixing): ambient + flour only
export function calculateBigaWaterTemp(ambient: number, flour: number): number {
  return 55 - (ambient + flour);
}

export interface FlourCategory {
  key: "flour_cat_weak" | "flour_cat_medium" | "flour_cat_strong" | "flour_cat_very_strong";
  recos: string[];
}

export function flourCategory(w: number): FlourCategory {
  if (w < 220) return { key: "flour_cat_weak", recos: ["T45/T55 standard", "All-purpose"] };
  if (w <= 280) return { key: "flour_cat_medium", recos: ["Caputo Pizzeria", "Caputo Classica", "5 Stagioni Napoletana"] };
  if (w <= 350) return { key: "flour_cat_strong", recos: ["Caputo Cuoco / Saccorosso", "Caputo Nuvola", "Dallagiovanna Napoletana"] };
  return { key: "flour_cat_very_strong", recos: ["Caputo Nuvola Super", "Manitoba", "Petra 1"] };
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
    const bulkMin = Math.round(inp.bulkOverrideMin ?? calcBulkFermentMin(inp.cellarTemp));
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
