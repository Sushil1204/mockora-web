import type { Metadata } from "next";
import Link from "next/link";

import {
  bookingStatusLabels,
  bookingStatusStyles,
  formatDateTime,
  formatMoney,
} from "@/lib/labels";
import { fetchServerApi } from "@/lib/session";
import type { AdminBookingsResponse, BookingStatus } from "@/lib/types";
import { inputClass, secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Bookings",
};

export const instant = false;

const statuses: BookingStatus[] = [
  "PENDING_EXPERT_APPROVAL",
  "APPROVED_PENDING_PAYMENT",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED_PENDING_FEEDBACK",
  "COMPLETED",
  "CANCELLED",
  "DECLINED",
  "EXPIRED",
];

function buildHref(input: { status?: string; q?: string; page?: number }) {
  const params = new URLSearchParams();
  if (input.status) params.set("status", input.status);
  if (input.q) params.set("q", input.q);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const query = params.toString();
  return query
    ? `/workspace/admin/bookings?${query}`
    : "/workspace/admin/bookings";
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = statuses.includes(params.status as BookingStatus)
    ? (params.status as BookingStatus)
    : undefined;
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const query = new URLSearchParams({ page: String(page), limit: "20" });
  if (status) query.set("status", status);
  if (q) query.set("q", q);

  const response = await fetchServerApi<AdminBookingsResponse>(
    `/admin/bookings?${query.toString()}`,
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Bookings</h2>
        <p className="mt-1 text-sm text-muted">
          Inspect the lifecycle, payment, and refund state of every booking.
        </p>
      </div>

      <form
        method="get"
        className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-end"
      >
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <div className="flex-1">
          <label
            htmlFor="booking-q"
            className="mb-1 block text-xs font-medium text-muted"
          >
            Search candidate or expert
          </label>
          <input
            id="booking-q"
            name="q"
            defaultValue={q}
            placeholder="Name or email"
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
            {bookingStatusLabels[value]}
          </Link>
        ))}
      </div>

      {!response ? (
        <p
          role="alert"
          className="rounded-xl border border-error/20 bg-error-soft px-4 py-3 text-sm text-error"
        >
          Bookings could not be loaded. Refresh the page to try again.
        </p>
      ) : response.bookings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-sm font-medium text-foreground">
            No bookings match these filters.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Booking</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {response.bookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/workspace/admin/bookings/${booking.id}`}
                      className="font-medium text-foreground hover:text-primary-700"
                    >
                      {booking.candidate.name} with {booking.expert.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDateTime(booking.startsAt)} ·{" "}
                      {booking.durationMinutes} min
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${bookingStatusStyles[booking.status]}`}
                    >
                      {bookingStatusLabels[booking.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {booking.priceAmount !== null && booking.currency
                      ? formatMoney(booking.priceAmount, booking.currency)
                      : "Unpriced"}
                    {booking.refundedAmount > 0 && booking.refundCurrency ? (
                      <p className="mt-0.5 text-xs text-info">
                        {formatMoney(
                          booking.refundedAmount,
                          booking.refundCurrency,
                        )}{" "}
                        refunded
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {booking.payment?.status ?? "None"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatDateTime(booking.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {response && response.pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            Page {response.pagination.page} of {response.pagination.totalPages}{" "}
            · {response.pagination.total} bookings
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
