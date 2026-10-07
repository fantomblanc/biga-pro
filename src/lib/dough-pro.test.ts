import { describe, expect, it } from "vitest";
import { wCompat } from "./dough-pro";

describe("flour W compatibility with total maturation", () => {
  it("accepts 10.5 hours for W180 because its recommended range is 4–16 hours", () => {
    expect(wCompat(180, false, 62, "napoletana", 10.5)).toBe("ideal");
  });

  it("rejects a maturation longer than the W180 maximum of 16 hours", () => {
    expect(wCompat(180, false, 62, "napoletana", 16.5)).toBe("avoid");
  });
});