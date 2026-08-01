// Professional extensions to the dough engine:
// tenacity arbitration, autolyse, flour blending, oven targets, teglia trays,
// pre-ferment maturation location, dynamic hydration ceiling and W risk rules.

import type { EngineType, PizzaStyle, PreFermentType } from "./dough-engine";
import { STYLE_CONFIG } from "./dough-engine";
import { FLOURS, type FlourRef } from "./flours";

/* ------------------------------------------------------------------ */
/* Oven                                                                */
/* ------------------------------------------------------------------ */

export type OvenType = "domestic" | "gas_high" | "electric_pro";

export const OVEN_TYPES: OvenType[] = ["domestic", "gas_high", "electric_pro"];

export const OVEN_LABEL_KEY: Record<OvenType, string> = {
  domestic: "oven_domestic",
  gas_high: "oven_gas_high",
  electric_pro: "oven_electric_pro",
};

export interface BakeTargets {
  /** Ceiling range in °C, undefined for domestic ovens with a single setting. */
  voute: [number, number];
  /** Floor / stone range in °C. */
  sole: [number, number];
  tipKey: string;
  gearKey?: string;
}

/**
 * Suggested Voûte / Sole targets from style + oven type (+ hydration for
 * contemporary Neapolitan styles).
 */
export function bakeTargets(
  style: PizzaStyle | undefined,
  oven: OvenType,
  engine: EngineType,
  hydration: number,
): BakeTargets {
  const s = style ?? "contemporanea";

  if (s === "teglia" || s === "focaccia") {
    if (oven === "domestic") {
      return {
        voute: [250, 275],
        sole: [250, 275],
        tipKey: "bake_tip_teglia_domestic",
        gearKey: "gear_teglia",
      };
    }
    return {
      voute: [280, 300],
      sole: [280, 300],
      tipKey: "bake_tip_teglia_gas",
      gearKey: "gear_teglia",
    };
  }

  if (oven === "domestic") {
    return { voute: [250, 275], sole: [250, 275], tipKey: "bake_tip_domestic", gearKey: "gear_steel" };
  }

  if (s === "napoletana") {
    return { voute: [470, 490], sole: [480, 490], tipKey: "bake_tip_avpn", gearKey: "gear_hightemp" };
  }

  if (s === "romana") {
    return { voute: [330, 350], sole: [300, 320], tipKey: "bake_tip_romana", gearKey: "gear_hightemp" };
  }

  // contemporanea / canotto
  if (engine === "direct") {
    return { voute: [400, 420], sole: [360, 380], tipKey: "bake_tip_direct", gearKey: "gear_hightemp" };
  }
  if (hydration < 67) {
    return { voute: [430, 450], sole: [380, 400], tipKey: "bake_tip_biga_low", gearKey: "gear_hightemp" };
  }
  return { voute: [420, 440], sole: [350, 370], tipKey: "bake_tip_biga_high", gearKey: "gear_hightemp" };
}

/* ------------------------------------------------------------------ */
/* Hydration ceiling                                                   */
/* ------------------------------------------------------------------ */

const HIGH_HYDR_STYLES: PizzaStyle[] = ["canotto", "teglia", "focaccia"];

/** Dynamic hydration ceiling: unlocks up to 85% for Biga or high-hydration styles. */
export function hydrationCeiling(style: PizzaStyle | undefined, isBiga: boolean, bigaPct: number): number {
  const base = style ? STYLE_CONFIG[style].hydrMax : 75;
  const unlocked = (style ? HIGH_HYDR_STYLES.includes(style) : false) || (isBiga && bigaPct >= 50);
  if (style === "napoletana") return 62.5;
  return unlocked ? Math.max(base, 85) : base;
}

export function hydrationFloor(style: PizzaStyle | undefined): number {
  return style ? STYLE_CONFIG[style].hydrMin : 55;
}

export function clampHydrationPro(h: number, style: PizzaStyle | undefined, isBiga: boolean, bigaPct: number): number {
  const lo = hydrationFloor(style);
  const hi = hydrationCeiling(style, isBiga, bigaPct);
  return Math.min(hi, Math.max(lo, h));
}

