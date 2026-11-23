import { describe, expect, it } from "vitest";

import {
  getActiveBookingCount,
  getCandidateDashboardMetrics,
  getNextCandidateAction,
  getRecentCandidateActivity,
  getUpcomingBookings,
} from "./candidate-dashboard";
import type { Booking, BookingStatus } from "./types";

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

describe("candidate dashboard helpers", () => {
  it("counts interview activity from booking states", () => {
    const bookings = [
      booking("confirmed", "CONFIRMED"),
      booking("in-progress", "IN_PROGRESS"),
      booking("pending", "PENDING_EXPERT_APPROVAL"),
      booking("payment", "APPROVED_PENDING_PAYMENT"),
      booking("feedback", "COMPLETED_PENDING_FEEDBACK"),
      booking("completed", "COMPLETED"),
      booking("expired", "EXPIRED"),
    ];

    expect(getCandidateDashboardMetrics(bookings)).toEqual({
      upcoming: 2,
      pending: 1,
      paymentDue: 1,
      completed: 1,
    });
    expect(getActiveBookingCount(bookings)).toBe(4);
  });

  it("returns the ready state when there are no bookings", () => {
    expect(getNextCandidateAction([])).toEqual({ kind: "ready" });
  });

  it("prioritises payment over pending and confirmed bookings", () => {
    const payment = booking("payment", "APPROVED_PENDING_PAYMENT", {
      paymentDeadline: "2026-11-23T18:00:00.000Z",
    });

    expect(
      getNextCandidateAction([
        booking("confirmed", "CONFIRMED"),
        booking("pending", "PENDING_EXPERT_APPROVAL"),
        payment,
      ]),
    ).toEqual({ kind: "payment", booking: payment });
  });

  it("selects the earliest expert response deadline", () => {
    const later = booking("later", "PENDING_EXPERT_APPROVAL", {
      expertResponseDeadline: "2026-11-23T19:00:00.000Z",
    });
    const sooner = booking("sooner", "PENDING_EXPERT_APPROVAL", {
      expertResponseDeadline: "2026-11-23T18:00:00.000Z",
    });

    expect(getNextCandidateAction([later, sooner])).toEqual({
      kind: "pending",
      booking: sooner,
    });
  });

  it("surfaces an in-progress interview first", () => {
    const live = booking("live", "IN_PROGRESS");
    const payment = booking("payment", "APPROVED_PENDING_PAYMENT", {
      paymentDeadline: "2026-11-23T18:00:00.000Z",
    });

    expect(getNextCandidateAction([payment, live])).toEqual({
      kind: "inProgress",
      booking: live,
    });
  });

  it("shows feedback pending before older closed requests", () => {
    const feedback = booking("feedback", "COMPLETED_PENDING_FEEDBACK", {
      updatedAt: "2026-11-22T18:00:00.000Z",
    });
    const declined = booking("declined", "DECLINED", {
      updatedAt: "2026-11-23T18:00:00.000Z",
    });

    expect(getNextCandidateAction([declined, feedback])).toEqual({
      kind: "feedbackPending",
      booking: feedback,
    });
  });

  it("uses the most recently updated closed booking when nothing is active", () => {
    const declined = booking("declined", "DECLINED", {
      updatedAt: "2026-11-22T18:00:00.000Z",
    });
    const expired = booking("expired", "EXPIRED", {
      updatedAt: "2026-11-23T18:00:00.000Z",
    });

    expect(getNextCandidateAction([declined, expired])).toEqual({
      kind: "closed",
      booking: expired,
    });
  });

  it("sorts upcoming interviews by start time", () => {
    const later = booking("later", "CONFIRMED", {
      startsAt: "2026-11-26T14:30:00.000Z",
    });
    const sooner = booking("sooner", "CONFIRMED", {
      startsAt: "2026-11-25T14:30:00.000Z",
    });
    const live = booking("live", "IN_PROGRESS", {
      startsAt: "2026-11-24T14:30:00.000Z",
    });

    expect(
      getUpcomingBookings([
        later,
        sooner,
        live,
        booking("completed", "COMPLETED"),
      ]).map((item) => item.id),
    ).toEqual(["live", "sooner", "later"]);
  });

  it("returns the newest booking history entries up to the limit", () => {
    const first = booking("first", "CONFIRMED", {
      history: [
        {
          id: "requested",
          fromStatus: null,
          toStatus: "PENDING_EXPERT_APPROVAL",
          reason: "Booking requested.",
          createdAt: "2026-11-20T10:00:00.000Z",
        },
      ],
    });
    const second = booking("second", "DECLINED", {
      history: [
        {
          id: "declined",
          fromStatus: "PENDING_EXPERT_APPROVAL",
          toStatus: "DECLINED",
          reason: "No longer available.",
          createdAt: "2026-11-22T10:00:00.000Z",
        },
        {
          id: "approved",
          fromStatus: "PENDING_EXPERT_APPROVAL",
          toStatus: "APPROVED_PENDING_PAYMENT",
          reason: "Expert approved the request.",
          createdAt: "2026-11-21T10:00:00.000Z",
        },
      ],
    });

    expect(
      getRecentCandidateActivity([first, second], 2).map((item) => item.id),
    ).toEqual(["declined", "approved"]);
  });
});
