import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

function formatBookingDateTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

function getDateParts(value: string, timeZone: string) {
  const date = new Date(value);

  return {
    weekday: new Intl.DateTimeFormat("en", {
      timeZone,
      weekday: "short",
    }).format(date),
    month: new Intl.DateTimeFormat("en", {
      timeZone,
      month: "short",
    }).format(date),
    day: new Intl.DateTimeFormat("en", {
      timeZone,
      day: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("en", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date),
  };
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
  const date = getDateParts(booking.startsAt, booking.timezone);

  return (
    <Card className="overflow-hidden transition-colors duration-150 hover:border-border-strong">
      <div className="flex flex-col sm:flex-row">
        <div className="flex shrink-0 items-center gap-3 border-b border-border bg-surface-muted/70 px-5 py-4 sm:w-32 sm:flex-col sm:justify-center sm:gap-0 sm:border-b-0 sm:border-r sm:px-4 sm:py-6">
          <p className="text-overline font-semibold uppercase tracking-[0.14em] text-terracotta-600">
            {date.month}
          </p>
          <p className="text-2xl font-semibold leading-none tracking-tight text-foreground sm:mt-1 sm:text-4xl">
            {date.day}
          </p>
          <p className="text-xs font-medium text-muted sm:mt-1">
            {date.weekday}
          </p>
        </div>

        <div className="min-w-0 flex-1 p-5 sm:p-6">
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

          <dl className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <dt className="sr-only">Start time</dt>
              <dd className="inline-flex items-center gap-2">
                <Clock3
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-primary-600"
                />
                <time dateTime={booking.startsAt}>{date.time}</time>
              </dd>
            </div>
            <div className="flex items-center gap-2 text-muted">
              <dt className="sr-only">Duration</dt>
              <dd>
                {booking.durationMinutes} minutes · {booking.timezone}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-xl text-sm leading-relaxed text-muted">
              {bookingNote(booking)}
            </p>
            <Link
              href={`/bookings/${booking.id}`}
              className={buttonClasses({
                variant: "secondary",
                className: "w-full shrink-0 sm:w-auto",
              })}
            >
              View booking
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
