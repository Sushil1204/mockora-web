import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  CreditCard,
  Globe2,
  Timer,
  UserRound,
} from "lucide-react";

import { BookingActions } from "@/components/bookings/booking-actions";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { MockPaymentPanel } from "@/components/bookings/mock-payment-panel";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { FeedbackReportView } from "@/components/feedback/feedback-report";
import { ReviewForm } from "@/components/feedback/review-form";
import { InterviewEntry } from "@/components/interviews/interview-entry";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { SectionHeader } from "@/components/ui/page-header";
import {
  bookingStatusLabels,
  formatBookingDateTime,
  formatMoney,
} from "@/lib/labels";
import { fetchServerApi, getCurrentUser } from "@/lib/session";
import type {
  BookingResponse,
  FeedbackStateResponse,
  InterviewStateResponse,
} from "@/lib/types";

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
    <main
      id="main-content"
      className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12"
      tabIndex={-1}
    >
      <Link
        href={backHref}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Back to {asExpert ? "booking requests" : "your bookings"}
      </Link>

      {created === "1" ? (
        <Alert variant="success" className="mt-6">
          Your request has been sent. The expert has up to two hours to respond.
          This booking is not confirmed yet.
        </Alert>
      ) : null}

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-border bg-primary-50/60 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={counterpart.name} size="lg" />
              <div className="min-w-0">
                <p className="text-overline font-semibold uppercase text-muted">
                  {asExpert ? "Request from" : "Request with"}
                </p>
                <h1 className="mt-1 truncate text-page font-semibold tracking-tight text-foreground">
                  {counterpart.name}
                </h1>
              </div>
            </div>
            <BookingStatusBadge status={booking.status} />
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-5 text-sm sm:grid-cols-2">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
              <CalendarDays
                aria-hidden="true"
                className="row-span-2 mt-0.5 h-4 w-4 shrink-0 text-primary-600"
              />
              <dt className="text-muted">Interview time</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {formatBookingDateTime(booking.startsAt, booking.timezone)}
              </dd>
            </div>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
              <Clock3
                aria-hidden="true"
                className="row-span-2 mt-0.5 h-4 w-4 shrink-0 text-primary-600"
              />
              <dt className="text-muted">Duration</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {booking.durationMinutes} minutes
              </dd>
            </div>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
              <Globe2
                aria-hidden="true"
                className="row-span-2 mt-0.5 h-4 w-4 shrink-0 text-primary-600"
              />
              <dt className="text-muted">Timezone</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {booking.timezone}
              </dd>
            </div>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
              <CreditCard
                aria-hidden="true"
                className="row-span-2 mt-0.5 h-4 w-4 shrink-0 text-primary-600"
              />
              <dt className="text-muted">
                {asExpert ? "Expert payout" : "Session price"}
              </dt>
              <dd className="mt-0.5 font-medium text-foreground">
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
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
              <Timer
                aria-hidden="true"
                className="row-span-2 mt-0.5 h-4 w-4 shrink-0 text-primary-600"
              />
              <dt className="text-muted">Requested</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {formatBookingDateTime(booking.createdAt, booking.timezone)}
              </dd>
            </div>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
              <UserRound
                aria-hidden="true"
                className="row-span-2 mt-0.5 h-4 w-4 shrink-0 text-primary-600"
              />
              <dt className="text-muted">
                {asExpert ? "Candidate" : "Expert"}
              </dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {counterpart.name}
              </dd>
            </div>
          </dl>

          {booking.status === "PENDING_EXPERT_APPROVAL" ? (
            <Alert variant="warning" className="mt-6">
              Waiting for the expert to respond by{" "}
              {formatBookingDateTime(
                booking.expertResponseDeadline,
                booking.timezone,
              )}
              .
            </Alert>
          ) : null}

          {booking.status === "APPROVED_PENDING_PAYMENT" &&
          booking.paymentDeadline ? (
            <Alert variant="info" className="mt-6">
              <p>
                Approved. Payment is required by{" "}
                {formatBookingDateTime(
                  booking.paymentDeadline,
                  booking.timezone,
                )}
                .
              </p>
              <p className="mt-1 text-xs">
                {asExpert
                  ? "The candidate has one hour from approval to complete payment."
                  : "Complete the mock payment below before the deadline. This booking is not confirmed until payment succeeds."}
              </p>
            </Alert>
          ) : null}

          {booking.status === "APPROVED_PENDING_PAYMENT" && !asExpert ? (
            <MockPaymentPanel bookingId={booking.id} />
          ) : null}

          {booking.status === "CONFIRMED" ? (
            <Alert variant="success" className="mt-6">
              {asExpert
                ? "This booking is confirmed and the interview slot is secured."
                : "Mock payment successful. Your booking is confirmed and no real payment was collected."}
              {booking.confirmedAt
                ? ` Confirmed ${formatBookingDateTime(
                    booking.confirmedAt,
                    booking.timezone,
                  )}.`
                : ""}
            </Alert>
          ) : null}

          {booking.status === "IN_PROGRESS" ? (
            <Alert variant="info" className="mt-6">
              This interview is in progress. Rejoin here if you lose your
              connection before the join window closes.
            </Alert>
          ) : null}

          {booking.status === "CONFIRMED" ||
          booking.status === "IN_PROGRESS" ? (
            <InterviewEntry
              bookingId={booking.id}
              interview={interview?.interview ?? null}
            />
          ) : null}

          {booking.status === "EXPIRED" ? (
            <Alert variant="warning" className="mt-6">
              Booking expired. The time limit to complete this step has passed.
              Please book another session.
            </Alert>
          ) : null}

          {booking.status === "DECLINED" ? (
            <Alert variant="danger" className="mt-6">
              {booking.history.at(-1)?.reason ??
                "The expert declined this booking request."}
            </Alert>
          ) : null}

          {booking.status === "PENDING_EXPERT_APPROVAL" && !asExpert ? (
            <p className="mt-4 text-xs leading-relaxed text-muted">
              You will see the expert&apos;s response here. The slot is held
              while the request is waiting.
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
                <Alert variant="warning" className="mt-6">
                  Feedback is pending, but no evaluation template is currently
                  available. Try again after an administrator configures one.
                </Alert>
              )
            ) : (
              <Alert variant="info" className="mt-6">
                The interview has ended. Your feedback report will appear here
                after the expert submits it.
              </Alert>
            )
          ) : null}

          {booking.status === "COMPLETED" && feedbackState?.feedback ? (
            <FeedbackReportView
              report={feedbackState.feedback}
              title={
                asExpert ? "Feedback you submitted" : "Your feedback report"
              }
            />
          ) : null}

          {booking.status === "COMPLETED" && !asExpert && feedbackState ? (
            feedbackState.canReview ? (
              <ReviewForm bookingId={booking.id} />
            ) : feedbackState.review ? (
              <Alert variant="success" className="mt-6">
                You rated this expert {feedbackState.review.rating} out of 5.
                Thank you for sharing your experience.
              </Alert>
            ) : null
          ) : null}

          {booking.status === "COMPLETED" &&
          asExpert &&
          feedbackState?.feedback?.review ? (
            <Alert variant="info" className="mt-6">
              The candidate rated this interview{" "}
              {feedbackState.feedback.review.rating} out of 5.
              {feedbackState.feedback.review.comment
                ? ` "${feedbackState.feedback.review.comment}"`
                : ""}
            </Alert>
          ) : null}
        </div>
      </Card>

      <Card className="mt-6 p-5 sm:p-6">
        <SectionHeader
          title="Status history"
          description="Every change to this booking, from the original request to the current state."
        />
        <ol className="mt-5">
          {booking.history.map((entry, index) => (
            <li key={entry.id} className="relative flex gap-4 pb-5 last:pb-0">
              <span
                aria-hidden="true"
                className="relative flex w-4 shrink-0 justify-center"
              >
                <span className="absolute bottom-0 top-3 w-px bg-border" />
                <span className="relative mt-1 h-2.5 w-2.5 rounded-full border-2 border-primary-200 bg-primary-500" />
              </span>
              <div className="min-w-0 pb-1 text-sm">
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
              </div>
              <span className="sr-only">
                {index === 0 ? "Latest status" : "Earlier status"}
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={backHref}
          className={buttonClasses({ variant: "secondary" })}
        >
          {asExpert ? "All booking requests" : "All your bookings"}
        </Link>
        {!asExpert ? (
          <Link
            href={`/experts/${booking.expert.id}`}
            className={buttonClasses({ variant: "secondary" })}
          >
            View expert profile
          </Link>
        ) : null}
      </div>
    </main>
  );
}
