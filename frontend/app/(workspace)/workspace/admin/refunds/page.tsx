import type { Metadata } from "next";
import Link from "next/link";

import { formatDateTime, formatMoney } from "@/lib/labels";
import { fetchServerApi } from "@/lib/session";
import type { AdminRefundsResponse } from "@/lib/types";
import { inputClass, secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Refunds",
};

export const instant = false;

export default async function AdminRefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const query = new URLSearchParams({ page: String(page), limit: "20" });
  if (q) query.set("q", q);

  const response = await fetchServerApi<AdminRefundsResponse>(
    `/admin/refunds?${query.toString()}`,
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-page font-semibold tracking-tight text-foreground">
          Refund records
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Manual refunds recorded by administrators after a cancellation. These
          entries document an offline refund; Mockoraa does not move money.
        </p>
      </div>

      <form
        method="get"
        className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label
            htmlFor="refund-q"
            className="mb-1 block text-xs font-medium text-muted"
          >
            Search reason, candidate, or expert
          </label>
          <input
            id="refund-q"
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
          Refund records could not be loaded.
        </p>
      ) : response.refunds.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-sm font-medium text-foreground">
            No refund records yet.
          </p>
          <p className="mt-1 text-sm text-muted">
            Record a refund while cancelling a booking.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {response.refunds.map((refund) => (
            <section
              key={refund.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/workspace/admin/bookings/${refund.booking.id}`}
                    className="text-sm font-semibold text-foreground hover:text-primary-700"
                  >
                    {refund.booking.candidate.name} with{" "}
                    {refund.booking.expert.name}
                  </Link>
                  <p className="mt-1 text-xs text-muted">
                    {formatDateTime(refund.createdAt)} · recorded by{" "}
                    {refund.recordedBy.name}
                  </p>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {formatMoney(refund.amount, refund.currency)}
                </p>
              </div>
              <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-sm text-muted">
                {refund.reason}
              </p>
              {refund.payment ? (
                <p className="mt-2 text-xs text-muted">
                  Payment {refund.payment.id.slice(0, 8)} ·{" "}
                  {refund.payment.status}
                </p>
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
                href={`/workspace/admin/refunds?${new URLSearchParams({
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
                href={`/workspace/admin/refunds?${new URLSearchParams({
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
