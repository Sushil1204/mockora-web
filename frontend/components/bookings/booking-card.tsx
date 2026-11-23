import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3 } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatBookingDateTime } from "@/lib/labels";
import type { Booking } from "@/lib/types";

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
        )}. This booking is not confirmed until payment succeeds.`
      : "Payment is required. This booking is not confirmed until payment succeeds.";
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
    return "This booking is confirmed and the interview slot is secured.";
  }

  if (booking.status === "IN_PROGRESS") {
    return "This interview is in progress. Rejoin from the booking while the join window is open.";
  }

  if (booking.status === "COMPLETED_PENDING_FEEDBACK") {
    return "The interview has ended and feedback is pending.";
  }

  if (booking.status === "COMPLETED") {
    return "The interview is complete and the feedback report has been submitted.";
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
    <Card className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={counterpart.name} size="md" />
          <div className="min-w-0">
            <p className="text-overline font-semibold uppercase text-muted">
              {counterpart.label}
            </p>
            <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-foreground">
              {counterpart.name}
            </h2>
          </div>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      <dl className="mt-5 space-y-3 border-t border-border pt-5 text-sm">
        <dt className="sr-only">Interview time</dt>
        <dd className="flex items-start gap-2.5 font-medium text-foreground">
          <CalendarDays
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-primary-600"
          />
          <span className="min-w-0">
            {formatBookingDateTime(booking.startsAt, booking.timezone)}
          </span>
        </dd>
        <dt className="sr-only">Duration</dt>
        <dd className="flex items-start gap-2.5 text-muted">
          <Clock3
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-primary-600"
          />
          <span className="min-w-0">
            {booking.durationMinutes} minutes · {booking.timezone}
          </span>
        </dd>
      </dl>

      <p className="mt-4 text-sm leading-relaxed text-muted">
        {bookingNote(booking)}
      </p>

      <div className="mt-auto pt-5">
        <Link
          href={`/bookings/${booking.id}`}
          className={buttonClasses({
            variant: "secondary",
            className: "w-full",
          })}
        >
          View booking
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  );
}
