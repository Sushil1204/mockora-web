import type { Metadata } from "next";
import Link from "next/link";

import { PayoutMarkPaid } from "@/components/admin/payout-mark-paid";
import {
  formatDateTime,
  formatMoney,
  payoutStatusLabels,
  payoutStatusStyles,
} from "@/lib/labels";
import { fetchServerApi } from "@/lib/session";
import type { AdminPayoutStatus, AdminPayoutsResponse } from "@/lib/types";
import { inputClass, secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Payouts",
};

export const instant = false;

const statuses: AdminPayoutStatus[] = [
  "ELIGIBLE",
  "PENDING",
  "PAID",
  "PROCESSING",
  "FAILED",
  "REVERSED",
];

function buildHref(input: { status?: string; q?: string; page?: number }) {
  const params = new URLSearchParams();
  if (input.status) params.set("status", input.status);
  if (input.q) params.set("q", input.q);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const query = params.toString();
  return query
    ? `/workspace/admin/payouts?${query}`
    : "/workspace/admin/payouts";
}

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = statuses.includes(params.status as AdminPayoutStatus)
    ? (params.status as AdminPayoutStatus)
    : undefined;
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const query = new URLSearchParams({ page: String(page), limit: "20" });
  if (status) query.set("status", status);
  if (q) query.set("q", q);

  const response = await fetchServerApi<AdminPayoutsResponse>(
    `/admin/payouts?${query.toString()}`,
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-page font-semibold tracking-tight text-foreground">
          Expert payout ledger
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Entries become eligible when a completed booking has its feedback
          report. Marking paid records an offline transfer; Mockoraa does not
          process real payouts.
        </p>
      </div>

      <form
        method="get"
        className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-end"
      >
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <div className="flex-1">
          <label
            htmlFor="payout-q"
            className="mb-1 block text-xs font-medium text-muted"
          >
            Search expert or candidate
          </label>
          <input
            id="payout-q"
            name="q"
            defaultValue={q}
            className={inputClass}
          />
        </div>
        <button type="submit" className={secondaryButtonClass}>
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-1 border-b border-border pb-2">
        <Link
          href={buildHref({ q })}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            !status
              ? "bg-primary-600 text-white"
              : "text-muted hover:bg-surface-muted hover:text-foreground"
          }`}
        >
          All
        </Link>
        {statuses.map((value) => (
          <Link
            key={value}
            href={buildHref({ status: value, q })}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              status === value
                ? "bg-primary-600 text-white"
                : "text-muted hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            {payoutStatusLabels[value]}
          </Link>
        ))}
      </div>

      {!response ? (
        <p
          role="alert"
          className="rounded-xl border border-error/20 bg-error-soft px-4 py-3 text-sm text-error"
        >
          Payout entries could not be loaded.
        </p>
      ) : response.payouts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
          No payout entries match these filters. Entries appear automatically
          when a priced booking is completed with feedback.
        </div>
      ) : (
        <div className="space-y-3">
          {response.payouts.map((payout) => (
            <section
              key={payout.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {payout.expert.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {payout.expert.email}
                  </p>
                  <Link
                    href={`/workspace/admin/bookings/${payout.booking.id}`}
                    className="mt-1 inline-block text-xs font-medium text-primary-700 hover:underline"
                  >
                    Booking {payout.booking.id.slice(0, 8)} ·{" "}
                    {payout.booking.candidateName}
                  </Link>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-foreground">
                    {formatMoney(payout.amount, payout.currency)}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${payoutStatusStyles[payout.status]}`}
                  >
                    {payoutStatusLabels[payout.status]}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-xs text-muted">
                Created {formatDateTime(payout.createdAt)}
                {payout.eligibleAt
                  ? ` · eligible ${formatDateTime(payout.eligibleAt)}`
                  : ""}
                {payout.paidAt
                  ? ` · paid ${formatDateTime(payout.paidAt)}`
                  : ""}
                {payout.paidBy ? ` by ${payout.paidBy.name}` : ""}
              </p>

              {payout.status === "ELIGIBLE" ? (
                <PayoutMarkPaid
                  payoutId={payout.id}
                  amountLabel={formatMoney(payout.amount, payout.currency)}
                />
              ) : null}
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
                href={buildHref({ status, q, page: page - 1 })}
                className="rounded-lg border border-border px-3 py-1.5 font-medium text-foreground"
              >
                Previous
              </Link>
            ) : null}
            {response.pagination.page < response.pagination.totalPages ? (
              <Link
                href={buildHref({ status, q, page: page + 1 })}
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
