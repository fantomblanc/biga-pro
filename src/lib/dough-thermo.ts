// Thermal modules: two explicit, separate water-temperature calculators.
//  A. Biga / pre-ferment water  — short mix (2–3 min), target dough 18–20°C.
//  B. Refreshment water         — full knead, target final dough 23–24°C.
//
// Both use the classic "rule of 55/60" generalisation:
//   T°water = n × T°target − (sum of the other thermal terms + machine heating)
// where n is the number of thermal terms including the water itself.
// The refreshment water is ALWAYS cold: it has to absorb the mechanical
// heating of a long knead, so it is clamped to never come out warm.

export type KneadMode = "hand" | "planetary" | "spiral";

export const KNEAD_MODES: KneadMode[] = ["hand", "planetary", "spiral"];

export const KNEAD_MODE_LABEL_KEY: Record<KneadMode, string> = {
  hand: "mode_hand",
  planetary: "mode_planetary",
  spiral: "mode_spiral",
};

/** Heating of a short 2–3 min pre-ferment mix (°C). */
export const SHORT_MIX_HEAT: Record<KneadMode, number> = {
  hand: 1,
  planetary: 1.5,
  spiral: 2,
};

/** Default friction of a full knead (°C) — user adjustable. */
export const REFRESH_FRICTION: Record<KneadMode, number> = {
  hand: 2,
  planetary: 7,
  spiral: 10,
};

export const REFRESH_FRICTION_RANGE: Record<KneadMode, [number, number]> = {
  hand: [1, 3],
  planetary: [6, 8],
  spiral: [9, 12],
};

export const BIGA_TARGET_TEMP = 19;
export const REFRESH_TARGET_TEMP = 23;
/** At or below this temperature ice water is mandatory. */
export const ICE_WATER_THRESHOLD = 4;


export interface WaterTempResult {
  /** Water temperature to use (°C), already clamped to a physical range. */
  waterTemp: number;
  /** Raw formula output before clamping. */
  raw: number;
  /** True when the raw value had to be clamped (needs ice / colder room). */
  clamped: boolean;
  /** Ice water strongly recommended. */
  needsIce: boolean;
  /** Human formula, already numeric, for display. */
  formula: string;
}

function finish(raw: number, min: number, max: number, formula: string): WaterTempResult {
  const value = Math.min(max, Math.max(min, raw));
  return {
    waterTemp: Number(value.toFixed(1)),
    raw: Number(raw.toFixed(1)),
    clamped: Math.abs(value - raw) > 0.05,
    needsIce: value <= ICE_WATER_THRESHOLD,
    formula,
  };
}

/** A. Biga water: 3 × target − (storage + flour + short-mix heating). */
export function bigaWaterTemp(opts: {
  storageTemp: number;
  flourTemp: number;
  mode: KneadMode;
  target?: number;
}): WaterTempResult {
  const target = opts.target ?? BIGA_TARGET_TEMP;
  const heat = SHORT_MIX_HEAT[opts.mode];
  const raw = 3 * target - (opts.storageTemp + opts.flourTemp + heat);
  return finish(
    raw,
    -5,
    // A pre-ferment mixed at 19–20°C never needs water above ~30°C.
    30,
    `(3 × ${target}) − (${opts.storageTemp} + ${opts.flourTemp} + ${heat}) = ${raw.toFixed(1)}°C`,
  );
}

/**
 * B. Refreshment water — rigorous 3-term rule:
 *   T°water = (3 × target final dough) − (room T° + mature pre-ferment T° + mixer heating)
 * The friction of the selected equipment is always SUBTRACTED, so the water can
 * never come out warm; it is what cools the long knead down.
 */
export function refreshWaterTemp(opts: {
  bigaTemp: number;
  ambientTemp: number;
  friction: number;
  target?: number;
  autolysePenalty?: number;
}): WaterTempResult {
  const target = opts.target ?? REFRESH_TARGET_TEMP;
  const raw =
    3 * target - (opts.ambientTemp + opts.bigaTemp + opts.friction) - (opts.autolysePenalty ?? 0);
  return finish(
    raw,
    -5,
    // Never tepid: refreshment water must cool the long knead down.
    20,
    `(3 × ${target}) − (${opts.ambientTemp} + ${opts.bigaTemp} + ${opts.friction}) = ${raw.toFixed(1)}°C`,
  );
}


/** Direct method: same physics, no pre-ferment term. */
export function directWaterTemp(opts: {
  ambientTemp: number;
  flourTemp: number;
  friction: number;
  target?: number;
}): WaterTempResult {
  const target = opts.target ?? REFRESH_TARGET_TEMP;
  const raw = 3 * target - (opts.ambientTemp + opts.flourTemp + opts.friction);
  return finish(
    raw,
    -5,
    20,
    `(3 × ${target}) − (${opts.ambientTemp} + ${opts.flourTemp} + ${opts.friction}) = ${raw.toFixed(1)}°C`,
  );
}

/* ------------------------------------------------------------------ */
/* Ball preview from a fixed flour weight                              */
/* ------------------------------------------------------------------ */

export interface BallPreview {
  totalDough: number;
  ballsCount: number;
  remainder: number;
}

export function ballPreview(totalDough: number, targetBallWeight: number): BallPreview {
  const w = Math.max(1, targetBallWeight);
  const count = Math.floor(totalDough / w);
  return {
    totalDough: Number(totalDough.toFixed(0)),
    ballsCount: count,
    remainder: Number((totalDough - count * w).toFixed(0)),
  };
}

/* ------------------------------------------------------------------ */
/* Simplified oven selection                                           */
/* ------------------------------------------------------------------ */

export type SimpleOven = "home" | "pro";

export const SIMPLE_OVENS: SimpleOven[] = ["home", "pro"];

export const SIMPLE_OVEN_LABEL_KEY: Record<SimpleOven, string> = {
  home: "oven_home",
  pro: "oven_pro",
};

export const SIMPLE_OVEN_DEFAULT_MAX: Record<SimpleOven, number> = {
  home: 275,
  pro: 450,
};

/** Caps the suggested Voûte/Sole bands at the oven's real maximum. */
export function capBand(band: [number, number], maxTemp: number): [number, number] {
  return [Math.min(band[0], maxTemp), Math.min(band[1], maxTemp)];
}
