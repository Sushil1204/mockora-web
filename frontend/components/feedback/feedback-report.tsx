import type { FeedbackReport } from "@/lib/types";

function formatSubmittedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function FeedbackReportView({
  report,
  title,
}: {
  report: FeedbackReport;
  title: string;
}) {
  return (
    <section className="mt-6 border-t border-border pt-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-xs text-muted">
            {report.template.name} v{report.template.version} · Submitted{" "}
            {formatSubmittedAt(report.submittedAt)}
          </p>
        </div>
        {report.averageScore !== null ? (
          <div className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-2 text-center">
            <p className="text-2xl font-semibold text-primary-700">
              {report.averageScore.toFixed(1)}
            </p>
            <p className="text-xs font-medium text-primary-700">out of 5</p>
          </div>
        ) : null}
      </div>

      <div className="mt-6 border-t border-border pt-6">
        <h3 className="text-sm font-semibold text-foreground">
          Overall summary
        </h3>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
          {report.overallSummary}
        </p>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-foreground">
          Scores by criterion
        </h3>
        <dl className="mt-3 space-y-4">
          {report.criteria.map((criterion) => (
            <div
              key={criterion.criterionId}
              className="rounded-xl border border-border bg-surface-muted p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <dt className="text-sm font-medium text-foreground">
                    {criterion.name}
                  </dt>
                  {criterion.description ? (
                    <p className="mt-1 text-xs text-muted">
                      {criterion.description}
                    </p>
                  ) : null}
                </div>
                <dd className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                  {criterion.score} / 5
                </dd>
              </div>
              {criterion.evidenceComment ? (
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">
                  {criterion.evidenceComment}
                </p>
              ) : null}
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-6 grid gap-6 border-t border-border pt-6 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Strengths</h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
            {report.strengths}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Improvement areas
          </h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
            {report.improvementAreas}
          </p>
        </div>
      </div>

      {report.recommendations ? (
        <div className="mt-6 border-t border-border pt-6">
          <h3 className="text-sm font-semibold text-foreground">
            Recommendations
          </h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
            {report.recommendations}
          </p>
        </div>
      ) : null}
    </section>
  );
}
