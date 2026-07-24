/**
 * @jest-environment jsdom
 */

import React from "react";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { AuthContext } from "@/app/context/AuthContext";
import RestaurantCard from "../RestaurantCard";
import MatchScreen from "../MatchScreen";
import type { Restaurant } from "@/types";
import { makeRestaurant } from "@/test-utils/restaurant";
import type { MotionMockProps } from "@/test-utils/motionMockProps";

expect.extend(toHaveNoViolations);

// Mock framer-motion
jest.mock("framer-motion", () => {
  const MockMotionDiv = React.forwardRef<HTMLDivElement, MotionMockProps>(
    ({ children, ...props }, ref) => {
      // Filter out non-DOM props
      const {
        drag, dragConstraints, dragElastic, dragSnapToOrigin,
        onDragEnd, initial, animate, transition, whileHover,
        whileTap, exit, ...domProps
      } = props;
      return (
        <div ref={ref} {...(domProps as React.ComponentPropsWithoutRef<"div">)}>
          {children as React.ReactNode}
        </div>
      );
    }
  );
  MockMotionDiv.displayName = "MockMotionDiv";

  const MockMotionMain = React.forwardRef<HTMLElement, MotionMockProps>(
    ({ children, ...props }, ref) => {
      const { initial, animate, transition, ...domProps } = props;
      return (
        <main ref={ref} {...(domProps as React.ComponentPropsWithoutRef<"main">)}>
          {children as React.ReactNode}
        </main>
      );
    }
  );
  MockMotionMain.displayName = "MockMotionMain";

  return {
    motion: { div: MockMotionDiv, main: MockMotionMain },
    useMotionValue: () => ({ get: () => 0, set: () => {} }),
    useTransform: () => ({ get: () => 0 }),
  };
});

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockRestaurant: Restaurant = makeRestaurant({
  id: "place-123",
  displayName: "Taco Palace",
  rating: 4.5,
  photoReference: "https://example.com/photo.jpg",
});

const mockRestaurantNoPhoto: Restaurant = makeRestaurant({
  id: "place-456",
  displayName: "Burger Barn",
  rating: 3.8,
});

function renderWithAuth(ui: React.ReactElement) {
  return render(
    <AuthContext.Provider
      value={{ uid: "test-uid", authError: null, loading: false }}
    >
      {ui}
    </AuthContext.Provider>
  );
}

describe("Accessibility Tests — Card Components (Task 12.1)", () => {
  describe("RestaurantCard with photo", () => {
    it("should have no accessibility violations", async () => {
      const { container } = render(
        <div style={{ position: "relative", width: 300, height: 400 }}>
          <RestaurantCard
            restaurant={mockRestaurant}
            onSwipe={jest.fn()}
          />
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("RestaurantCard with placeholder", () => {
    it("should have no accessibility violations", async () => {
      const { container } = render(
        <div style={{ position: "relative", width: 300, height: 400 }}>
          <RestaurantCard
            restaurant={mockRestaurantNoPhoto}
            onSwipe={jest.fn()}
          />
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("MatchScreen", () => {
    it("should have no accessibility violations", async () => {
      const { container } = renderWithAuth(
        <MatchScreen restaurant={mockRestaurant} hostUid="host-uid" />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("MatchScreen with disabled Google Maps button", () => {
    it("should have no accessibility violations", async () => {
      const restaurantNoId: Restaurant = makeRestaurant({
        id: "",
        displayName: "No ID Place",
        rating: 4.0,
      });
      const { container } = renderWithAuth(
        <MatchScreen restaurant={restaurantNoId} hostUid="host-uid" />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
