import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  CreditCard,
  Globe2,
  Timer,
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
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12"
      tabIndex={-1}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to {asExpert ? "booking requests" : "your bookings"}
        </Link>
        <BookingStatusBadge status={booking.status} />
      </div>

      {created === "1" ? (
        <Alert variant="success" className="mt-5">
          Your request has been sent. The expert has up to two hours to respond.
          This booking is not confirmed yet.
        </Alert>
      ) : null}

      <section className="mt-4 overflow-hidden rounded-panel border border-border bg-surface shadow-card">
        <div className="relative overflow-hidden bg-primary-900 px-5 py-7 text-white sm:px-8 sm:py-9">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/10 bg-white/5"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-28 right-20 h-52 w-52 rounded-full bg-terracotta-500/10 blur-2xl"
          />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-overline font-semibold uppercase text-terracotta-300">
                {asExpert ? "Incoming request" : "Interview request"}
              </p>
              <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Session with{" "}
                <span className="text-primary-100">{counterpart.name}</span>
              </h1>
              <p className="mt-4 flex items-start gap-2 text-sm font-medium text-white">
                <CalendarDays
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary-300"
                />
                {formatBookingDateTime(booking.startsAt, booking.timezone)}
              </p>
              <p className="mt-1.5 flex items-start gap-2 text-sm text-primary-100">
                <Clock3
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary-300"
                />
                {booking.durationMinutes} minutes · {booking.timezone}
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-panel border border-white/15 bg-white/5 p-3 pr-4">
              <Avatar
                name={counterpart.name}
                size="lg"
                className="border-2 border-white/20"
              />
              <div className="min-w-0">
                <p className="text-overline font-semibold uppercase text-primary-200">
                  {asExpert ? "Candidate" : "Expert"}
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-white">
                  {counterpart.name}
                </p>
              </div>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
          <Fact
            icon={<Clock3 aria-hidden="true" className="h-4 w-4" />}
            label="Duration"
            value={`${booking.durationMinutes} minutes`}
          />
          <Fact
            icon={<Globe2 aria-hidden="true" className="h-4 w-4" />}
            label="Timezone"
            value={booking.timezone}
          />
          <Fact
            icon={<Timer aria-hidden="true" className="h-4 w-4" />}
            label="Requested"
            value={formatBookingDateTime(booking.createdAt, booking.timezone)}
          />
          <Fact
            icon={<CreditCard aria-hidden="true" className="h-4 w-4" />}
            label={asExpert ? "Expert payout" : "Session price"}
            value={
              booking.priceAmount !== null && booking.currency
                ? formatMoney(
                    asExpert
                      ? (booking.expertPayoutAmount ?? 0)
                      : booking.priceAmount,
                    booking.currency,
                  )
                : "Not configured"
            }
          />
        </dl>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-4">
          {booking.status === "PENDING_EXPERT_APPROVAL" ? (
            <Alert variant="warning">
              {asExpert
                ? `This request is waiting for your response by ${formatBookingDateTime(
                    booking.expertResponseDeadline,
                    booking.timezone,
                  )}.`
                : `Waiting for the expert to respond by ${formatBookingDateTime(
                    booking.expertResponseDeadline,
                    booking.timezone,
                  )}.`}
            </Alert>
          ) : null}

          {booking.status === "APPROVED_PENDING_PAYMENT" &&
          booking.paymentDeadline ? (
            <Alert variant="info">
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
            <Alert variant="success">
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
            <Alert variant="info">
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
            <Alert variant="warning">
              Booking expired. The time limit to complete this step has passed.
              Please book another session.
            </Alert>
          ) : null}

          {booking.status === "DECLINED" ? (
            <Alert variant="danger">
              {booking.history.at(-1)?.reason ??
                "The expert declined this booking request."}
            </Alert>
          ) : null}

          {booking.status === "PENDING_EXPERT_APPROVAL" && !asExpert ? (
            <p className="px-1 text-xs leading-relaxed text-muted">
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
                <Alert variant="warning">
                  Feedback is pending, but no evaluation template is currently
                  available. Try again after an administrator configures one.
                </Alert>
              )
            ) : (
              <Alert variant="info">
                The interview has ended. Your feedback report will appear here
                after the expert submits it.
              </Alert>
            )
          ) : null}

          {booking.status === "COMPLETED" && feedbackState?.feedback ? (
            <Card className="p-5 sm:p-6">
              <FeedbackReportView
                report={feedbackState.feedback}
                title={
                  asExpert ? "Feedback you submitted" : "Your feedback report"
                }
              />
            </Card>
          ) : null}

          {booking.status === "COMPLETED" && !asExpert && feedbackState ? (
            feedbackState.canReview ? (
              <ReviewForm bookingId={booking.id} />
            ) : feedbackState.review ? (
              <Alert variant="success">
                You rated this expert {feedbackState.review.rating} out of 5.
                Thank you for sharing your experience.
              </Alert>
            ) : null
          ) : null}

          {booking.status === "COMPLETED" &&
          asExpert &&
          feedbackState?.feedback?.review ? (
            <Alert variant="info">
              The candidate rated this interview{" "}
              {feedbackState.feedback.review.rating} out of 5.
              {feedbackState.feedback.review.comment
                ? ` "${feedbackState.feedback.review.comment}"`
                : ""}
            </Alert>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden">
            <div className="border-b border-border bg-surface-muted/60 px-5 py-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Status history
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Every change to this booking, from request to current state.
              </p>
            </div>
            <ol className="px-5 py-5">
              {booking.history.map((entry, index) => (
                <li
                  key={entry.id}
                  className="relative flex gap-3 pb-5 last:pb-0"
                >
                  <span
                    aria-hidden="true"
                    className="relative flex w-3 shrink-0 justify-center"
                  >
                    <span className="absolute bottom-0 top-3 w-px bg-border" />
                    <span className="relative mt-1 h-2.5 w-2.5 rounded-full border-2 border-primary-200 bg-primary-500" />
                  </span>
                  <div className="min-w-0 pb-1 text-sm">
                    <p className="font-medium leading-snug text-foreground">
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
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        {entry.reason}
                      </p>
                    ) : null}
                  </div>
                  <span className="sr-only">
                    {index === 0 ? "Latest status" : "Earlier status"}
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Booking reference
            </h2>
            <p className="mt-2 break-all rounded-control border border-border bg-surface-muted px-3 py-2 font-mono text-xs text-muted">
              {booking.id}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Share this reference if you contact support about this session.
            </p>
          </Card>
        </aside>
      </div>

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

function Fact({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-surface px-4 py-4 sm:px-5">
      <dt className="flex items-center gap-2 text-xs font-medium text-muted">
        <span className="text-primary-600">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1.5 pl-6 text-sm font-semibold text-foreground">
        {value}
      </dd>
    </div>
  );
}
