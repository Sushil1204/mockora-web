import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatDateTime } from "@/lib/labels";
import { fetchServerApi } from "@/lib/session";
import type { AdminFeedbackDetailResponse } from "@/lib/types";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Feedback report",
};

export const instant = false;

export default async function AdminFeedbackDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const response = await fetchServerApi<AdminFeedbackDetailResponse>(
    `/admin/feedback/${reportId}`,
  );

  if (!response) {
    notFound();
  }

  const report = response.report;

  return (
    <div className="space-y-5">
      <Link
        href="/workspace/admin/feedback"
        className="text-sm font-medium text-primary-700 hover:text-primary-800"
      >
        ← Feedback quality
      </Link>

      <section className={cardClass}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              {report.expert.name} → {report.candidate.name}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {formatDateTime(report.booking.startsAt)} ·{" "}
              {report.booking.durationMinutes} min · {report.template.name} v
              {report.template.version}
            </p>
            <Link
              href={`/workspace/admin/bookings/${report.booking.id}`}
              className="mt-2 inline-block text-sm font-medium text-primary-700 hover:underline"
            >
              Open booking record
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-center">
            <p className="text-2xl font-semibold text-foreground">
              {report.averageScore?.toFixed(1) ?? "—"}
            </p>
            <p className="text-xs text-muted">weighted average / 5</p>
          </div>
        </div>

        <div className="mt-6 space-y-4 border-t border-border pt-5">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Overall summary
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {report.overallSummary}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Strengths
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {report.strengths}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Improvement areas
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {report.improvementAreas}
              </p>
            </div>
          </div>
          {report.recommendations ? (
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Recommendations
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {report.recommendations}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className={cardClass}>
        <h3 className="text-lg font-semibold text-foreground">
          Criterion scores
        </h3>
        <ul className="mt-4 space-y-3">
          {report.scores.map((score) => (
            <li
              key={score.criterionId}
              className="rounded-lg border border-border p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {score.name}
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {score.score}/5
                  <span className="ml-2 text-xs font-normal text-muted">
                    weight {score.weight}
                  </span>
                </p>
              </div>
              {score.evidenceComment ? (
                <p className="mt-1 text-sm text-muted">
                  {score.evidenceComment}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className={cardClass}>
        <h3 className="text-lg font-semibold text-foreground">
          Candidate review of the expert
        </h3>
        {report.review ? (
          <div className="mt-3">
            <p className="text-lg font-semibold text-foreground">
              {report.review.rating}/5
            </p>
            {report.review.comment ? (
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {report.review.comment}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-muted">
              {formatDateTime(report.review.createdAt)}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            The candidate has not reviewed this expert.
          </p>
        )}
      </section>
    </div>
  );
}
