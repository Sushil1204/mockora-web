import type { Metadata } from "next";
import Link from "next/link";

import { ExpertCard } from "@/components/marketplace/expert-card";
import {
  ExpertFiltersForm,
  type ExpertFilterValues,
} from "@/components/marketplace/expert-filters";
import { apiRequest } from "@/lib/api";
import type { ExpertFilters, PublicExpertListResponse } from "@/lib/types";
import { cardClass, primaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Browse experts",
  description:
    "Browse verified industry professionals offering one-to-one mock interviews.",
};

type SearchParams = Record<string, string | string[] | undefined>;

const filterKeys = [
  "industryId",
  "specializationId",
  "interviewTypeId",
  "jobRoleId",
  "levelId",
  "language",
] as const;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function readFilterValues(searchParams: SearchParams): ExpertFilterValues {
  const values: ExpertFilterValues = {};

  const q = single(searchParams.q)?.trim();
  if (q) values.q = q.slice(0, 100);

  for (const key of filterKeys) {
    const value = single(searchParams[key])?.trim();
    if (value) values[key] = value;
  }

  return values;
}

function buildQuery(
  values: ExpertFilterValues,
  page?: number,
): URLSearchParams {
  const query = new URLSearchParams();

  if (values.q) query.set("q", values.q);

  for (const key of filterKeys) {
    const value = values[key];
    if (value) query.set(key, value);
  }

  if (page && page > 1) query.set("page", String(page));

  return query;
}

export default async function ExpertsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const values = readFilterValues(params);
  const page = Math.max(1, Number(single(params.page)) || 1);
  const listQuery = buildQuery(values, page);
  listQuery.set("limit", "12");

  let response: PublicExpertListResponse | null = null;
  let filters: ExpertFilters | null = null;

  try {
    [response, filters] = await Promise.all([
      apiRequest<PublicExpertListResponse>(`/experts?${listQuery.toString()}`, {
        cache: "no-store",
      }),
      apiRequest<ExpertFilters>("/experts/filters", { cache: "no-store" }),
    ]);
  } catch {
    response = null;
  }

  const hasActiveFilters = Boolean(
    values.q || filterKeys.some((key) => values[key]),
  );

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
      tabIndex={-1}
    >
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta-600">
          Browse experts
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Find someone who has sat where you want to go.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
          Every expert on Mockoraa is reviewed and approved before appearing
          here. Browse freely, then sign in when you are ready to request a
          session.
        </p>
      </div>

      {!filters ? (
        <section className={`${cardClass} mt-8`}>
          <h2 className="text-lg font-semibold text-foreground">
            We could not load the marketplace
          </h2>
          <p className="mt-2 text-sm text-muted">
            Check your connection and refresh the page. No account changes were
            made.
          </p>
        </section>
      ) : (
        <>
          <div className="mt-8">
            <ExpertFiltersForm filters={filters} values={values} />
          </div>

          {!response ? (
            <section className={`${cardClass} mt-8`}>
              <h2 className="text-lg font-semibold text-foreground">
                We could not load experts
              </h2>
              <p className="mt-2 text-sm text-muted">
                Check your connection and refresh the page. Your filters have
                been kept.
              </p>
            </section>
          ) : (
            <>
              <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {response.pagination.total}{" "}
                  {response.pagination.total === 1 ? "expert" : "experts"}
                </h2>
                <p className="text-sm text-muted" aria-live="polite">
                  Page {response.pagination.page} of{" "}
                  {Math.max(response.pagination.totalPages, 1)}
                </p>
              </div>

              {response.experts.length === 0 ? (
                <section className={`${cardClass} mt-4 text-center`}>
                  <h3 className="text-lg font-semibold text-foreground">
                    No experts match these filters
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                    Try a broader search or clear a filter. New experts are
                    added as they complete verification.
                  </p>
                  <Link
                    href="/experts"
                    className={`${primaryButtonClass} mt-6`}
                  >
                    Clear filters
                  </Link>
                </section>
              ) : (
                <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {response.experts.map((expert) => (
                    <li key={expert.id} className="h-full">
                      <ExpertCard expert={expert} />
                    </li>
                  ))}
                </ul>
              )}

              {response.pagination.totalPages > 1 ? (
                <nav
                  aria-label="Expert pages"
                  className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6 text-sm"
                >
                  {response.pagination.page > 1 ? (
                    <Link
                      href={`/experts?${buildQuery(
                        values,
                        response.pagination.page - 1,
                      ).toString()}`}
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
                  {response.pagination.page < response.pagination.totalPages ? (
                    <Link
                      href={`/experts?${buildQuery(
                        values,
                        response.pagination.page + 1,
                      ).toString()}`}
                      className="font-medium text-primary-700 hover:underline"
                    >
                      Next
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              ) : null}

              {hasActiveFilters ? (
                <p className="mt-6 text-sm text-muted">
                  Showing filtered results.{" "}
                  <Link
                    href="/experts"
                    className="font-medium text-primary-700 hover:underline"
                  >
                    Clear filters
                  </Link>
                </p>
              ) : null}
            </>
          )}

          <section className="mt-12 rounded-2xl border border-border bg-surface-muted p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Are you an experienced professional?
              </h2>
              <p className="mt-1 text-sm text-muted">
                Apply to join the marketplace and interview candidates in your
                area of expertise.
              </p>
            </div>
            <Link
              href="/expert/application"
              className={`${primaryButtonClass} mt-4 shrink-0 sm:mt-0`}
            >
              Become an expert
            </Link>
          </section>
        </>
      )}
    </main>
  );
}
