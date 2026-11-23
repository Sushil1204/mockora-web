import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Booking, BookingStatus, PublicUser } from "@/lib/types";

import { CandidateOverviewView } from "./candidate-overview-view";

const user: PublicUser = {
  id: "candidate-1",
  email: "priya@example.com",
  name: "Priya Shah",
  avatarUrl: null,
  countryCode: "IN",
  preferredLanguage: "English",
  emailVerifiedAt: "2026-11-20T10:00:00.000Z",
  accountStatus: "ACTIVE",
  roles: ["CANDIDATE"],
  createdAt: "2026-11-20T10:00:00.000Z",
  updatedAt: "2026-11-20T10:00:00.000Z",
};

function booking(
  id: string,
  status: BookingStatus,
  overrides: Partial<Booking> = {},
): Booking {
  return {
    id,
    status,
    startsAt: "2026-11-25T14:30:00.000Z",
    endsAt: "2026-11-25T15:00:00.000Z",
    timezone: "America/New_York",
    durationMinutes: 30,
    priceAmount: null,
    currency: null,
    expertPayoutAmount: null,
    platformAmount: null,
    expertResponseDeadline: "2026-11-23T18:00:00.000Z",
    paymentDeadline: null,
    confirmedAt: null,
    cancelledAt: null,
    completedAt: null,
    createdAt: "2026-11-23T17:00:00.000Z",
    updatedAt: "2026-11-23T17:00:00.000Z",
    viewer: { isCandidate: true, isExpert: false },
    expert: {
      id: "expert-1",
      name: "Chen Wei",
      avatarUrl: null,
      professionalHeadline: "Interview coach",
      timezone: "America/New_York",
    },
    candidate: {
      id: "candidate-1",
      name: "Priya Shah",
      avatarUrl: null,
    },
    reservation: null,
    history: [],
    ...overrides,
  };
}

function renderView(bookings: Booking[]) {
  return render(
    <CandidateOverviewView
      user={user}
      bookings={bookings}
      unreadCount={0}
      loading={false}
      bookingsError={false}
      notificationsError={false}
      onRetryBookings={vi.fn()}
    />,
  );
}

describe("CandidateOverviewView", () => {
  it("shows the discovery path when the candidate has no bookings", () => {
    renderView([]);

    expect(
      screen.getByRole("heading", { name: "Welcome back, Priya." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Ready to practise?" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Upcoming interviews" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /explore experts/i })[0],
    ).toHaveAttribute("href", "/experts");
  });

  it("puts a payment deadline ahead of other activity", () => {
    renderView([
      booking("payment", "APPROVED_PENDING_PAYMENT", {
        paymentDeadline: "2026-11-23T18:00:00.000Z",
      }),
      booking("confirmed", "CONFIRMED"),
    ]);

    expect(
      screen.getByRole("heading", {
        name: "Your request has been approved.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /complete payment/i }),
    ).toHaveAttribute("href", "/bookings/payment");
    expect(
      screen.getByText(/complete payment by mon, nov 23/i),
    ).toBeInTheDocument();
  });

  it("shows a pending request and hides upcoming interviews", () => {
    renderView([booking("pending", "PENDING_EXPERT_APPROVAL")]);

    expect(
      screen.getByRole("heading", {
        name: "Waiting for expert approval.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view request/i })).toHaveAttribute(
      "href",
      "/bookings/pending",
    );
    expect(
      screen.queryByRole("heading", { name: "Upcoming interviews" }),
    ).not.toBeInTheDocument();
  });

  it("shows confirmed sessions with expert, time, duration, and status", () => {
    renderView([booking("confirmed", "CONFIRMED")]);

    expect(
      screen.getByRole("heading", {
        name: "Your next interview is confirmed.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Upcoming interviews" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Chen Wei")).toHaveLength(2);
    expect(screen.getAllByText("Confirmed")).toHaveLength(2);
    expect(screen.getAllByText(/30 minutes · America\/New_York/)).toHaveLength(
      2,
    );
  });
});
