import { describe, it, expect } from "vitest";
import { FLOURS } from "./flours";
import { protocolsFor } from "./beginner-rules";

const get = (id: string) => FLOURS.find((f) => f.id === id)!;

describe("beginner flour rules", () => {
  it("weak flour never exceeds 62% hydration or 12h, and no biga", () => {
    for (const s of ["napo", "teglia", "rapide"] as const)
      for (const p of protocolsFor(get("carrefour_t55"), s)) {
        expect(p.hydra).toBeLessThanOrEqual(62);
        expect(p.hours).toBeLessThanOrEqual(12);
        expect(p.method).not.toBe("biga");
      }
  });
  it("24h 80% biga only on strong flour", () => {
    expect(protocolsFor(get("caputo_cuoco"), "napo")[2]).toMatchObject({ method: "biga", bigaH: 24, bigaPct: 80 });
    const mid = protocolsFor(get("caputo_pizzeria"), "napo")[2];
    expect(mid.bigaH).toBeLessThan(24);
  });
});
