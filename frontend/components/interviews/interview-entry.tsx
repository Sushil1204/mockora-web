import Link from "next/link";

import { formatBookingDateTime } from "@/lib/labels";
import type { InterviewState } from "@/lib/types";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export function InterviewEntry({
  bookingId,
  interview,
}: {
  bookingId: string;
  interview: InterviewState | null;
}) {
  if (!interview) {
    return (
      <div className="mt-6 rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-muted">
        We could not confirm interview access. Refresh the page to try again.
      </div>
    );
  }

  const timezone = interview.booking.timezone;
  const joinOpens = formatBookingDateTime(
    interview.joinWindow.opensAt,
    timezone,
  );
  const joinCloses = formatBookingDateTime(
    interview.joinWindow.closesAt,
    timezone,
  );

  return (
    <section className="mt-6 rounded-xl border border-primary-200 bg-primary-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-primary-900">
            Interview room
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-primary-700">
            Your video interview runs inside Mockoraa. Only the candidate and
            expert on this booking can join.
          </p>
        </div>
        <span className="rounded-full border border-primary-300 bg-surface px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-700">
          Recording off
        </span>
      </div>

      {interview.canJoin ? (
        <>
          <p className="mt-4 text-sm text-primary-800">
            The room is open until {joinCloses}.
          </p>
          <Link
            href={`/bookings/${bookingId}/interview`}
            className={`${primaryButtonClass} mt-4`}
          >
            Join interview room
          </Link>
        </>
      ) : (
        <>
          <p className="mt-4 text-sm leading-relaxed text-primary-800">
            {joinMessage(interview, joinOpens, joinCloses)}
          </p>
          {interview.unavailableReason === "NOT_OPEN" ? (
            <Link
              href={`/bookings/${bookingId}/interview`}
              className={`${secondaryButtonClass} mt-4`}
            >
              View room details
            </Link>
          ) : null}
        </>
      )}

      <p className="mt-3 text-xs leading-relaxed text-primary-700">
        Join a few minutes early to check your microphone and camera. The join
        window is validated by the server.
      </p>
    </section>
  );
}

function joinMessage(
  interview: InterviewState,
  joinOpens: string,
  joinCloses: string,
): string {
  if (interview.unavailableReason === "NOT_CONFIGURED") {
    return "Video interviews are not configured for this environment yet.";
  }

  if (interview.unavailableReason === "NOT_CONFIRMED") {
    return "The interview room opens after the booking is confirmed.";
  }

  if (interview.unavailableReason === "NOT_OPEN") {
    return `The interview room opens at ${joinOpens} and closes at ${joinCloses}.`;
  }

  if (interview.unavailableReason === "WINDOW_CLOSED") {
    return `The interview join window closed at ${joinCloses}.`;
  }

  if (interview.unavailableReason === "ENDED") {
    return "This interview session has ended.";
  }

  return "The interview room is not available right now.";
}
