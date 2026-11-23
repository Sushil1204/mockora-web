import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BookingActions } from "@/components/bookings/booking-actions";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { MockPaymentPanel } from "@/components/bookings/mock-payment-panel";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { FeedbackReportView } from "@/components/feedback/feedback-report";
import { ReviewForm } from "@/components/feedback/review-form";
import { InterviewEntry } from "@/components/interviews/interview-entry";
import { fetchServerApi, getCurrentUser } from "@/lib/session";
import {
  bookingStatusLabels,
  formatBookingDateTime,
  formatMoney,
} from "@/lib/labels";
import type {
  BookingResponse,
  FeedbackStateResponse,
  InterviewStateResponse,
} from "@/lib/types";
import { cardClass, secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Booking details",
};

// Booking details depend on the request session.
export const instant = false;

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { bookingId } = await params;
  const { created } = await searchParams;
  const response = await fetchServerApi<BookingResponse>(
    `/bookings/${bookingId}`,
  );

  if (!response) {
    notFound();
  }

  const booking = response.booking;
  const interview =
    booking.status === "CONFIRMED" || booking.status === "IN_PROGRESS"
      ? await fetchServerApi<InterviewStateResponse>(
          `/bookings/${booking.id}/interview-session`,
        )
      : null;
  const feedbackState =
    booking.status === "COMPLETED_PENDING_FEEDBACK" ||
    booking.status === "COMPLETED"
      ? await fetchServerApi<FeedbackStateResponse>(
          `/bookings/${booking.id}/feedback`,
        )
      : null;
  const asExpert = booking.viewer.isExpert;
  const backHref = asExpert ? "/workspace/expert/bookings" : "/bookings";
  const counterpart = asExpert ? booking.candidate : booking.expert;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href={backHref}
        className="text-sm font-medium text-primary-700 hover:underline"
      >
        ← Back to {asExpert ? "booking requests" : "your bookings"}
      </Link>

      {created === "1" ? (
        <p className="mt-6 rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-sm text-success">
          Your request has been sent. The expert has up to two hours to respond.
          This booking is not confirmed yet.
        </p>
      ) : null}

      <section className={`${cardClass} mt-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {asExpert ? "Request from" : "Request with"}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
              {counterpart.name}
            </h1>
          </div>
          <BookingStatusBadge status={booking.status} />
        </div>

        <dl className="mt-6 grid gap-5 border-t border-border pt-6 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Interview time</dt>
            <dd className="mt-1 font-medium text-foreground">
              {formatBookingDateTime(booking.startsAt, booking.timezone)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Duration</dt>
            <dd className="mt-1 font-medium text-foreground">
              {booking.durationMinutes} minutes
            </dd>
          </div>
          <div>
            <dt className="text-muted">Timezone</dt>
            <dd className="mt-1 font-medium text-foreground">
              {booking.timezone}
            </dd>
          </div>
          <div>
            <dt className="text-muted">
              {asExpert ? "Expert payout" : "Session price"}
            </dt>
            <dd className="mt-1 font-medium text-foreground">
              {booking.priceAmount !== null && booking.currency
                ? formatMoney(
                    asExpert
                      ? (booking.expertPayoutAmount ?? 0)
                      : booking.priceAmount,
                    booking.currency,
                  )
                : "Pricing is not configured yet"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Requested</dt>
            <dd className="mt-1 font-medium text-foreground">
              {formatBookingDateTime(booking.createdAt, booking.timezone)}
            </dd>
          </div>
        </dl>

        {booking.status === "PENDING_EXPERT_APPROVAL" ? (
          <p className="mt-6 rounded-lg border border-warning/20 bg-warning-soft px-4 py-3 text-sm text-warning">
            Waiting for the expert to respond by{" "}
            {formatBookingDateTime(
              booking.expertResponseDeadline,
              booking.timezone,
            )}
            .
          </p>
        ) : null}

        {booking.status === "APPROVED_PENDING_PAYMENT" &&
        booking.paymentDeadline ? (
          <div className="mt-6 rounded-lg border border-info/20 bg-info-soft px-4 py-3 text-sm text-info">
            <p>
              Approved. Payment is required by{" "}
              {formatBookingDateTime(booking.paymentDeadline, booking.timezone)}
              .
            </p>
            <p className="mt-1 text-xs">
              {asExpert
                ? "The candidate has one hour from approval to complete payment."
                : "Complete the mock payment below before the deadline. This booking is not confirmed until payment succeeds."}
            </p>
          </div>
        ) : null}

        {booking.status === "APPROVED_PENDING_PAYMENT" && !asExpert ? (
          <MockPaymentPanel bookingId={booking.id} />
        ) : null}

        {booking.status === "CONFIRMED" ? (
          <p className="mt-6 rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-sm text-success">
            {asExpert
              ? "This booking is confirmed and the interview slot is secured."
              : "Mock payment successful. Your booking is confirmed and no real payment was collected."}
            {booking.confirmedAt
              ? ` Confirmed ${formatBookingDateTime(
                  booking.confirmedAt,
                  booking.timezone,
                )}.`
              : ""}
          </p>
        ) : null}

        {booking.status === "IN_PROGRESS" ? (
          <p className="mt-6 rounded-lg border border-info/20 bg-info-soft px-4 py-3 text-sm text-info">
            This interview is in progress. Rejoin here if you lose your
            connection before the join window closes.
          </p>
        ) : null}

        {booking.status === "CONFIRMED" || booking.status === "IN_PROGRESS" ? (
          <InterviewEntry
            bookingId={booking.id}
            interview={interview?.interview ?? null}
          />
        ) : null}

        {booking.status === "EXPIRED" ? (
          <p className="mt-6 rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-muted">
            Booking expired. The time limit to complete this step has passed.
            Please book another session.
          </p>
        ) : null}

        {booking.status === "DECLINED" ? (
          <p className="mt-6 rounded-lg border border-error/20 bg-error-soft px-4 py-3 text-sm text-error">
            {booking.history.at(-1)?.reason ??
              "The expert declined this booking request."}
          </p>
        ) : null}

        {booking.status === "PENDING_EXPERT_APPROVAL" && !asExpert ? (
          <p className="mt-4 text-xs leading-relaxed text-muted">
            You will see the expert&apos;s response here. The slot is held while
            the request is waiting.
          </p>
        ) : null}

        {asExpert && booking.status === "PENDING_EXPERT_APPROVAL" ? (
          <BookingActions bookingId={booking.id} />
        ) : null}

        {booking.status === "COMPLETED_PENDING_FEEDBACK" ? (
          asExpert ? (
            feedbackState?.canSubmit && feedbackState.template ? (
              <FeedbackForm
                bookingId={booking.id}
                template={feedbackState.template}
              />
            ) : (
              <p className="mt-6 rounded-lg border border-warning/20 bg-warning-soft px-4 py-3 text-sm text-warning">
                Feedback is pending, but no evaluation template is currently
                available. Try again after an administrator configures one.
              </p>
            )
          ) : (
            <p className="mt-6 rounded-lg border border-info/20 bg-info-soft px-4 py-3 text-sm text-info">
              The interview has ended. Your feedback report will appear here
              after the expert submits it.
            </p>
          )
        ) : null}

        {booking.status === "COMPLETED" && feedbackState?.feedback ? (
          <FeedbackReportView
            report={feedbackState.feedback}
            title={asExpert ? "Feedback you submitted" : "Your feedback report"}
          />
        ) : null}

        {booking.status === "COMPLETED" && !asExpert && feedbackState ? (
          feedbackState.canReview ? (
            <ReviewForm bookingId={booking.id} />
          ) : feedbackState.review ? (
            <p className="mt-6 rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-sm text-success">
              You rated this expert {feedbackState.review.rating} out of 5.
              Thank you for sharing your experience.
            </p>
          ) : null
        ) : null}

        {booking.status === "COMPLETED" &&
        asExpert &&
        feedbackState?.feedback?.review ? (
          <p className="mt-6 rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-muted">
            The candidate rated this interview{" "}
            {feedbackState.feedback.review.rating} out of 5.
            {feedbackState.feedback.review.comment
              ? ` "${feedbackState.feedback.review.comment}"`
              : ""}
          </p>
        ) : null}
      </section>

      <section className={`${cardClass} mt-6`}>
        <h2 className="text-lg font-semibold text-foreground">
          Status history
        </h2>
        <ol className="mt-4 space-y-4">
          {booking.history.map((entry) => (
            <li
              key={entry.id}
              className="border-l-2 border-primary-100 pl-4 text-sm"
            >
              <p className="font-medium text-foreground">
                {entry.fromStatus
                  ? `${bookingStatusLabels[entry.fromStatus]} → ${
                      bookingStatusLabels[entry.toStatus]
                    }`
                  : bookingStatusLabels[entry.toStatus]}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {formatBookingDateTime(entry.createdAt, booking.timezone)}
              </p>
              {entry.reason ? (
                <p className="mt-1 text-muted">{entry.reason}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={backHref} className={secondaryButtonClass}>
          {asExpert ? "All booking requests" : "All your bookings"}
        </Link>
        {!asExpert ? (
          <Link
            href={`/experts/${booking.expert.id}`}
            className={secondaryButtonClass}
          >
            View expert profile
          </Link>
        ) : null}
      </div>
    </main>
  );
}
