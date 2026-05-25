export interface ParsedPreferences {
  cuisine: string;
  budget: "low" | "medium" | "high";
  groupSize: number;
  intent: "delivery" | "dine-in";
  location: string;
}

export interface ParseResult {
  success: boolean;
  preferences?: ParsedPreferences;
  needsManualInput?: boolean;
  missingFields?: string[];
}

/**
 * Validates and normalizes raw parsed output from OpenAI into a structured ParseResult.
 */
export function validateParsedOutput(raw: unknown): ParseResult {
  if (!raw || typeof raw !== "object") {
    return {
      success: false,
      needsManualInput: true,
      missingFields: ["cuisine", "budget", "groupSize", "intent"],
    };
  }

  const parsed = raw as Record<string, unknown>;
  const missingFields: string[] = [];

  if (!parsed.cuisine || typeof parsed.cuisine !== "string") {
    missingFields.push("cuisine");
  }
  if (!parsed.budget || !["low", "medium", "high"].includes(parsed.budget as string)) {
    missingFields.push("budget");
  }
  if (!parsed.groupSize || typeof parsed.groupSize !== "number" || parsed.groupSize < 1) {
    missingFields.push("groupSize");
  }
  if (!parsed.intent || !["delivery", "dine-in"].includes(parsed.intent as string)) {
    missingFields.push("intent");
  }

  if (missingFields.length > 0) {
    return {
      success: false,
      needsManualInput: true,
      missingFields,
      preferences: {
        cuisine: (parsed.cuisine as string) || "",
        budget: (["low", "medium", "high"].includes(parsed.budget as string) ? parsed.budget : "medium") as ParsedPreferences["budget"],
        groupSize: (typeof parsed.groupSize === "number" && parsed.groupSize >= 1) ? parsed.groupSize : 2,
        intent: (["delivery", "dine-in"].includes(parsed.intent as string) ? parsed.intent : "dine-in") as ParsedPreferences["intent"],
        location: (parsed.location as string) || "",
      },
    };
  }

  return {
    success: true,
    preferences: {
      cuisine: parsed.cuisine as string,
      budget: parsed.budget as ParsedPreferences["budget"],
      groupSize: parsed.groupSize as number,
      intent: parsed.intent as ParsedPreferences["intent"],
      location: (parsed.location as string) || "",
    },
  };
}
