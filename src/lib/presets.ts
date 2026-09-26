import type { PizzaStyle, PreFermentType, BigaFermMode } from "@/lib/dough-engine";
import type { MaturationPlan } from "@/components/MaturationPlanner";

/** A full set of calculator parameters that can be injected in one go. */
export interface CalcPreset {
  style: PizzaStyle;
  method: "direct" | "indirect";
  preFerment: PreFermentType;
  hydration: number;
  saltPct: number;
  bigaPct: number;
  bigaHydr: number;
  bigaFermMode: BigaFermMode;
  bigaHours: number;
  flourId: string;
  flourW: number;
  flourGrams: number;
  ballWeight: number;
  targetBake?: string;
  maturation: MaturationPlan;
}

export interface OfficialPreset {
  id: string;
  nameKey: string;
  descKey: string;
  level: "novice" | "intermediate" | "advanced";
  config: CalcPreset;
}

export const OFFICIAL_PRESETS: OfficialPreset[] = [
  {
    id: "biga100_saccorosso",
    nameKey: "preset_biga100_name",
    descKey: "preset_biga100_desc",
    level: "advanced",
    config: {
      style: "contemporanea", method: "indirect", preFerment: "biga",
      hydration: 73, saltPct: 2.8, bigaPct: 100, bigaHydr: 45,
      bigaFermMode: "ambient", bigaHours: 18,
      flourId: "caputo_cuoco", flourW: 310, flourGrams: 1000, ballWeight: 270,
      maturation: { prefermentLoc: "cellar", prefermentHours: 18, bulkFridgeH: 0, bulkRoomH: 1, ballsFridgeH: 0, proofRoomH: 4 },
    },
  },
  {
    id: "biga8020_beginner",
    nameKey: "preset_8020_name",
    descKey: "preset_8020_desc",
    level: "novice",
    config: {
      style: "contemporanea", method: "indirect", preFerment: "biga",
      hydration: 65, saltPct: 2.5, bigaPct: 80, bigaHydr: 45,
      bigaFermMode: "ambient", bigaHours: 18,
      flourId: "caputo_nuvola", flourW: 270, flourGrams: 1000, ballWeight: 260,
      maturation: { prefermentLoc: "cellar", prefermentHours: 18, bulkFridgeH: 0, bulkRoomH: 1, ballsFridgeH: 0, proofRoomH: 4 },
    },
  },
  {
    id: "direct72_ct",
    nameKey: "preset_direct72_name",
    descKey: "preset_direct72_desc",
    level: "intermediate",
    config: {
      style: "napoletana", method: "direct", preFerment: "biga",
      hydration: 65, saltPct: 2.8, bigaPct: 80, bigaHydr: 45,
      bigaFermMode: "fridge", bigaHours: 18,
      flourId: "caputo_pizzeria", flourW: 260, flourGrams: 1000, ballWeight: 250,
      maturation: { prefermentLoc: "cellar", prefermentHours: 0, bulkFridgeH: 24, bulkRoomH: 1, ballsFridgeH: 44, proofRoomH: 3 },
    },
  },
  {
    id: "teglia_biga",
    nameKey: "preset_teglia_name",
    descKey: "preset_teglia_desc",
    level: "intermediate",
    config: {
      style: "teglia", method: "indirect", preFerment: "biga",
      hydration: 78, saltPct: 2.5, bigaPct: 100, bigaHydr: 45,
      bigaFermMode: "ambient", bigaHours: 18,
      flourId: "caputo_nuvola_super", flourW: 325, flourGrams: 1000, ballWeight: 700,
      maturation: { prefermentLoc: "cellar", prefermentHours: 18, bulkFridgeH: 24, bulkRoomH: 1, ballsFridgeH: 0, proofRoomH: 3 },
    },
  },
];

export type Experience = "novice" | "intermediate" | "advanced";
export type QuickStyle = "contemporanea" | "napoletana" | "teglia";

/** Builds a calculator config from the 4 guided-mode answers. */
export function quickConfig(opts: {
  style: QuickStyle;
  balls: number;
  ballWeight: number;
  experience: Experience;
  targetBake: string;
}): CalcPreset {
  const { style, balls, ballWeight, experience, targetBake } = opts;
  const direct = style === "napoletana" && experience === "novice";
  const hydration =
    style === "teglia" ? (experience === "novice" ? 72 : experience === "intermediate" ? 76 : 80)
    : style === "napoletana" ? (experience === "novice" ? 62 : 65)
    : experience === "novice" ? 65 : experience === "intermediate" ? 70 : 74;
  const saltPct = style === "teglia" ? 2.5 : 2.8;
  const bigaPct = experience === "novice" ? 80 : 100;
  const totalDough = balls * ballWeight;
  const flourGrams = Math.round(totalDough / (1 + hydration / 100 + saltPct / 100 + 0.003));

  // Hours available before the bake, used to size the Biga maturation.
  const hoursAvail = (new Date(targetBake).getTime() - Date.now()) / 3_600_000;
  const bigaHours = Math.max(12, Math.min(24, Math.round(hoursAvail - 8)));
  const flourId = hydration >= 72 ? "caputo_nuvola_super" : experience === "novice" ? "caputo_nuvola" : "caputo_cuoco";
  const flourW = hydration >= 72 ? 325 : experience === "novice" ? 270 : 310;

  return {
    style,
    method: direct ? "direct" : "indirect",
    preFerment: "biga",
    hydration, saltPct, bigaPct, bigaHydr: 45,
    bigaFermMode: "ambient", bigaHours,
    flourId: direct ? "caputo_pizzeria" : flourId,
    flourW: direct ? 260 : flourW,
    flourGrams, ballWeight, targetBake,
    maturation: direct
      ? { prefermentLoc: "cellar", prefermentHours: 0, bulkFridgeH: Math.max(0, Math.round(hoursAvail - 6)), bulkRoomH: 1, ballsFridgeH: 0, proofRoomH: 4 }
      : { prefermentLoc: "cellar", prefermentHours: bigaHours, bulkFridgeH: 0, bulkRoomH: 1, ballsFridgeH: 0, proofRoomH: style === "teglia" ? 3 : 4 },
  };
}
