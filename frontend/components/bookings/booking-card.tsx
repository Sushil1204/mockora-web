import Link from "next/link";

import { formatBookingDateTime } from "@/lib/labels";
import type { Booking } from "@/lib/types";
import { cardClass, secondaryButtonClass } from "@/lib/ui";

import { BookingStatusBadge } from "./booking-status-badge";

function bookingNote(booking: Booking): string {
  if (booking.status === "PENDING_EXPERT_APPROVAL") {
    return `The expert has until ${formatBookingDateTime(
      booking.expertResponseDeadline,
      booking.timezone,
    )} to respond. This request is not confirmed yet.`;
  }

  if (booking.status === "APPROVED_PENDING_PAYMENT") {
    return booking.paymentDeadline
      ? `Payment is required by ${formatBookingDateTime(
          booking.paymentDeadline,
          booking.timezone,
        )}. Payment opens in the next release, so this booking is not confirmed yet.`
      : "Payment is required. This booking is not confirmed yet.";
  }

  if (booking.status === "EXPIRED") {
    return "Booking expired. The time limit to complete this step has passed. Please book another session.";
  }

  if (booking.status === "DECLINED") {
    const reason = booking.history.at(-1)?.reason;
    return reason
      ? `The expert declined this request: ${reason}`
      : "The expert declined this request.";
  }

  if (booking.status === "CONFIRMED") {
    return "This booking is confirmed.";
  }

  return "Open the booking to see its current status.";
}

export function BookingCard({
  booking,
  perspective,
}: {
  booking: Booking;
  perspective?: "candidate" | "expert";
}) {
  const view =
    perspective ?? (booking.viewer.isExpert ? "expert" : "candidate");
  const counterpart =
    view === "candidate"
      ? { label: "Expert", name: booking.expert.name }
      : { label: "Candidate", name: booking.candidate.name };

  return (
    <article className={`${cardClass} flex h-full flex-col`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {counterpart.label}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            {counterpart.name}
          </h2>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      <p className="mt-4 text-base font-medium text-foreground">
        {formatBookingDateTime(booking.startsAt, booking.timezone)}
      </p>
      <p className="mt-1 text-sm text-muted">
        {booking.durationMinutes} minutes · {booking.timezone}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {bookingNote(booking)}
      </p>

      <Link
        href={`/bookings/${booking.id}`}
        className={`${secondaryButtonClass} mt-5`}
      >
        View booking
      </Link>
    </article>
  );
}
