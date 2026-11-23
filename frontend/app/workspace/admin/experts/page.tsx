import type { Metadata } from "next";
import Link from "next/link";

import { ExpertReviewActions } from "@/components/admin/expert-review-actions";
import { StatusBadge } from "@/components/status-badge";
import { fetchServerApi } from "@/lib/session";
import type {
  AdminApplicationsResponse,
  VerificationStatus,
} from "@/lib/types";
import { cardClass, secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Expert applications",
};

// Review content depends on the request session.
export const instant = false;

const tabs: Array<{ label: string; value: VerificationStatus | "ALL" }> = [
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Under review", value: "UNDER_REVIEW" },
  { label: "Approved", value: "APPROVED" },
  { label: "Changes requested", value: "REJECTED" },
  { label: "Suspended", value: "SUSPENDED" },
  { label: "All", value: "ALL" },
];

function buildHref(
  status: VerificationStatus | "ALL",
  page: number,
  q = "",
): string {
  const params = new URLSearchParams();
  if (status !== "ALL") params.set("status", status);
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query
    ? `/workspace/admin/experts?${query}`
    : "/workspace/admin/experts";
}

export default async function AdminExpertApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = (tabs.find((tab) => tab.value === params.status)?.value ??
    "SUBMITTED") as VerificationStatus | "ALL";
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const query = new URLSearchParams({ page: String(page), limit: "20" });
  if (status !== "ALL") query.set("status", status);
  if (q) query.set("q", q);

  const response = await fetchServerApi<AdminApplicationsResponse>(
    `/admin/experts/applications?${query.toString()}`,
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta-600">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Expert applications
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Approving an application verifies the expert and publishes their
            profile. Every decision is attributed to your administrator account.
          </p>
        </div>
        <Link href="/workspace/admin" className={secondaryButtonClass}>
          Back to overview
        </Link>
      </div>

      <form
        method="get"
        className="mb-5 flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-end"
      >
        <input type="hidden" name="status" value={status} />
        <div className="flex-1">
          <label
            htmlFor="expert-q"
            className="mb-1 block text-xs font-medium text-muted"
          >
            Search by name, email, or headline
          </label>
          <input
            id="expert-q"
            name="q"
            defaultValue={q}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
        <button type="submit" className={secondaryButtonClass}>
          Search
        </button>
      </form>

      <nav
        aria-label="Application status"
        className="mb-6 flex flex-wrap gap-2"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={buildHref(tab.value, 1, q)}
            aria-current={tab.value === status ? "page" : undefined}
            className={
              tab.value === status
                ? "rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white"
                : "rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            }
          >
            {tab.label}
            {tab.value === status && response
              ? ` (${response.pagination.total})`
              : ""}
          </Link>
        ))}
      </nav>

      {!response ? (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-foreground">
            We could not load applications
          </h2>
          <p className="mt-2 text-sm text-muted">
            Check that the API is running, then refresh this page.
          </p>
        </section>
      ) : response.applications.length === 0 ? (
        <section className={`${cardClass} text-center`}>
          <h2 className="text-lg font-semibold text-foreground">
            Nothing here right now
          </h2>
          <p className="mt-2 text-sm text-muted">
            No expert applications match this status. New submissions appear
            here automatically.
          </p>
        </section>
      ) : (
        <div className="space-y-5">
          {response.applications.map((application) => (
            <article key={application.id} className={cardClass}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {application.user.name}
                  </h2>
                  <p className="mt-0.5 break-all text-sm text-muted">
                    {application.user.email}
                  </p>
                </div>
                <StatusBadge status={application.verificationStatus} />
              </div>

              {application.professionalHeadline ? (
                <p className="mt-3 text-sm font-medium text-foreground">
                  {application.professionalHeadline}
                </p>
              ) : null}

              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">
                    Current role
                  </dt>
                  <dd className="mt-1 text-foreground">
                    {application.currentDesignation ?? "Not provided"}
                    {application.currentCompany
                      ? ` at ${application.currentCompany}`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">
                    Experience
                  </dt>
                  <dd className="mt-1 text-foreground">
                    {application.yearsExperience ?? "Not provided"} years
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">
                    Location
                  </dt>
                  <dd className="mt-1 text-foreground">
                    {application.countryCode ?? "Not provided"} ·{" "}
                    {application.timezone ?? "No timezone"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">
                    Languages
                  </dt>
                  <dd className="mt-1 text-foreground">
                    {application.languages.join(", ") || "None listed"}
                  </dd>
                </div>
              </dl>

              {application.linkedinUrl ? (
                <p className="mt-4 text-sm">
                  <a
                    href={application.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary-700 hover:underline"
                  >
                    View LinkedIn profile
                  </a>
                </p>
              ) : null}

              {application.introduction ? (
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">
                  {application.introduction}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {application.industries.map((industry) => (
                  <span
                    key={industry.id}
                    className="rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700"
                  >
                    {industry.name}
                  </span>
                ))}
                {application.interviewTypes.map((type) => (
                  <span
                    key={type.id}
                    className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted"
                  >
                    {type.name}
                  </span>
                ))}
              </div>

              <div className="mt-4 grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">
                    Experience history
                  </p>
                  <ul className="mt-2 space-y-2">
                    {application.experiences.map((experience) => (
                      <li key={experience.id ?? experience.company}>
                        <p className="font-medium text-foreground">
                          {experience.designation} · {experience.company}
                        </p>
                        <p className="text-xs text-muted">
                          {experience.startDate} to{" "}
                          {experience.endDate ?? "present"}
                        </p>
                      </li>
                    ))}
                    {application.experiences.length === 0 ? (
                      <li className="text-muted">No experience listed.</li>
                    ) : null}
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">
                    Capabilities
                  </p>
                  <p className="mt-2 text-foreground">
                    {application.specializations
                      .map((item) => item.name)
                      .join(", ") || "No specializations listed"}
                  </p>
                  <p className="mt-1 text-muted">
                    {application.candidateLevels
                      .map((level) => level.name)
                      .join(", ") || "No candidate levels listed"}
                  </p>
                </div>
              </div>

              {application.reviewNotes ? (
                <div className="mt-4 rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Latest review note
                  </p>
                  <p className="mt-1 text-foreground">
                    {application.reviewNotes}
                  </p>
                </div>
              ) : null}

              <ExpertReviewActions
                applicationId={application.id}
                status={application.verificationStatus}
              />
            </article>
          ))}

          {response.pagination.totalPages > 1 ? (
            <nav
              aria-label="Application pages"
              className="flex items-center justify-between gap-3 pt-2 text-sm"
            >
              {page > 1 ? (
                <Link
                  href={buildHref(status, page - 1, q)}
                  className="font-medium text-primary-700 hover:underline"
                >
                  Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-muted">
                Page {response.pagination.page} of{" "}
                {response.pagination.totalPages}
              </span>
              {page < response.pagination.totalPages ? (
                <Link
                  href={buildHref(status, page + 1, q)}
                  className="font-medium text-primary-700 hover:underline"
                >
                  Next
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </div>
      )}
    </div>
  );
}
