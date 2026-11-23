import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookingCancelForm } from "@/components/admin/booking-cancel-form";
import {
  bookingStatusLabels,
  bookingStatusStyles,
  formatDateTime,
  formatMoney,
  paymentStatusLabels,
  paymentStatusStyles,
  payoutStatusLabels,
  payoutStatusStyles,
} from "@/lib/labels";
import { fetchServerApi } from "@/lib/session";
import type { AdminBookingResponse } from "@/lib/types";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Booking detail",
};

export const instant = false;

const cancellable = new Set([
  "PENDING_EXPERT_APPROVAL",
  "APPROVED_PENDING_PAYMENT",
  "CONFIRMED",
]);

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const response = await fetchServerApi<AdminBookingResponse>(
    `/admin/bookings/${bookingId}`,
  );

  if (!response) {
    notFound();
  }

  const booking = response.booking;
  const successfulPayment = booking.payments.find(
    (payment) => payment.status === "SUCCEEDED",
  );
  const refunded = booking.refunds.reduce(
    (sum, refund) => sum + refund.amount,
    0,
  );
  const maxRefund = Math.max(0, (successfulPayment?.amount ?? 0) - refunded);
  const currency = successfulPayment?.currency ?? booking.currency ?? "INR";

  return (
    <div className="space-y-5">
      <Link
        href="/workspace/admin/bookings"
        className="text-sm font-medium text-primary-700 hover:text-primary-800"
      >
        ← All bookings
      </Link>

      <section className={cardClass}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-foreground">
                Booking {booking.id.slice(0, 8)}
              </h2>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${bookingStatusStyles[booking.status]}`}
              >
                {bookingStatusLabels[booking.status]}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">
              {formatDateTime(booking.startsAt)} · {booking.durationMinutes} min
              · {booking.timezone}
            </p>
            <p className="mt-1 text-sm text-muted">
              {booking.candidate.name} ({booking.candidate.email}) with{" "}
              {booking.expert.name} ({booking.expert.email})
            </p>
          </div>
          <Link
            href={`/workspace/admin/candidates/${booking.candidate.id}`}
            className="text-sm font-medium text-primary-700 hover:underline"
          >
            Candidate profile
          </Link>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">Candidate price</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {booking.priceAmount !== null && booking.currency
                ? formatMoney(booking.priceAmount, booking.currency)
                : "Not snapshotted"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Expert payout</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {booking.expertPayoutAmount !== null && booking.currency
                ? formatMoney(booking.expertPayoutAmount, booking.currency)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Platform share</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {booking.platformAmount !== null && booking.currency
                ? formatMoney(booking.platformAmount, booking.currency)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Manual refunds</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {formatMoney(refunded, currency)}
            </dd>
          </div>
        </dl>

        {cancellable.has(booking.status) ? (
          <BookingCancelForm
            bookingId={booking.id}
            maxRefund={maxRefund}
            currency={currency}
          />
        ) : null}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className={cardClass}>
          <h3 className="text-lg font-semibold text-foreground">Payments</h3>
          {booking.payments.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No payment attempts.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {booking.payments.map((payment) => (
                <li
                  key={payment.id}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${paymentStatusStyles[payment.status]}`}
                    >
                      {paymentStatusLabels[payment.status]}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {payment.amount !== null && payment.currency
                        ? formatMoney(payment.amount, payment.currency)
                        : "No amount"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {payment.provider} ·{" "}
                    {formatDateTime(payment.paidAt ?? payment.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={cardClass}>
          <h3 className="text-lg font-semibold text-foreground">
            Refund records
          </h3>
          {booking.refunds.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              No manual refunds recorded.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {booking.refunds.map((refund) => (
                <li
                  key={refund.id}
                  className="rounded-lg border border-border p-3"
                >
                  <p className="text-sm font-medium text-foreground">
                    {formatMoney(refund.amount, refund.currency)}
                  </p>
                  <p className="mt-1 text-xs text-muted">{refund.reason}</p>
                </li>
              ))}
            </ul>
          )}

          {booking.payout ? (
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Expert payout
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {formatMoney(booking.payout.amount, booking.payout.currency)}
                </p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium ${payoutStatusStyles[booking.payout.status]}`}
                >
                  {payoutStatusLabels[booking.payout.status]}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className={cardClass}>
        <h3 className="text-lg font-semibold text-foreground">
          Status history
        </h3>
        <ol className="mt-4 space-y-3">
          {booking.history.map((entry) => (
            <li
              key={entry.id}
              className="border-l-2 border-border pl-4 text-sm"
            >
              <p className="font-medium text-foreground">
                {entry.fromStatus
                  ? `${bookingStatusLabels[entry.fromStatus]} → `
                  : ""}
                {bookingStatusLabels[entry.toStatus]}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {formatDateTime(entry.createdAt)}
                {entry.changedBy ? ` · ${entry.changedBy.name}` : ""}
              </p>
              {entry.reason ? (
                <p className="mt-1 text-xs text-muted">{entry.reason}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      {booking.feedback ? (
        <section className={cardClass}>
          <h3 className="text-lg font-semibold text-foreground">
            Feedback report
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {booking.feedback.overallSummary}
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {booking.feedback.scores.map((score) => (
              <div
                key={score.name}
                className="rounded-lg border border-border px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-sm text-foreground">{score.name}</dt>
                  <dd className="text-sm font-semibold text-foreground">
                    {score.score}/5
                  </dd>
                </div>
                {score.evidenceComment ? (
                  <p className="mt-1 text-xs text-muted">
                    {score.evidenceComment}
                  </p>
                ) : null}
              </div>
            ))}
          </dl>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Strengths
              </p>
              <p className="mt-1 text-muted">{booking.feedback.strengths}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Improvement areas
              </p>
              <p className="mt-1 text-muted">
                {booking.feedback.improvementAreas}
              </p>
            </div>
          </div>
          {booking.review ? (
            <p className="mt-4 border-t border-border pt-3 text-sm text-muted">
              Candidate review: {booking.review.rating}/5
              {booking.review.comment ? ` — ${booking.review.comment}` : ""}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
