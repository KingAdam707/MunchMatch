import * as fc from "fast-check";
import type { Restaurant } from "@/types";

/**
 * Builds a Restaurant fixture, defaulting the fields added after the original
 * id/displayName/rating/photoReference shape (address, priceLevel, websiteUri,
 * googleMapsUri, openNow, weekdayHours, location) to null.
 */
export function makeRestaurant(
  fields: Partial<Restaurant> & Pick<Restaurant, "id" | "displayName" | "rating">
): Restaurant {
  return {
    photoReference: null,
    address: null,
    priceLevel: null,
    websiteUri: null,
    googleMapsUri: null,
    openNow: null,
    weekdayHours: null,
    location: null,
    ...fields,
  };
}

/** fast-check arbitraries for the Restaurant fields added after the original shape. */
export const restaurantExtraFieldsArb = {
  address: fc.constant(null),
  priceLevel: fc.constant(null),
  websiteUri: fc.constant(null),
  googleMapsUri: fc.constant(null),
  openNow: fc.constant(null),
  weekdayHours: fc.constant(null),
  location: fc.constant(null),
} as const;
