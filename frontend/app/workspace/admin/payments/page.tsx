import type { Metadata } from "next";
import Link from "next/link";

import {
  formatDateTime,
  formatMoney,
  paymentStatusLabels,
  paymentStatusStyles,
} from "@/lib/labels";
import { fetchServerApi } from "@/lib/session";
import type { AdminPaymentsResponse, PaymentStatus } from "@/lib/types";
import { secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Payments",
};

export const instant = false;

const statuses: PaymentStatus[] = [
  "SUCCEEDED",
  "PENDING",
  "FAILED",
  "CANCELLED",
  "REFUND_PENDING",
  "REFUNDED",
  "CREATED",
];

function buildHref(input: { status?: string; q?: string; page?: number }) {
  const params = new URLSearchParams();
  if (input.status) params.set("status", input.status);
  if (input.q) params.set("q", input.q);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const query = params.toString();
  return query
    ? `/workspace/admin/payments?${query}`
    : "/workspace/admin/payments";
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = statuses.includes(params.status as PaymentStatus)
    ? (params.status as PaymentStatus)
    : undefined;
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const query = new URLSearchParams({ page: String(page), limit: "20" });
  if (status) query.set("status", status);
  if (q) query.set("q", q);

  const response = await fetchServerApi<AdminPaymentsResponse>(
    `/admin/payments?${query.toString()}`,
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Payments</h2>
        <p className="mt-1 text-sm text-muted">
          Mock payment attempts. These are simulated and never collect real
          money.
        </p>
      </div>

      <form
        method="get"
        className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-end"
      >
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <div className="flex-1">
          <label
            htmlFor="payment-q"
            className="mb-1 block text-xs font-medium text-muted"
          >
            Search candidate or expert
          </label>
          <input
            id="payment-q"
            name="q"
            defaultValue={q}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
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
            {paymentStatusLabels[value]}
          </Link>
        ))}
      </div>

      {!response ? (
        <p
          role="alert"
          className="rounded-xl border border-error/20 bg-error-soft px-4 py-3 text-sm text-error"
        >
          Payments could not be loaded.
        </p>
      ) : response.payments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
          No payments match these filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Booking</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {response.payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">
                      {payment.provider}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-muted">
                      {payment.providerPaymentReference ??
                        payment.id.slice(0, 8)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/workspace/admin/bookings/${payment.booking.id}`}
                      className="font-medium text-foreground hover:text-primary-700"
                    >
                      {payment.booking.candidate.name} with{" "}
                      {payment.booking.expert.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDateTime(payment.booking.startsAt)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${paymentStatusStyles[payment.status]}`}
                    >
                      {paymentStatusLabels[payment.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {payment.amount !== null && payment.currency
                      ? formatMoney(payment.amount, payment.currency)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatDateTime(payment.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
