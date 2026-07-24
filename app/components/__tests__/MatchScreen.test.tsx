/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import MatchScreen from "../MatchScreen";
import { AuthContext } from "@/app/context/AuthContext";
import type { Restaurant } from "@/types";
import { makeRestaurant } from "@/test-utils/restaurant";
import type { MotionMockProps } from "@/test-utils/motionMockProps";

// Mock framer-motion
jest.mock("framer-motion", () => {
  const MockMotionMain = React.forwardRef<HTMLElement, MotionMockProps>(
    ({ children, ...props }, ref) => (
      <main ref={ref} {...(props as React.ComponentPropsWithoutRef<"main">)}>
        {children as React.ReactNode}
      </main>
    )
  );
  MockMotionMain.displayName = "MockMotionMain";

  const MockMotionDiv = React.forwardRef<HTMLDivElement, MotionMockProps>(
    ({ children, ...props }, ref) => (
      <div ref={ref} {...(props as React.ComponentPropsWithoutRef<"div">)}>
        {children as React.ReactNode}
      </div>
    )
  );
  MockMotionDiv.displayName = "MockMotionDiv";

  return {
    motion: { main: MockMotionMain, div: MockMotionDiv },
  };
});

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockRestaurant: Restaurant = makeRestaurant({
  id: "place-123",
  displayName: "Taco Palace",
  rating: 4.5,
  photoReference: "https://example.com/photo.jpg",
});

const mockRestaurantNoId: Restaurant = makeRestaurant({
  id: "",
  displayName: "Mystery Spot",
  rating: 3.8,
});

function renderWithAuth(
  ui: React.ReactElement,
  uid = "test-uid"
) {
  return render(
    <AuthContext.Provider value={{ uid, authError: null, loading: false }}>
      {ui}
    </AuthContext.Provider>
  );
}

describe("MatchScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders restaurant name, photo, and rating", () => {
    renderWithAuth(
      <MatchScreen restaurant={mockRestaurant} hostUid="host-uid" />
    );

    expect(screen.getByText("Taco Palace")).toBeInTheDocument();
    expect(screen.getByText("⭐ 4.5 / 5.0")).toBeInTheDocument();
    expect(screen.getByAltText("Photo of Taco Palace")).toBeInTheDocument();
  });

  it("Google Maps button is present and enabled when id is available", () => {
    renderWithAuth(
      <MatchScreen restaurant={mockRestaurant} hostUid="host-uid" />
    );

    const button = screen.getByTestId("google-maps-button");
    expect(button).toBeInTheDocument();
    expect(button).not.toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("href");
    expect(button.getAttribute("href")).toContain("google.com/maps");
  });

  it("Google Maps button is disabled with tooltip when id is empty", () => {
    renderWithAuth(
      <MatchScreen restaurant={mockRestaurantNoId} hostUid="host-uid" />
    );

    const button = screen.getByTestId("google-maps-button");
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      /location data unavailable/i
    );
  });

  it("UberEats button contains encoded displayName", () => {
    renderWithAuth(
      <MatchScreen restaurant={mockRestaurant} hostUid="host-uid" />
    );

    const button = screen.getByTestId("uber-eats-button");
    expect(button).toHaveAttribute("href");
    expect(button.getAttribute("href")).toContain(
      encodeURIComponent("Taco Palace")
    );
  });

  it('Host sees "Start New Session" button', () => {
    renderWithAuth(
      <MatchScreen restaurant={mockRestaurant} hostUid="test-uid" />,
      "test-uid"
    );

    expect(screen.getByTestId("home-button")).toHaveTextContent(
      "Start New Session"
    );
  });

  it('Non-Host sees "Go to Home" button', () => {
    renderWithAuth(
      <MatchScreen restaurant={mockRestaurant} hostUid="different-host" />,
      "test-uid"
    );

    expect(screen.getByTestId("home-button")).toHaveTextContent("Go to Home");
  });
});
