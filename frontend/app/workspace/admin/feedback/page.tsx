import type { Metadata } from "next";
import Link from "next/link";

import { formatDateTime } from "@/lib/labels";
import { fetchServerApi } from "@/lib/session";
import type { AdminFeedbackResponse } from "@/lib/types";
import { inputClass, secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Feedback quality",
};

export const instant = false;

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const query = new URLSearchParams({ page: String(page), limit: "20" });
  if (q) query.set("q", q);

  const response = await fetchServerApi<AdminFeedbackResponse>(
    `/admin/feedback?${query.toString()}`,
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Feedback quality
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Read-only inspection of expert reports and candidate reviews. No
          moderation state is applied in this sprint.
        </p>
      </div>

      <form
        method="get"
        className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label
            htmlFor="feedback-q"
            className="mb-1 block text-xs font-medium text-muted"
          >
            Search report text, expert, or candidate
          </label>
          <input
            id="feedback-q"
            name="q"
            defaultValue={q}
            className={inputClass}
          />
        </div>
        <button type="submit" className={secondaryButtonClass}>
          Search
        </button>
      </form>

      {!response ? (
        <p
          role="alert"
          className="rounded-xl border border-error/20 bg-error-soft px-4 py-3 text-sm text-error"
        >
          Feedback reports could not be loaded.
        </p>
      ) : response.reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
          No feedback reports match these filters.
        </div>
      ) : (
        <div className="space-y-3">
          {response.reports.map((report) => (
            <section
              key={report.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/workspace/admin/feedback/${report.id}`}
                    className="text-sm font-semibold text-foreground hover:text-primary-700"
                  >
                    {report.expert.name} → {report.candidate.name}
                  </Link>
                  <p className="mt-1 text-xs text-muted">
                    {formatDateTime(report.submittedAt)} ·{" "}
                    {report.booking.durationMinutes} min ·{" "}
                    {report.template.name} v{report.template.version}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-foreground">
                    {report.averageScore?.toFixed(1) ?? "—"}/5
                  </p>
                  {report.review ? (
                    <p className="text-xs text-muted">
                      Candidate review {report.review.rating}/5
                    </p>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-muted">
                {report.overallSummary}
              </p>
            </section>
          ))}
        </div>
      )}

      {response && response.pagination.totalPages > 1 ? (
        <div className="flex justify-between text-sm text-muted">
          <span>
            Page {response.pagination.page} of {response.pagination.totalPages}
          </span>
          <div className="flex gap-2">
            {response.pagination.page > 1 ? (
              <Link
                href={`/workspace/admin/feedback?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  page: String(page - 1),
                }).toString()}`}
                className="rounded-lg border border-border px-3 py-1.5 font-medium text-foreground"
              >
                Previous
              </Link>
            ) : null}
            {response.pagination.page < response.pagination.totalPages ? (
              <Link
                href={`/workspace/admin/feedback?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  page: String(page + 1),
                }).toString()}`}
                className="rounded-lg border border-border px-3 py-1.5 font-medium text-foreground"
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
