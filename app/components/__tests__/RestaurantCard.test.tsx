/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import RestaurantCard from "../RestaurantCard";
import type { Restaurant } from "@/types";
import { makeRestaurant } from "@/test-utils/restaurant";
import type { MotionMockProps } from "@/test-utils/motionMockProps";

// Mock framer-motion to avoid animation issues in tests
jest.mock("framer-motion", () => {
  const MockMotionDiv = React.forwardRef<HTMLDivElement, MotionMockProps>(
    (
      {
        children,
        onDragEnd,
        onKeyDown,
        className,
        tabIndex,
        role,
        "aria-label": ariaLabel,
        "data-testid": testId,
        ...rest
      },
      ref
    ) => (
      <div
        ref={ref}
        className={className as string | undefined}
        tabIndex={tabIndex as number | undefined}
        role={role as string | undefined}
        aria-label={ariaLabel as string | undefined}
        data-testid={testId as string | undefined}
        onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLDivElement> | undefined}
        data-ondragend={onDragEnd ? "true" : undefined}
        {...(rest as React.ComponentPropsWithoutRef<"div">)}
      >
        {children as React.ReactNode}
      </div>
    )
  );
  MockMotionDiv.displayName = "MockMotionDiv";

  return {
    motion: { div: MockMotionDiv },
    useMotionValue: () => ({ get: () => 0, set: () => {} }),
    useTransform: () => ({ get: () => 0 }),
  };
});

const mockRestaurant: Restaurant = makeRestaurant({
  id: "place-123",
  displayName: "Taco Palace",
  rating: 4.5,
  photoReference: "photos/abc123",
});

const mockRestaurantNoPhoto: Restaurant = makeRestaurant({
  id: "place-456",
  displayName: "Burger Barn",
  rating: 3.8,
});

describe("RestaurantCard", () => {
  it("renders restaurant name, rating, and photo", () => {
    const onSwipe = jest.fn();
    render(<RestaurantCard restaurant={mockRestaurant} onSwipe={onSwipe} />);

    expect(screen.getByText("Taco Palace")).toBeInTheDocument();
    expect(screen.getByText("⭐ 4.5")).toBeInTheDocument();

    const img = screen.getByAltText("Photo 1 of Taco Palace");
    expect(img).toBeInTheDocument();
    expect(img.tagName).toBe("IMG");
  });

  it("renders placeholder when photo is null", () => {
    const onSwipe = jest.fn();
    render(
      <RestaurantCard restaurant={mockRestaurantNoPhoto} onSwipe={onSwipe} />
    );

    expect(screen.getByText("Burger Barn")).toBeInTheDocument();
    expect(screen.getByTestId("photo-placeholder")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Placeholder image for Burger Barn")
    ).toBeInTheDocument();
  });

  it("✗ button triggers reject swipe", () => {
    const onSwipe = jest.fn();
    render(<RestaurantCard restaurant={mockRestaurant} onSwipe={onSwipe} />);

    fireEvent.click(screen.getByTestId("reject-button"));
    expect(onSwipe).toHaveBeenCalledWith("reject");
  });

  it("✓ button triggers accept swipe", () => {
    const onSwipe = jest.fn();
    render(<RestaurantCard restaurant={mockRestaurant} onSwipe={onSwipe} />);

    fireEvent.click(screen.getByTestId("accept-button"));
    expect(onSwipe).toHaveBeenCalledWith("accept");
  });

  it("buttons are disabled when disabled prop is true", () => {
    const onSwipe = jest.fn();
    render(
      <RestaurantCard
        restaurant={mockRestaurant}
        onSwipe={onSwipe}
        disabled={true}
      />
    );

    fireEvent.click(screen.getByTestId("reject-button"));
    fireEvent.click(screen.getByTestId("accept-button"));
    expect(onSwipe).not.toHaveBeenCalled();
  });

  it("duplicate swipe on same card is ignored when disabled", () => {
    const onSwipe = jest.fn();
    const { rerender } = render(
      <RestaurantCard restaurant={mockRestaurant} onSwipe={onSwipe} />
    );

    fireEvent.click(screen.getByTestId("accept-button"));
    expect(onSwipe).toHaveBeenCalledTimes(1);

    // Re-render as disabled (simulating post-vote state)
    rerender(
      <RestaurantCard
        restaurant={mockRestaurant}
        onSwipe={onSwipe}
        disabled={true}
      />
    );

    fireEvent.click(screen.getByTestId("accept-button"));
    expect(onSwipe).toHaveBeenCalledTimes(1); // Still 1
  });

  it("alt text contains restaurant name", () => {
    const onSwipe = jest.fn();
    render(<RestaurantCard restaurant={mockRestaurant} onSwipe={onSwipe} />);

    const img = screen.getByAltText("Photo 1 of Taco Palace");
    expect(img).toBeInTheDocument();
  });

  it("supports left arrow key for reject", () => {
    const onSwipe = jest.fn();
    render(<RestaurantCard restaurant={mockRestaurant} onSwipe={onSwipe} />);

    const card = screen.getByTestId("restaurant-card");
    fireEvent.keyDown(card, { key: "ArrowLeft" });
    expect(onSwipe).toHaveBeenCalledWith("reject");
  });

  it("supports right arrow key for accept", () => {
    const onSwipe = jest.fn();
    render(<RestaurantCard restaurant={mockRestaurant} onSwipe={onSwipe} />);

    const card = screen.getByTestId("restaurant-card");
    fireEvent.keyDown(card, { key: "ArrowRight" });
    expect(onSwipe).toHaveBeenCalledWith("accept");
  });
});
