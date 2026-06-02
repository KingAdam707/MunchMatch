/**
 * Core application types for MunchMatch.
 */

export interface Restaurant {
  id: string;
  displayName: string;
  rating: number;
  photoReference: string | null;
  photos?: string[];
  address: string | null;
  priceLevel: string | null;
  websiteUri: string | null;
  googleMapsUri: string | null;
  openNow: boolean | null;
  weekdayHours: string[] | null;
  location: { lat: number; lng: number } | null;
}

export interface TagSet {
  cuisine: string;
  budget: "low" | "medium" | "high";
  groupSize: number;
  location: string;
}

export type SessionState =
  | "lobby"
  | "active"
  | "waiting"
  | "match"
  | "no_match"
  | "error"
  | "cancelled";

export interface Session {
  id: string;
  hostUid: string;
  state: SessionState;
  restaurants: Restaurant[];
  matchedRestaurantId: string | null;
  createdAt: Date;
}
