import { describe, it, expect } from "vitest";
import { validateParsedOutput } from "./parseUtils";

describe("validateParsedOutput", () => {
  it("returns success for a complete valid response", () => {
    const result = validateParsedOutput({
      cuisine: "Thai",
      budget: "low",
      groupSize: 4,
      intent: "delivery",
      location: "Brooklyn",
    });

    expect(result.success).toBe(true);
    expect(result.preferences).toEqual({
      cuisine: "Thai",
      budget: "low",
      groupSize: 4,
      intent: "delivery",
      location: "Brooklyn",
    });
    expect(result.needsManualInput).toBeUndefined();
  });

  it("defaults location to empty string when not provided", () => {
    const result = validateParsedOutput({
      cuisine: "Italian",
      budget: "high",
      groupSize: 2,
      intent: "dine-in",
    });

    expect(result.success).toBe(true);
    expect(result.preferences?.location).toBe("");
  });

  it("flags missing cuisine and returns needsManualInput", () => {
    const result = validateParsedOutput({
      cuisine: null,
      budget: "medium",
      groupSize: 3,
      intent: "dine-in",
    });

    expect(result.success).toBe(false);
    expect(result.needsManualInput).toBe(true);
    expect(result.missingFields).toContain("cuisine");
  });

  it("flags invalid budget value", () => {
    const result = validateParsedOutput({
      cuisine: "Mexican",
      budget: "expensive",
      groupSize: 2,
      intent: "dine-in",
    });

    expect(result.success).toBe(false);
    expect(result.missingFields).toContain("budget");
    expect(result.preferences?.budget).toBe("medium"); // defaults to medium
  });

  it("flags invalid groupSize (zero or negative)", () => {
    const result = validateParsedOutput({
      cuisine: "Japanese",
      budget: "high",
      groupSize: 0,
      intent: "delivery",
    });

    expect(result.success).toBe(false);
    expect(result.missingFields).toContain("groupSize");
    expect(result.preferences?.groupSize).toBe(2); // defaults to 2
  });

  it("flags invalid intent value", () => {
    const result = validateParsedOutput({
      cuisine: "Korean",
      budget: "low",
      groupSize: 5,
      intent: "takeout",
    });

    expect(result.success).toBe(false);
    expect(result.missingFields).toContain("intent");
    expect(result.preferences?.intent).toBe("dine-in"); // defaults to dine-in
  });

  it("returns all missing fields when input is null", () => {
    const result = validateParsedOutput(null);

    expect(result.success).toBe(false);
    expect(result.needsManualInput).toBe(true);
    expect(result.missingFields).toEqual(["cuisine", "budget", "groupSize", "intent"]);
  });

  it("returns all missing fields when input is empty object", () => {
    const result = validateParsedOutput({});

    expect(result.success).toBe(false);
    expect(result.needsManualInput).toBe(true);
    expect(result.missingFields).toHaveLength(4);
  });

  it("preserves partial valid data in preferences when some fields are missing", () => {
    const result = validateParsedOutput({
      cuisine: "Indian",
      budget: "high",
      groupSize: null,
      intent: null,
    });

    expect(result.success).toBe(false);
    expect(result.preferences?.cuisine).toBe("Indian");
    expect(result.preferences?.budget).toBe("high");
    expect(result.preferences?.groupSize).toBe(2); // default
    expect(result.preferences?.intent).toBe("dine-in"); // default
  });
});
