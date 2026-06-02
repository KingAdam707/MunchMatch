export interface ParsedPreferences {
  cuisine: string;
  budget: "low" | "medium" | "high";
  groupSize: number;
  intent: "delivery" | "dine-in";
  location: string;
}

export interface RestaurantOption {
  id: string;
  name: string;
  photoUrl: string;
  rating: number;
  priceLevel: number;
  address: string;
  distance: string;
  deliveryUrl?: string;
  mapsUrl: string;
  bookingUrl?: string;
}

export interface PlaceResult {
  place_id: string;
  name: string;
  rating?: number;
  price_level?: number;
  vicinity?: string;
  formatted_address?: string;
  geometry?: { location: { lat: number; lng: number } };
  photos?: Array<{ photo_reference: string }>;
  opening_hours?: { open_now?: boolean };
  types?: string[];
}

export interface FetchRestaurantsParams {
  preferences: ParsedPreferences;
  lat: number;
  lng: number;
}

const BUDGET_TO_PRICE_LEVEL: Record<string, { min: number; max: number }> = {
  low: { min: 1, max: 1 },
  medium: { min: 2, max: 2 },
  high: { min: 3, max: 4 },
};

/**
 * Maps preferences to Google Places Text Search parameters.
 */
export function buildSearchParams(
  preferences: ParsedPreferences,
  lat: number,
  lng: number,
  radius: number
): Record<string, string> {
  const keyword = preferences.cuisine;
  const params: Record<string, string> = {
    query: `${keyword} restaurant`,
    location: `${lat},${lng}`,
    radius: String(radius),
    type: "restaurant",
    key: "", // will be set by caller
  };

  const priceRange = BUDGET_TO_PRICE_LEVEL[preferences.budget];
  if (priceRange) {
    params.minprice = String(priceRange.min);
    params.maxprice = String(priceRange.max);
  }

  return params;
}

/**
 * Filters places by minimum rating threshold.
 */
export function filterByRating(places: PlaceResult[], minRating: number): PlaceResult[] {
  return places.filter((p) => (p.rating ?? 0) >= minRating);
}

/**
 * Filters places that offer delivery (heuristic: check types for "meal_delivery").
 */
export function filterByDelivery(places: PlaceResult[]): PlaceResult[] {
  return places.filter(
    (p) => p.types?.includes("meal_delivery") || p.types?.includes("meal_takeaway")
  );
}

/**
 * Converts a Google Places result into a RestaurantOption.
 */
export function mapPlaceToRestaurant(
  place: PlaceResult,
  apiKey: string,
  userLat: number,
  userLng: number
): RestaurantOption {
  const photoRef = place.photos?.[0]?.photo_reference;
  const photoUrl = photoRef
    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${apiKey}`
    : "";

  const placeLat = place.geometry?.location.lat ?? 0;
  const placeLng = place.geometry?.location.lng ?? 0;
  const distance = calculateDistance(userLat, userLng, placeLat, placeLng);

  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${place.place_id}`;

  return {
    id: place.place_id,
    name: place.name,
    photoUrl,
    rating: place.rating ?? 0,
    priceLevel: place.price_level ?? 2,
    address: place.vicinity || place.formatted_address || "",
    distance: `${distance.toFixed(1)} km`,
    mapsUrl,
  };
}

/**
 * Haversine distance in km between two lat/lng points.
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
