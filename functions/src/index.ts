import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import OpenAI from "openai";
import { validateParsedOutput, ParseResult } from "./parseUtils";
import {
  buildSearchParams,
  filterByRating,
  filterByDelivery,
  mapPlaceToRestaurant,
  PlaceResult,
  FetchRestaurantsParams,
} from "./restaurantUtils";

admin.initializeApp();

const openaiApiKey = defineString("OPENAI_API_KEY");
const googlePlacesApiKey = defineString("GOOGLE_PLACES_API_KEY");

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


const DEFAULT_RADIUS = 5000; // 5km
const EXPANDED_RADIUS = 10000; // 10km
const MIN_RATING_HIGH = 3.5;
const MIN_RATING_LOW = 3.0;
const TARGET_RESULTS = 5;

export const fetchRestaurants = onCall(async (request: { data: FetchRestaurantsParams }) => {
  const { preferences, lat, lng } = request.data ?? {};

  if (!preferences || typeof lat !== "number" || typeof lng !== "number") {
    throw new HttpsError(
      "invalid-argument",
      "preferences (object), lat (number), and lng (number) are required."
    );
  }

  const apiKey = googlePlacesApiKey.value();

  // First attempt: standard radius, 3.5 star minimum
  let results = await searchPlaces(preferences, lat, lng, DEFAULT_RADIUS, apiKey);
  let filtered = filterByRating(results, MIN_RATING_HIGH);

  if (preferences.intent === "delivery") {
    filtered = filterByDelivery(filtered);
  }

  // Retry with relaxed criteria if fewer than 5 results
  if (filtered.length < TARGET_RESULTS) {
    results = await searchPlaces(preferences, lat, lng, EXPANDED_RADIUS, apiKey);
    filtered = filterByRating(results, MIN_RATING_LOW);

    if (preferences.intent === "delivery") {
      filtered = filterByDelivery(filtered);
    }
  }

  // Take top 5 by rating
  const top5 = filtered
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, TARGET_RESULTS);

  const restaurants = top5.map((place) => mapPlaceToRestaurant(place, apiKey, lat, lng));

  return { restaurants };
});

async function searchPlaces(
  preferences: FetchRestaurantsParams["preferences"],
  lat: number,
  lng: number,
  radius: number,
  apiKey: string
): Promise<PlaceResult[]> {
  const params = buildSearchParams(preferences, lat, lng, radius);
  params.key = apiKey;

  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new HttpsError("internal", `Google Places API returned status ${response.status}`);
  }

  const data = (await response.json()) as { results?: PlaceResult[]; status?: string };

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new HttpsError("internal", `Google Places API error: ${data.status}`);
  }

  return data.results ?? [];
}