/* ------------------------------------------------------------------ */
/* Flour blending + W compatibility                                    */
/* ------------------------------------------------------------------ */

export interface FlourBlend {
  enabled: boolean;
  flourAId: string;
  flourBId: string;
  /** Share of flour A, 0-100 (steps of 5 in the UI). */
  ratioA: number;
}

export function flourById(id: string): FlourRef | undefined {
  return FLOURS.find((f) => f.id === id);
}

/** Weighted average W of a two-flour blend. Falls back to manual W. */
export function blendW(blend: FlourBlend, manualW: number): number {
  if (!blend.enabled) return manualW;
  const a = flourById(blend.flourAId);
  const b = flourById(blend.flourBId);
  if (!a || !b) return manualW;
  const ra = Math.min(100, Math.max(0, blend.ratioA)) / 100;
  return Math.round(a.w * ra + b.w * (1 - ra));
}

export type WCompat = "ideal" | "caution" | "avoid";

/** Green / orange / red guidance for a W value against the chosen protocol. */
export function wCompat(w: number, isBiga: boolean, hydration: number, style?: PizzaStyle): WCompat {
  const wantsStrong = isBiga || hydration >= 70 || style === "teglia" || style === "canotto" || style === "focaccia";
  if (wantsStrong) {
    if (w >= 300 && w <= 400) return "ideal";
    if (w >= 280) return "caution";
    return "avoid";
  }
  // Direct short/medium maturation
  if (w >= 250 && w <= 300) return "ideal";
  if (w >= 220 && w <= 340) return "caution";
  return w > 340 ? "caution" : "avoid";
}

export const W_COMPAT_LABEL_KEY: Record<WCompat, string> = {
  ideal: "w_compat_ideal",
  caution: "w_compat_caution",
  avoid: "w_compat_avoid",
};

/* ------------------------------------------------------------------ */
/* W risk rules (dynamic, non-alarmist)                                */
/* ------------------------------------------------------------------ */

export type RiskLevel = "none" | "advice" | "critical";

export interface WRisk {
  level: RiskLevel;
  messageKey?: string;
}

/**
 * Dynamic flour-strength rule:
 * - no alert at <=65% hydration and <=24h total maturation
 * - advice at 65–70% with W<280, or biga share >70% with W<280
 * - critical above 70% with W<300, or >48h cold / >24h ambient with W<260
 */
export function wRisk(opts: {
  w: number;
  hydration: number;
  totalMaturationH: number;
  ambientMaturationH?: number;
  isBiga: boolean;
  bigaPct: number;
}): WRisk {
  const { w, hydration, totalMaturationH, isBiga, bigaPct } = opts;
  const ambientH = opts.ambientMaturationH ?? 0;

  if (hydration > 70 && w < 300) return { level: "critical", messageKey: "w_risk_critical_hydr" };
  if (totalMaturationH > 48 && w < 260) return { level: "critical", messageKey: "w_risk_critical_matur" };
  if (ambientH > 24 && w < 260) return { level: "critical", messageKey: "w_risk_critical_matur" };

  if (hydration <= 65 && totalMaturationH <= 24) return { level: "none" };

  if (hydration > 65 && hydration <= 70 && w < 280) return { level: "advice", messageKey: "w_risk_advice_hydr" };
  if (isBiga && bigaPct > 70 && w < 280) return { level: "advice", messageKey: "w_risk_advice_biga" };

  return { level: "none" };
}

/* ------------------------------------------------------------------ */
/* Tenacity / extensibility arbitration                                */
/* ------------------------------------------------------------------ */

/** -100 = fully extensible, 0 = balanced, +100 = fully tenacious. */
export interface TenacityResult {
  saltPct: number;
  saltDelta: number;
  bulkFactor: number;
  noteKey: string;
}

