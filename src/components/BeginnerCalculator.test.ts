import { describe, it, expect } from "vitest";
import { beginnerRecipe, beginnerYeastPct } from "./BeginnerCalculator";
describe("beginner calculator", () => {
  it("ingredients add up to total dough weight", () => {
    const r = beginnerRecipe(4, 260, 65, 2.8, 0.2);
    expect(r.flour + r.water + r.salt + r.yeast).toBeCloseTo(1040, 5);
    expect(r.water / r.flour).toBeCloseTo(0.65, 5);
  });
  it("warmer room uses less yeast", () => {
    expect(beginnerYeastPct(0.2, 28)).toBeCloseTo(0.1, 5);
  });
});
