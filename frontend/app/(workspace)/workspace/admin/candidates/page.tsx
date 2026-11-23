import type { Metadata } from "next";
import Link from "next/link";

import { CandidateActions } from "@/components/admin/candidate-actions";
import { accountStatusLabels, accountStatusStyles } from "@/lib/labels";
import { fetchServerApi } from "@/lib/session";
import type { AccountStatus, AdminCandidatesResponse } from "@/lib/types";
import { inputClass, secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Candidates",
};

export const instant = false;

const tabs: Array<{ label: string; value: AccountStatus | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Suspended", value: "SUSPENDED" },
];

function buildHref(input: {
  status: AccountStatus | "ALL";
  q?: string;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (input.status !== "ALL") params.set("status", input.status);
  if (input.q) params.set("q", input.q);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const query = params.toString();
  return query
    ? `/workspace/admin/candidates?${query}`
    : "/workspace/admin/candidates";
}

export default async function AdminCandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = (tabs.find((tab) => tab.value === params.status)?.value ??
    "ALL") as AccountStatus | "ALL";
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const query = new URLSearchParams({
    page: String(page),
    limit: "20",
  });
  if (status !== "ALL") query.set("status", status);
  if (q) query.set("q", q);

  const response = await fetchServerApi<AdminCandidatesResponse>(
    `/admin/candidates?${query.toString()}`,
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-page font-semibold tracking-tight text-foreground">
          Candidates
        </h1>
        <p className="mt-1 text-sm text-muted">
          Search accounts, review activity, and suspend access when needed.
        </p>
      </div>

      <form
        method="get"
        className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-end"
      >
        <input type="hidden" name="status" value={status} />
        <div className="flex-1">
          <label
            htmlFor="candidate-q"
            className="mb-1 block text-xs font-medium text-muted"
          >
            Search by name or email
          </label>
          <input
            id="candidate-q"
            name="q"
            defaultValue={q}
            placeholder="candidate@example.com"
            className={inputClass}
          />
        </div>
        <button type="submit" className={secondaryButtonClass}>
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-1 border-b border-border pb-2">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={buildHref({ status: tab.value, q })}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              status === tab.value
                ? "bg-primary-600 text-white"
                : "text-muted hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {!response ? (
        <p
          role="alert"
          className="rounded-xl border border-error/20 bg-error-soft px-4 py-3 text-sm text-error"
        >
          Candidates could not be loaded. Refresh the page to try again.
        </p>
      ) : response.candidates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-sm font-medium text-foreground">
            No candidates match these filters.
          </p>
          <p className="mt-1 text-sm text-muted">
            Try a different search or account status.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {response.candidates.map((candidate) => (
            <section
              key={candidate.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/workspace/admin/candidates/${candidate.id}`}
                    className="text-sm font-semibold text-foreground hover:text-primary-700"
                  >
                    {candidate.name}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {candidate.email}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {candidate.profile
                      ? [
                          candidate.profile.currentRole,
                          candidate.profile.targetRole
                            ? `targeting ${candidate.profile.targetRole}`
                            : null,
                          candidate.profile.industry,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "Profile not started"}
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
            </section>
          ))}
        </div>
      )}

      {response && response.pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            Page {response.pagination.page} of {response.pagination.totalPages}{" "}
            · {response.pagination.total} candidates
          </span>
          <div className="flex gap-2">
            {response.pagination.page > 1 ? (
              <Link
                href={buildHref({ status, q, page: page - 1 })}
                className="rounded-lg border border-border px-3 py-1.5 font-medium text-foreground hover:bg-surface-muted"
              >
                Previous
              </Link>
            ) : null}
            {response.pagination.page < response.pagination.totalPages ? (
              <Link
                href={buildHref({ status, q, page: page + 1 })}
                className="rounded-lg border border-border px-3 py-1.5 font-medium text-foreground hover:bg-surface-muted"
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
