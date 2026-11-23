import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CandidateActions } from "@/components/admin/candidate-actions";
import {
  accountStatusLabels,
  accountStatusStyles,
  bookingStatusLabels,
  careerStageLabels,
  formatDateTime,
  formatMoney,
} from "@/lib/labels";
import { fetchServerApi } from "@/lib/session";
import type { AdminCandidateResponse } from "@/lib/types";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Candidate detail",
};

export const instant = false;

export default async function AdminCandidateDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const response = await fetchServerApi<AdminCandidateResponse>(
    `/admin/candidates/${userId}`,
  );

  if (!response) {
    notFound();
  }

  const candidate = response.candidate;

  return (
    <div className="space-y-5">
      <Link
        href="/workspace/admin/candidates"
        className="text-sm font-medium text-primary-700 hover:text-primary-800"
      >
        ← All candidates
      </Link>

      <section className={cardClass}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              {candidate.name}
            </h2>
            <p className="mt-1 text-sm text-muted">{candidate.email}</p>
            <p className="mt-2 text-xs text-muted">
              Joined {formatDateTime(candidate.createdAt)}
              {candidate.countryCode ? ` · ${candidate.countryCode}` : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${accountStatusStyles[candidate.accountStatus]}`}
            >
              {accountStatusLabels[candidate.accountStatus]}
            </span>
            <CandidateActions
              userId={candidate.id}
              name={candidate.name}
              accountStatus={candidate.accountStatus}
            />
          </div>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">Career stage</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {candidate.profile?.careerStage
                ? careerStageLabels[candidate.profile.careerStage]
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Current role</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {candidate.profile?.currentRole ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Target role</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {candidate.profile?.targetRole ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Profile state</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {candidate.profile?.completionState ?? "Not started"}
            </dd>
          </div>
        </dl>
      </section>

      <section className={cardClass}>
        <h3 className="text-lg font-semibold text-foreground">
          Recent bookings
        </h3>
        {!candidate.recentBookings || candidate.recentBookings.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No bookings yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {candidate.recentBookings.map((booking) => (
              <li
                key={booking.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <Link
                    href={`/workspace/admin/bookings/${booking.id}`}
                    className="text-sm font-medium text-foreground hover:text-primary-700"
                  >
                    {booking.expertName}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDateTime(booking.startsAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {bookingStatusLabels[booking.status]}
                  </p>
                  <p className="text-xs text-muted">
                    {booking.priceAmount !== null && booking.currency
                      ? formatMoney(booking.priceAmount, booking.currency)
                      : "Unpriced"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cardClass}>
        <h3 className="text-lg font-semibold text-foreground">
          Recent reviews
        </h3>
        {!candidate.recentReviews || candidate.recentReviews.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No reviews submitted.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {candidate.recentReviews.map((review) => (
              <li key={review.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {review.expertName}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {review.rating}/5
                  </p>
                </div>
                {review.comment ? (
                  <p className="mt-1 text-sm text-muted">{review.comment}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
