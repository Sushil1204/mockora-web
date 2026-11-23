import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Booking } from "@/lib/types";

import { BookingCard } from "./booking-card";

const booking: Booking = {
  id: "booking-1",
  status: "PENDING_EXPERT_APPROVAL",
  startsAt: "2026-12-01T10:00:00.000Z",
  endsAt: "2026-12-01T10:45:00.000Z",
  timezone: "UTC",
  durationMinutes: 45,
  priceAmount: 100,
  currency: "USD",
  expertPayoutAmount: 80,
  platformAmount: 20,
  expertResponseDeadline: "2026-12-01T09:00:00.000Z",
  paymentDeadline: null,
  confirmedAt: null,
  cancelledAt: null,
  completedAt: null,
  createdAt: "2026-11-23T10:00:00.000Z",
  updatedAt: "2026-11-23T10:00:00.000Z",
  viewer: { isCandidate: true, isExpert: false },
  expert: {
    id: "expert-1",
    name: "Chen Wei",
    avatarUrl: null,
    professionalHeadline: "ML interview coach",
    timezone: "UTC",
  },
  candidate: {
    id: "candidate-1",
    name: "Demo Candidate",
    avatarUrl: null,
  },
  reservation: null,
  history: [],
};

describe("BookingCard", () => {
  it("shows the expert and response deadline from the candidate view", () => {
    render(<BookingCard booking={booking} perspective="candidate" />);

    expect(
      screen.getByRole("heading", { name: "Chen Wei" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Awaiting expert approval")).toBeInTheDocument();
    expect(screen.getByText(/not confirmed yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view booking/i })).toHaveAttribute(
      "href",
      "/bookings/booking-1",
    );
  });

  it("shows the candidate from the expert view", () => {
    render(
      <BookingCard
        booking={{
          ...booking,
          viewer: { isCandidate: false, isExpert: true },
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Demo Candidate" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Candidate")).toBeInTheDocument();
  });
});
