"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CalendarClock } from "lucide-react";

import { Alert } from "@/components/ui/feedback";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiError, apiRequest } from "@/lib/api";
import type { BookingResponse, PublicAvailability } from "@/lib/types";

function dateKey(value: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function formatDay(key: string): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(`${key}T12:00:00.000Z`));
}

function formatTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function BookingRequestForm({
  expertProfileId,
  expertName,
  availability,
}: {
  expertProfileId: string;
  expertName: string;
  availability: PublicAvailability;
}) {
  const router = useRouter();
  const idempotencyKey = useRef<string | null>(null);
  const [selectedStartsAt, setSelectedStartsAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groups = new Map<string, PublicAvailability["slots"]>();

  for (const slot of availability.slots) {
    const key = dateKey(slot.startsAt, availability.timezone);
    const slots = groups.get(key) ?? [];
    slots.push(slot);
    groups.set(key, slots);
  }

  const selectedSlot = availability.slots.find(
    (slot) => slot.startsAt === selectedStartsAt,
  );
  const selectedDuration = selectedSlot
    ? Math.round(
        (new Date(selectedSlot.endsAt).getTime() -
          new Date(selectedSlot.startsAt).getTime()) /
          60_000,
      )
    : null;

  async function requestBooking() {
    if (!selectedStartsAt || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    if (!idempotencyKey.current) {
      idempotencyKey.current = crypto.randomUUID();
    }

    try {
      const response = await apiRequest<BookingResponse>("/bookings", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey.current },
        body: JSON.stringify({ expertProfileId, startsAt: selectedStartsAt }),
      });

      router.push(`/bookings/${response.booking.id}?created=1`);
    } catch (requestError) {
      if (
        requestError instanceof ApiError &&
        requestError.code === "SLOT_UNAVAILABLE"
      ) {
        idempotencyKey.current = null;
        setSelectedStartsAt(null);
        setError(
          "That time was just taken. Refresh the page to see the latest availability.",
        );
      } else {
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "We could not send your request. Check your connection and try again.",
        );
      }

      setSubmitting(false);
    }
  }

  return (
    <Card id="request-booking" className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary-50 text-primary-700">
          <CalendarClock aria-hidden="true" className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Request a mock interview
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Choose an open time with {expertName}. Your request is not confirmed
            until the expert approves it and payment succeeds.
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        Times are in the expert&apos;s timezone ({availability.timezone}) and
        require at least {availability.minimumNoticeMinutes / 60} hours&apos;
        notice. No payment is taken when you send the request.
      </p>

      {groups.size === 0 ? (
        <p className="mt-4 rounded-control border border-dashed border-border px-4 py-3 text-sm text-muted">
          No open times in the next two weeks. Check back soon.
        </p>
      ) : (
        <div className="mt-5 max-h-[28rem] space-y-4 overflow-y-auto overscroll-contain pr-1">
          {[...groups.entries()].map(([key, slots]) => (
            <div key={key}>
              <p className="text-xs font-semibold text-muted">
                {formatDay(key)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {slots.map((slot) => {
                  const selected = selectedStartsAt === slot.startsAt;

                  return (
                    <button
                      key={slot.startsAt}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setSelectedStartsAt(slot.startsAt);
                        setError(null);
                      }}
                      className={buttonClasses({
                        variant: selected ? "primary" : "subtle",
                        size: "sm",
                        className:
                          "h-11 min-w-16 border-primary-200 px-3 text-xs",
                      })}
                    >
                      {formatTime(slot.startsAt, availability.timezone)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedSlot ? (
        <div className="mt-5 rounded-control border border-primary-200 bg-primary-50 px-4 py-3 text-sm">
          <p className="font-semibold text-foreground">
            {formatDay(dateKey(selectedSlot.startsAt, availability.timezone))}{" "}
            at {formatTime(selectedSlot.startsAt, availability.timezone)}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {selectedDuration} minutes · {availability.timezone}
          </p>
        </div>
      ) : null}

      <div aria-live="polite">
        {error ? (
          <Alert variant="danger" className="mt-4">
            {error}
          </Alert>
        ) : null}
      </div>

      <Button
        type="button"
        onClick={requestBooking}
        disabled={!selectedStartsAt}
        loading={submitting}
        className="mt-5 w-full"
      >
        {submitting ? "Sending request…" : "Request booking"}
      </Button>

      <Link
        href="/experts"
        className={buttonClasses({
          variant: "secondary",
          className: "mt-3 w-full",
        })}
      >
        Browse other experts
      </Link>
    </Card>
  );
}
