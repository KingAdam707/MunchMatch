import { isCacheComplete } from "../cache";
import type { Session, Restaurant } from "@/types";
import { makeRestaurant } from "@/test-utils/restaurant";

// isCacheComplete doesn't inspect createdAt — only its presence matters here
const mockTimestamp = {} as Date;

function makeSession(restaurants: Restaurant[]): Session {
  return {
    id: "session-1",
    hostUid: "uid-host",
    state: "lobby",
    restaurants,
    matchedRestaurantId: null,
    createdAt: mockTimestamp,
  };
}

const completeRestaurant: Restaurant = makeRestaurant({
  id: "r1",
  displayName: "Pizza Place",
  rating: 4.2,
  photoReference: "photo-ref-123",
});

const completeRestaurantNullPhoto: Restaurant = makeRestaurant({
  id: "r2",
  displayName: "Burger Bar",
  rating: 4.5,
  // photoReference stays null — null is valid, the key must exist
});

describe("isCacheComplete", () => {
  it("returns true for a session with all required fields present", () => {
    const session = makeSession([completeRestaurant]);
    expect(isCacheComplete(session)).toBe(true);
  });

  it("returns true when photoReference is null (null is a valid value)", () => {
    const session = makeSession([completeRestaurantNullPhoto]);
    expect(isCacheComplete(session)).toBe(true);
  });

  it("returns true for multiple complete restaurants", () => {
    const session = makeSession([completeRestaurant, completeRestaurantNullPhoto]);
    expect(isCacheComplete(session)).toBe(true);
  });

  it("returns false for an empty restaurants array", () => {
    const session = makeSession([]);
    expect(isCacheComplete(session)).toBe(false);
  });

  it("returns false when a restaurant has an empty id", () => {
    const session = makeSession([{ ...completeRestaurant, id: "" }]);
    expect(isCacheComplete(session)).toBe(false);
  });

  it("returns false when a restaurant has an empty displayName", () => {
    const session = makeSession([{ ...completeRestaurant, displayName: "" }]);
    expect(isCacheComplete(session)).toBe(false);
  });

  it("returns false when a restaurant is missing the photoReference key", () => {
    // Simulate a partially-written document missing the photoReference field
    const incomplete = { id: "r1", displayName: "Pizza", rating: 4.0 } as Restaurant;
    const session = makeSession([incomplete]);
    expect(isCacheComplete(session)).toBe(false);
  });

  it("returns false when one restaurant in a list is incomplete", () => {
    const session = makeSession([
      completeRestaurant,
      { ...completeRestaurant, id: "" }, // second entry is broken
    ]);
    expect(isCacheComplete(session)).toBe(false);
  });
});
