import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  SearchX,
  ShieldCheck,
} from "lucide-react";

import { ExpertCard } from "@/components/marketplace/expert-card";
import {
  ExpertFiltersForm,
  type ExpertFilterValues,
} from "@/components/marketplace/expert-filters";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { apiRequest } from "@/lib/api";
import type { ExpertFilters, PublicExpertListResponse } from "@/lib/types";

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
      tabIndex={-1}
      className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14"
    >
      <PageHeader
        eyebrow="Expert marketplace"
        title="Find someone who has sat where you want to go."
        description="Browse verified professionals by industry, role, interview type, and language. Browsing is open to everyone; sign in when you are ready to request a session."
        actions={
          <Link
            href="/expert/application"
            className={buttonClasses({ variant: "secondary" })}
          >
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            Become an expert
          </Link>
        }
      />

      {!filters ? (
        <ErrorState
          className="mt-8"
          title="We could not load the marketplace"
          description="Check your connection and refresh the page. No account changes were made."
        />
      ) : (
        <>
          <div className="mt-8">
            <ExpertFiltersForm filters={filters} values={values} />
          </div>

          {!response ? (
            <ErrorState
              className="mt-8"
              title="We could not load experts"
              description="Check your connection and refresh the page. Your filters have been kept."
            />
          ) : (
            <>
              <section aria-labelledby="expert-results" className="mt-10">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2
                    id="expert-results"
                    className="text-lg font-semibold text-foreground"
                  >
                    {response.pagination.total}{" "}
                    {response.pagination.total === 1 ? "expert" : "experts"}
                  </h2>
                  <p className="text-sm text-muted" aria-live="polite">
                    Page {response.pagination.page} of{" "}
                    {Math.max(response.pagination.totalPages, 1)}
                  </p>
                </div>

                {response.experts.length === 0 ? (
                  <EmptyState
                    className="mt-5"
                    icon={<SearchX aria-hidden="true" className="h-5 w-5" />}
                    title="No experts match these filters"
                    description="Try a broader search or clear a filter. New experts are added as they complete verification."
                    action={
                      <Link
                        href="/experts"
                        className={buttonClasses({ variant: "secondary" })}
                      >
                        Clear filters
                      </Link>
                    }
                  />
                ) : (
                  <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {response.experts.map((expert) => (
                      <li key={expert.id} className="h-full">
                        <ExpertCard expert={expert} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {response.pagination.totalPages > 1 ? (
                <nav
                  aria-label="Expert pages"
                  className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6"
                >
                  {response.pagination.page > 1 ? (
                    <Link
                      href={`/experts?${buildQuery(
                        values,
                        response.pagination.page - 1,
                      ).toString()}`}
                      className={buttonClasses({ variant: "secondary" })}
                    >
                      <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                      Previous
                    </Link>
                  ) : (
                    <span />
                  )}
                  <span className="text-sm text-muted">
                    Page {response.pagination.page} of{" "}
                    {response.pagination.totalPages}
                  </span>
                  {response.pagination.page < response.pagination.totalPages ? (
                    <Link
                      href={`/experts?${buildQuery(
                        values,
                        response.pagination.page + 1,
                      ).toString()}`}
                      className={buttonClasses({ variant: "secondary" })}
                    >
                      Next
                      <ChevronRight aria-hidden="true" className="h-4 w-4" />
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
                    className="font-semibold text-primary-700 underline-offset-4 hover:underline"
                  >
                    Clear filters
                  </Link>
                </p>
              ) : null}
            </>
          )}

          <Card className="mt-12 border-primary-200 bg-surface-muted p-6 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-8">
            <div>
              <p className="text-overline font-semibold uppercase text-terracotta-600">
                For professionals
              </p>
              <h2 className="mt-2 text-lg font-semibold text-foreground">
                Are you an experienced professional?
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
                Apply to join the marketplace and interview candidates in your
                area of expertise. Every application is reviewed by the Mockoraa
                team.
              </p>
            </div>
            <Link
              href="/expert/application"
              className={buttonClasses({
                variant: "secondary",
                className: "mt-4 shrink-0 sm:mt-0",
              })}
            >
              Become an expert
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </Card>
        </>
      )}
    </main>
  );
}
