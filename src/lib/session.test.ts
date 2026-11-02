import { describe, expect, it } from "vitest";
import { scheduleCheck, rescheduleRecipe, expressRecipe, sessionTimeline } from "./session";
import { buildTimeline, calculateRecipe, type RecipeInputs } from "./dough-engine";
import type { SavedRecipe } from "./storage";

const now = Date.parse("2026-11-02T12:00:00Z");
const inputs: RecipeInputs = { engine: "direct", ballsCount: 4, ballWeight: 270, hydration: 65, saltPct: 2.8, yeastType: "fresh", flourW: 300, useMalt: false, maltPct: 0, useOil: false, oilPct: 0, cellarTemp: 22, targetBakeISO: "2026-11-10T19:00:00Z" };
const recipe: SavedRecipe = { id: "test", name: "Test", createdAt: inputs.targetBakeISO, inputs, calc: calculateRecipe(inputs), timeline: buildTimeline(inputs, 3), finalProofH: 3, notes: "notes", photos: [] };
describe("Session scheduling", () => {
  it("blocks a 72-hour protocol when only 24 hours are available", () => {
    expect(scheduleCheck(72, "2026-11-03T12:00:00Z", now)).toEqual({ requiredH: 72, availableH: 24, compatible: false });
  });
  it("accepts exactly 72 hours for a 72-hour protocol", () => {
    expect(scheduleCheck(72, "2026-11-05T12:00:00Z", now).compatible).toBe(true);
  });
  it("rejects rescheduling when the first action would be in the past", () => {
    expect(() => rescheduleRecipe(recipe, "2026-11-03T12:00:00Z", now)).toThrow("session_incompatible");
  });
  it("preserves recipe identity and duration when relaunching", () => {
    const r = rescheduleRecipe(recipe, "2026-11-12T19:00:00Z", now);
    expect(r.id).toBe("test");
    expect(r.notes).toBe("notes");
    expect(Date.parse(r.timeline[0].timeISO) - Date.parse(recipe.timeline[0].timeISO)).toBe(48 * 3600_000);
  });
  it("offers a direct express recipe whose actions fit available time", () => {
    const r = expressRecipe(recipe, "2026-11-02T18:00:00Z", now);
    expect(r.inputs.engine).toBe("direct");
    expect(r.inputs.maturation?.bulkFridgeH).toBe(0);
    expect(Date.parse(r.timeline[0].timeISO)).toBeGreaterThanOrEqual(now);
    expect(r.calc.directYeastFresh).toBeGreaterThan(recipe.calc.directYeastFresh);
  });
  it("does not offer express for less than four hours", () => {
    expect(() => expressRecipe(recipe, "2026-11-02T15:00:00Z", now)).toThrow("session_express_min");
  });
  it("includes shaping and preheating 45 minutes before baking", () => {
    const steps = sessionTimeline(recipe);
    expect(steps.some((s) => s.id === "ball")).toBe(true);
    expect(steps.find((s) => s.id === "preheat")?.timeISO).toBe("2026-11-10T18:15:00.000Z");
  });
  it("uses the saved split maturation durations for precise backward planning", () => {
    const timeline = buildTimeline({ ...inputs, engine: "biga", preFerment: "poolish", maturation: { prefermentLoc: "ambient", prefermentHours: 12, bulkFridgeH: 24, bulkRoomH: 1, ballsFridgeH: 8, proofRoomH: 3 } }, 3);
    expect((Date.parse(inputs.targetBakeISO) - Date.parse(timeline[0].timeISO)) / 3600_000).toBe(48.5);
    expect(timeline[0].labelKey).toBe("session_poolish_start");
    expect(timeline.some((s) => s.id === "balls_fridge_end")).toBe(true);
  });
});