export function tenacityAdjust(tenacity: number, baseSaltPct: number, hydration: number): TenacityResult {
  const t = Math.min(100, Math.max(-100, tenacity));
  if (t > 10) {
    // Tenacity wanted: raise salt 0.2 → 0.4 %, shorten bulk.
    const delta = Number((0.2 + (0.2 * (t - 10)) / 90).toFixed(2));
    return {
      saltPct: Number((baseSaltPct + delta).toFixed(2)),
      saltDelta: delta,
      bulkFactor: 1 - 0.25 * (t / 100),
      noteKey: hydration >= 75 ? "tenacity_note_high_hydr" : "tenacity_note_tenace",
    };
  }
  if (t < -10) {
    // Extensibility wanted: moderate salt (~2.2%), longer relax.
    const target = 2.2;
    const saltPct = Number(Math.min(baseSaltPct, target).toFixed(2));
    return {
      saltPct,
      saltDelta: Number((saltPct - baseSaltPct).toFixed(2)),
      bulkFactor: 1 + 0.3 * (Math.abs(t) / 100),
      noteKey: "tenacity_note_extensible",
    };
  }
  return { saltPct: baseSaltPct, saltDelta: 0, bulkFactor: 1, noteKey: "tenacity_note_balanced" };
}

/* ------------------------------------------------------------------ */
/* Autolyse                                                            */
/* ------------------------------------------------------------------ */

export type AutolyseKind = "pure" | "fermentolyse";

export interface AutolyseConfig {
  enabled: boolean;
  flourPct: number; // 30-100
  hydrPct: number; // 50-70
  minutes: number; // 20-240
  kind: AutolyseKind;
}

export const DEFAULT_AUTOLYSE: AutolyseConfig = {
  enabled: false,
  flourPct: 100,
  hydrPct: 55,
  minutes: 30,
  kind: "pure",
};

export interface AutolyseResult {
  flour: number;
  water: number;
  /** Flour left out of the autolyse, added at final mix. */
  remainingFlour: number;
  /** Water still to add at final mix (bassinage). */
  remainingWater: number;
  /** °C penalty to subtract from calculated water temperature. */
  waterTempPenalty: number;
  warnings: string[];
  tips: string[];
}

export function computeAutolyse(
  cfg: AutolyseConfig,
  totalFlour: number,
  totalWater: number,
  w: number,
): AutolyseResult {
  const flour = totalFlour * (Math.min(100, Math.max(30, cfg.flourPct)) / 100);
  const water = Math.min(totalWater, flour * (Math.min(70, Math.max(50, cfg.hydrPct)) / 100));
  const warnings: string[] = [];
  const tips: string[] = [];

  if (w < 240 && cfg.minutes > 40) warnings.push("autolyse_warn_weak");
  if (w > 320 && cfg.minutes < 30) tips.push("autolyse_tip_strong");
  if (cfg.minutes > 60) tips.push("autolyse_tip_cold");

  return {
    flour,
    water,
    remainingFlour: Math.max(0, totalFlour - flour),
    remainingWater: Math.max(0, totalWater - water),
    waterTempPenalty: cfg.minutes > 45 ? 1.5 : 0,
    warnings,
    tips,
  };
}

/* ------------------------------------------------------------------ */
/* Professional water temperature                                      */
/* ------------------------------------------------------------------ */

export type MixerType = "hand" | "spiral";

export const MIXER_FRICTION: Record<MixerType, number> = { hand: 2, spiral: 9 };

/** T°water = (target × 3) − (room + flour + friction) − autolyse penalty. */
export function calcProWaterTemp(opts: {
  targetDough: number;
  room: number;
  flour: number;
  mixer: MixerType;
  autolysePenalty?: number;
}): number {
  const friction = MIXER_FRICTION[opts.mixer];
  const raw = opts.targetDough * 3 - (opts.room + opts.flour + friction) - (opts.autolysePenalty ?? 0);
  return Number(raw.toFixed(1));
}

export function needsIceWater(waterTempC: number): boolean {
  return waterTempC <= 4;
}

/* ------------------------------------------------------------------ */
/* Pre-ferment maturation location                                     */
/* ------------------------------------------------------------------ */

export type PrefermentLocation = "fridge" | "cellar" | "ambient";

export const PREFERMENT_LOCATIONS: PrefermentLocation[] = ["fridge", "cellar", "ambient"];

export const PREFERMENT_LOCATION_LABEL_KEY: Record<PrefermentLocation, string> = {
  fridge: "preferment_loc_fridge",
  cellar: "preferment_loc_cellar",
  ambient: "preferment_loc_ambient",
};

