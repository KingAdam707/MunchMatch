/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SwipeDeck from "../SwipeDeck";
import { AuthContext } from "@/app/context/AuthContext";
import type { Restaurant } from "@/types";
import { makeRestaurant } from "@/test-utils/restaurant";
import type { MotionMockProps } from "@/test-utils/motionMockProps";

// Mock framer-motion
jest.mock("framer-motion", () => {
  const MockMotionDiv = React.forwardRef<HTMLDivElement, MotionMockProps>(
    (
      {
        children,
        onDragEnd: _onDragEnd,
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

// Mock firebase/firestore
const mockSetDoc = jest.fn();
const mockOnSnapshot = jest.fn<jest.Mock, unknown[]>(() => jest.fn());
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  deleteField: jest.fn(),
  collection: jest.fn(),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

jest.mock("@/app/lib/firebase", () => ({
  db: {},
}));

const mockRestaurants: Restaurant[] = [
  makeRestaurant({ id: "r1", displayName: "Pizza Place", rating: 4.5 }),
  makeRestaurant({ id: "r2", displayName: "Sushi Spot", rating: 4.2 }),
  makeRestaurant({ id: "r3", displayName: "Taco Town", rating: 3.9 }),
];

function renderWithAuth(ui: React.ReactElement) {
  return render(
    <AuthContext.Provider
      value={{ uid: "test-uid", authError: null, loading: false }}
    >
      {ui}
    </AuthContext.Provider>
  );
}

describe("SwipeDeck", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetDoc.mockResolvedValue(undefined);
  });

  it("displays correct progress counter", () => {
    renderWithAuth(
      <SwipeDeck sessionId="session-1" restaurants={mockRestaurants} />
    );

    expect(screen.getByTestId("progress-counter")).toHaveTextContent(
      "3 of 3 remaining"
    );
  });

  it("transitions to WaitingScreen after last card is swiped", async () => {
    renderWithAuth(
      <SwipeDeck sessionId="session-1" restaurants={mockRestaurants} />
    );

    // Swipe all 3 cards
    for (let i = 0; i < 3; i++) {
      const acceptButtons = screen.getAllByTestId("accept-button");
      // Click the first enabled accept button
      const activeButton = acceptButtons.find(
        (btn) => !(btn as HTMLButtonElement).disabled
      );
      if (activeButton) {
        fireEvent.click(activeButton);
        await waitFor(() => {
          expect(mockSetDoc).toHaveBeenCalledTimes(i + 1);
        });
      }
    }

    await waitFor(() => {
      expect(screen.getByText("Waiting for others…")).toBeInTheDocument();
    });
  });

  it("shows error and does not advance when Firestore write fails", async () => {
    mockSetDoc.mockRejectedValueOnce(new Error("Network error"));

    renderWithAuth(
      <SwipeDeck sessionId="session-1" restaurants={mockRestaurants} />
    );

    const acceptButton = screen.getAllByTestId("accept-button")[0];
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Network error");
    });

    // Progress counter should still show 3 remaining (deck didn't advance)
    expect(screen.getByTestId("progress-counter")).toHaveTextContent(
      "3 of 3 remaining"
    );
  });

  it("updates progress counter after successful swipe", async () => {
    renderWithAuth(
      <SwipeDeck sessionId="session-1" restaurants={mockRestaurants} />
    );

    const acceptButton = screen.getAllByTestId("accept-button")[0];
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(screen.getByTestId("progress-counter")).toHaveTextContent(
        "2 of 3 remaining"
      );
    });
  });
});
