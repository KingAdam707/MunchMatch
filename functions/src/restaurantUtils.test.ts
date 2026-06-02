import { describe, it, expect } from "vitest";
import {
  filterByRating,
  filterByDelivery,
  buildSearchParams,
  mapPlaceToRestaurant,
  calculateDistance,
  PlaceResult,
} from "./restaurantUtils";

describe("filterByRating", () => {
  const places: PlaceResult[] = [
    { place_id: "a", name: "High Rated", rating: 4.5 },
    { place_id: "b", name: "Mid Rated", rating: 3.5 },
    { place_id: "c", name: "Low Rated", rating: 3.0 },
    { place_id: "d", name: "Very Low", rating: 2.5 },
    { place_id: "e", name: "No Rating" },
  ];

  it("filters places below 3.5 rating threshold", () => {
    const result = filterByRating(places, 3.5);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.name)).toEqual(["High Rated", "Mid Rated"]);
  });

  it("filters places below 3.0 rating threshold (relaxed retry)", () => {
    const result = filterByRating(places, 3.0);
    expect(result).toHaveLength(3);
    expect(result.map((p) => p.name)).toEqual(["High Rated", "Mid Rated", "Low Rated"]);
  });

  it("excludes places with no rating", () => {
    const result = filterByRating(places, 3.0);
    expect(result.find((p) => p.name === "No Rating")).toBeUndefined();
  });
});

describe("filterByDelivery", () => {
  const places: PlaceResult[] = [
    { place_id: "a", name: "Delivers", types: ["restaurant", "meal_delivery"] },
    { place_id: "b", name: "Takeaway", types: ["restaurant", "meal_takeaway"] },
    { place_id: "c", name: "Dine Only", types: ["restaurant"] },
    { place_id: "d", name: "No Types" },
  ];

  it("keeps only places with meal_delivery or meal_takeaway type", () => {
    const result = filterByDelivery(places);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.name)).toEqual(["Delivers", "Takeaway"]);
  });
});

describe("buildSearchParams", () => {
  it("maps preferences to correct search parameters", () => {
    const params = buildSearchParams(
      { cuisine: "Thai", budget: "low", groupSize: 4, intent: "delivery", location: "" },
      40.7,
      -74.0,
      5000
    );

    expect(params.query).toBe("Thai restaurant");
    expect(params.location).toBe("40.7,-74");
    expect(params.radius).toBe("5000");
    expect(params.type).toBe("restaurant");
    expect(params.minprice).toBe("1");
    expect(params.maxprice).toBe("1");
  });

  it("maps high budget to price levels 3-4", () => {
    const params = buildSearchParams(
      { cuisine: "Italian", budget: "high", groupSize: 2, intent: "dine-in", location: "" },
      51.5,
      -0.1,
      5000
    );

    expect(params.minprice).toBe("3");
    expect(params.maxprice).toBe("4");
  });
});

describe("mapPlaceToRestaurant", () => {
  it("converts a Google Place result to RestaurantOption", () => {
    const place: PlaceResult = {
      place_id: "abc123",
      name: "Test Restaurant",
      rating: 4.2,
      price_level: 2,
      vicinity: "123 Main St",
      geometry: { location: { lat: 40.71, lng: -74.01 } },
      photos: [{ photo_reference: "photo_ref_123" }],
    };

    const result = mapPlaceToRestaurant(place, "API_KEY", 40.7, -74.0);

    expect(result.id).toBe("abc123");
    expect(result.name).toBe("Test Restaurant");
    expect(result.rating).toBe(4.2);
    expect(result.priceLevel).toBe(2);
    expect(result.address).toBe("123 Main St");
    expect(result.photoUrl).toContain("photo_ref_123");
    expect(result.mapsUrl).toContain("abc123");
    expect(result.distance).toMatch(/\d+\.\d+ km/);
  });
});

describe("calculateDistance", () => {
  it("returns 0 for same coordinates", () => {
    expect(calculateDistance(40.7, -74.0, 40.7, -74.0)).toBe(0);
  });

  it("calculates approximate distance between two known points", () => {
    // NYC to Newark is roughly 14-16 km
    const dist = calculateDistance(40.7128, -74.006, 40.7357, -74.1724);
    expect(dist).toBeGreaterThan(13);
    expect(dist).toBeLessThan(17);
  });
});
