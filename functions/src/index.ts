import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import OpenAI from "openai";
import { validateParsedOutput, ParseResult } from "./parseUtils";

admin.initializeApp();

const openaiApiKey = defineString("OPENAI_API_KEY");

const SYSTEM_PROMPT = `You are a food preference parser. Extract structured information from a user's natural-language description of their group dining preferences.

Return a JSON object with these fields:
- cuisine: string (the type of food, e.g. "Italian", "Japanese", "Mexican", "Indian", "Thai", "American", "Chinese", "Korean", "Mediterranean", "Vietnamese")
- budget: "low" | "medium" | "high" (low = cheap/budget/affordable, medium = moderate/mid-range, high = expensive/fancy/upscale)
- groupSize: number (the number of people eating, default to 2 if not mentioned)
- intent: "delivery" | "dine-in" (whether they want food delivered or to eat at the restaurant, default to "dine-in" if not mentioned)
- location: string (any location mentioned, or empty string if not mentioned)

Rules:
- If a field cannot be determined from the input, set it to null.
- Always return valid JSON.
- Do not include any text outside the JSON object.
- Be generous in interpretation — infer from context when possible.

Examples:
Input: "We want cheap Thai food delivered for 4 people in Brooklyn"
Output: {"cuisine":"Thai","budget":"low","groupSize":4,"intent":"delivery","location":"Brooklyn"}

Input: "Fancy Italian dinner for a date night"
Output: {"cuisine":"Italian","budget":"high","groupSize":2,"intent":"dine-in","location":""}

Input: "Something spicy and affordable for 6 of us"
Output: {"cuisine":"spicy","budget":"low","groupSize":6,"intent":"dine-in","location":""}`;

export { SYSTEM_PROMPT };

export const parsePrompt = onCall(async (request: { data: { prompt?: string } }) => {
  const prompt = request.data?.prompt;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    throw new HttpsError("invalid-argument", "A non-empty prompt string is required.");
  }

  try {
    const openai = new OpenAI({ apiKey: openaiApiKey.value() });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt.trim() },
      ],
      temperature: 0.2,
      max_tokens: 200,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return {
        success: false,
        needsManualInput: true,
        missingFields: ["cuisine", "budget", "groupSize", "intent"],
      } as ParseResult;
    }

    const parsed = JSON.parse(content);
    return validateParsedOutput(parsed);
  } catch (error) {
    console.error("parsePrompt error:", error);
    return {
      success: false,
      needsManualInput: true,
      missingFields: ["cuisine", "budget", "groupSize", "intent"],
    } as ParseResult;
  }
});
