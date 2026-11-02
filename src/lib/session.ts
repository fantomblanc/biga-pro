import { buildTimeline, calculateRecipe, type TimelineStep } from "./dough-engine";
import type { SavedRecipe } from "./storage";

export function sessionTimeline(recipe: SavedRecipe): TimelineStep[] {
  const base = recipe.timeline.length ? recipe.timeline : buildTimeline(recipe.inputs, recipe.finalProofH);
  const bake = new Date(recipe.inputs.targetBakeISO).getTime();
  const preheatMinutes = recipe.inputs.ovenType === "gas_high" ? 30 : 45;
  const steps = base.filter((s) => s.id !== "preheat");
  if (!steps.some((s) => s.id === "ball")) {
    const proof = steps.find((s) => s.id === "proof_start");
    if (proof) steps.push({ ...proof, id: "ball", labelKey: "step_ball_title" });
  }
  steps.push({ id: "preheat", labelKey: "session_preheat", zone: "bake", timeISO: new Date(bake - preheatMinutes * 60_000).toISOString() });
  return steps.sort((a, b) => Date.parse(a.timeISO) - Date.parse(b.timeISO));
}

export function requiredDurationHours(recipe: SavedRecipe): number {
  const steps = recipe.timeline.length ? recipe.timeline : buildTimeline(recipe.inputs, recipe.finalProofH);
  const start = Math.min(...steps.map((s) => Date.parse(s.timeISO)));
  return Math.max(0, (Date.parse(recipe.inputs.targetBakeISO) - start) / 3600_000);
}

export function scheduleCheck(requiredH: number, targetISO: string, now = Date.now()) {
  const availableH = (Date.parse(targetISO) - now) / 3600_000;
  return { requiredH, availableH, compatible: Number.isFinite(availableH) && availableH >= requiredH && requiredH > 0 };
}

export function rescheduleRecipe(recipe: SavedRecipe, targetISO: string, now = Date.now()): SavedRecipe {
  const check = scheduleCheck(requiredDurationHours(recipe), targetISO, now);
  if (!check.compatible) throw new Error("session_incompatible");
  const delta = Date.parse(targetISO) - Date.parse(recipe.inputs.targetBakeISO);
  const inputs = { ...recipe.inputs, targetBakeISO: targetISO };
  // Shift saved milestones as a unit: custom protocols keep their exact durations.
  const timeline = recipe.timeline.length
    ? recipe.timeline.map((s) => ({ ...s, timeISO: new Date(Date.parse(s.timeISO) + delta).toISOString() }))
    : buildTimeline(inputs, recipe.finalProofH);
  const updated = { ...recipe, inputs, timeline };
  return { ...updated, timeline: sessionTimeline(updated) };
}

export function expressRecipe(recipe: SavedRecipe, targetISO: string, now = Date.now()): SavedRecipe {
  const availableH = (Date.parse(targetISO) - now) / 3600_000;
  if (!Number.isFinite(availableH) || availableH < 4) throw new Error("session_express_min");
  const fermentationH = Math.min(8, availableH - 0.5);
  const proofRoomH = fermentationH / 2;
  const inputs: SavedRecipe["inputs"] = {
    ...recipe.inputs, engine: "direct", targetBakeISO: targetISO,
    preFerment: undefined, refreshYeastPct: 0, autolyse: undefined,
    maturation: { prefermentLoc: "ambient", prefermentHours: 0, bulkFridgeH: 0, bulkRoomH: fermentationH / 2, ballsFridgeH: 0, proofRoomH },
  };
  const calc = calculateRecipe(inputs);
  const temp = inputs.ambientTemp ?? inputs.cellarTemp;
  const yeastPct = Math.max(0.05, Math.min(2, (3.2 / fermentationH) * Math.pow(2, (22 - temp) / 6)));
  calc.directYeastFresh = calc.totalFlour * yeastPct / 100;
  calc.directYeastShown = inputs.yeastType === "dry" ? calc.directYeastFresh / 3 : calc.directYeastFresh;
  calc.bulkFermentMin = inputs.maturation ? inputs.maturation.bulkRoomH * 60 : 0;
  const updated = { ...recipe, inputs, calc, finalProofH: proofRoomH, timeline: buildTimeline(inputs, proofRoomH) };
  return { ...updated, timeline: sessionTimeline(updated) };
}