export interface PrefermentLocationProfile {
  /** Default temperature used for the yeast curve. */
  tempC: number;
  /** Biga hydration for this location (poolish always stays at 100%). */
  bigaHydrPct: number;
  /** Multiplier applied to the refresh yeast requirement. */
  refreshYeastFactor: number;
  hours: number;
  descKey: string;
}

export function prefermentProfile(
  loc: PrefermentLocation,
  kind: PreFermentType,
): PrefermentLocationProfile {
  if (kind === "poolish") {
    switch (loc) {
      case "fridge":
        return { tempC: 4, bigaHydrPct: 100, refreshYeastFactor: 1.4, hours: 24, descKey: "preferment_loc_fridge_desc" };
      case "cellar":
        return { tempC: 17, bigaHydrPct: 100, refreshYeastFactor: 1, hours: 16, descKey: "preferment_loc_cellar_desc" };
      default:
        return { tempC: 21, bigaHydrPct: 100, refreshYeastFactor: 0.6, hours: 12, descKey: "preferment_loc_ambient_desc" };
    }
  }
  switch (loc) {
    case "fridge":
      return { tempC: 4, bigaHydrPct: 50, refreshYeastFactor: 1.5, hours: 24, descKey: "preferment_loc_fridge_desc" };
    case "cellar":
      return { tempC: 17, bigaHydrPct: 44.5, refreshYeastFactor: 1, hours: 18, descKey: "preferment_loc_cellar_desc" };
    default:
      return { tempC: 21, bigaHydrPct: 50, refreshYeastFactor: 0.5, hours: 14, descKey: "preferment_loc_ambient_desc" };
  }
}

/* ------------------------------------------------------------------ */
/* Teglia trays                                                        */
/* ------------------------------------------------------------------ */

export interface TrayPreset {
  label: string;
  l: number;
  wcm: number;
}

export const TRAY_PRESETS: TrayPreset[] = [
  { label: "40 × 30 cm", l: 40, wcm: 30 },
  { label: "60 × 40 cm", l: 60, wcm: 40 },
  { label: "30 × 20 cm", l: 30, wcm: 20 },
];

/** Surface × 0.6 = dough weight per tray. */
export function doughPerTray(lengthCm: number, widthCm: number, coef = 0.6): number {
  return Math.round(lengthCm * widthCm * coef);
}

/* ------------------------------------------------------------------ */
/* AVPN (Napoletana Traditional) restrictions                          */
/* ------------------------------------------------------------------ */

export interface AvpnRules {
  active: boolean;
  directOnly: boolean;
  banOilAndMalt: boolean;
  hydrMin: number;
  hydrMax: number;
  saltMin: number;
  saltMax: number;
}

export function avpnRules(style: PizzaStyle | undefined): AvpnRules {
  const active = style === "napoletana";
  return {
    active,
    directOnly: active,
    banOilAndMalt: active,
    hydrMin: 55,
    hydrMax: 62.5,
    saltMin: 2.5,
    saltMax: 3,
  };
}

/* ------------------------------------------------------------------ */
/* Scale by available flour                                            */
/* ------------------------------------------------------------------ */

export interface FlourScaleResult {
  totalDough: number;
  ballsCount: number;
  /** Fractional count, e.g. 4.3 balls. */
  ballsExact: number;
}

/**
 * Rescale the batch from a known amount of flour: total dough = flour × divisor.
 */
export function scaleFromFlour(opts: {
  availableFlour: number;
  hydration: number;
  saltPct: number;
  maltPct: number;
  oilPct: number;
  unitWeight: number;
}): FlourScaleResult {
  const divisor = 1 + opts.hydration / 100 + opts.saltPct / 100 + opts.maltPct / 100 + opts.oilPct / 100;
  const totalDough = opts.availableFlour * divisor;
  const ballsExact = opts.unitWeight > 0 ? totalDough / opts.unitWeight : 0;
  return {
    totalDough: Number(totalDough.toFixed(1)),
    ballsCount: Math.max(1, Math.floor(ballsExact)),
    ballsExact: Number(ballsExact.toFixed(2)),
  };
}
