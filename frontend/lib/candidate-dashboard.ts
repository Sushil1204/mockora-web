import type { Booking, BookingHistoryEntry, BookingStatus } from "./types";

const activeStatuses: BookingStatus[] = [
  "IN_PROGRESS",
  "APPROVED_PENDING_PAYMENT",
  "PENDING_EXPERT_APPROVAL",
  "CONFIRMED",
];

const closedStatuses: BookingStatus[] = ["DECLINED", "EXPIRED", "CANCELLED"];

export type CandidateDashboardMetrics = {
  upcoming: number;
  pending: number;
  paymentDue: number;
  completed: number;
};

export type CandidateNextAction =
  | { kind: "ready" }
  | { kind: "inProgress"; booking: Booking }
  | { kind: "payment"; booking: Booking }
  | { kind: "pending"; booking: Booking }
  | { kind: "confirmed"; booking: Booking }
  | { kind: "feedbackPending"; booking: Booking }
  | { kind: "closed"; booking: Booking };

export type CandidateActivity = {
  id: string;
  booking: Booking;
  entry: BookingHistoryEntry;
};

function compareDates(left: string | null, right: string | null) {
  const leftTime = left ? Date.parse(left) : Number.POSITIVE_INFINITY;
  const rightTime = right ? Date.parse(right) : Number.POSITIVE_INFINITY;

  return leftTime === rightTime ? 0 : leftTime - rightTime;
}

function compareNewest(left: string, right: string) {
  return Date.parse(right) - Date.parse(left);
}

export function getCandidateDashboardMetrics(
  bookings: Booking[],
): CandidateDashboardMetrics {
  return {
    upcoming: bookings.filter((booking) =>
      ["CONFIRMED", "IN_PROGRESS"].includes(booking.status),
    ).length,
    pending: bookings.filter(
      (booking) => booking.status === "PENDING_EXPERT_APPROVAL",
    ).length,
    paymentDue: bookings.filter(
      (booking) => booking.status === "APPROVED_PENDING_PAYMENT",
    ).length,
    completed: bookings.filter((booking) => booking.status === "COMPLETED")
      .length,
  };
}

export function getActiveBookingCount(bookings: Booking[]) {
  return bookings.filter((booking) => activeStatuses.includes(booking.status))
    .length;
}

export function getNextCandidateAction(
  bookings: Booking[],
): CandidateNextAction {
  const inProgress = bookings
    .filter((booking) => booking.status === "IN_PROGRESS")
    .sort((left, right) => compareDates(left.startsAt, right.startsAt))[0];

  if (inProgress) {
    return { kind: "inProgress", booking: inProgress };
  }

  const paymentDue = bookings
    .filter((booking) => booking.status === "APPROVED_PENDING_PAYMENT")
    .sort((left, right) =>
      compareDates(left.paymentDeadline, right.paymentDeadline),
    )[0];

  if (paymentDue) {
    return { kind: "payment", booking: paymentDue };
  }

  const pending = bookings
    .filter((booking) => booking.status === "PENDING_EXPERT_APPROVAL")
    .sort((left, right) =>
      compareDates(left.expertResponseDeadline, right.expertResponseDeadline),
    )[0];

  if (pending) {
    return { kind: "pending", booking: pending };
  }

  const confirmed = bookings
    .filter((booking) => booking.status === "CONFIRMED")
    .sort((left, right) => compareDates(left.startsAt, right.startsAt))[0];

  if (confirmed) {
    return { kind: "confirmed", booking: confirmed };
  }

  const feedbackPending = bookings
    .filter((booking) => booking.status === "COMPLETED_PENDING_FEEDBACK")
    .sort((left, right) => compareNewest(left.updatedAt, right.updatedAt))[0];

  if (feedbackPending) {
    return { kind: "feedbackPending", booking: feedbackPending };
  }

  const closed = bookings
    .filter((booking) => closedStatuses.includes(booking.status))
    .sort((left, right) => compareNewest(left.updatedAt, right.updatedAt))[0];

  if (closed) {
    return { kind: "closed", booking: closed };
  }

  return { kind: "ready" };
}

export function getUpcomingBookings(bookings: Booking[]) {
  return bookings
    .filter((booking) => ["CONFIRMED", "IN_PROGRESS"].includes(booking.status))
    .sort((left, right) => compareDates(left.startsAt, right.startsAt));
}

export function getRecentCandidateActivity(
  bookings: Booking[],
  limit = 5,
): CandidateActivity[] {
  return bookings
    .flatMap((booking) =>
      booking.history.map((entry) => ({
        id: entry.id,
        booking,
        entry,
      })),
    )
    .sort((left, right) =>
      compareNewest(left.entry.createdAt, right.entry.createdAt),
    )
    .slice(0, limit);
}
