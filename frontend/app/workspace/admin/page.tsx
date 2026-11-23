import type { Metadata } from "next";
import Link from "next/link";

import { fetchServerApi } from "@/lib/session";
import { bookingStatusLabels } from "@/lib/labels";
import type { AdminAnalytics } from "@/lib/types";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Admin overview",
};

export const instant = false;

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AdminOverviewPage() {
  const analytics = await fetchServerApi<AdminAnalytics>("/admin/analytics");

  if (!analytics) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-error/20 bg-error-soft px-4 py-3 text-sm text-error"
      >
        Operational metrics could not be loaded. Refresh the page to try again.
      </div>
    );
  }

  const gross = analytics.payments.grossByCurrency[0];
  const refunds = analytics.refunds.byCurrency[0];
  const eligible = analytics.payouts.filter(
    (entry) => entry.status === "ELIGIBLE",
  );

  const stats = [
    { label: "Candidates", value: analytics.users.candidates },
    { label: "Approved experts", value: analytics.users.approvedExperts },
    {
      label: "Pending applications",
      value: analytics.users.pendingApplications,
    },
    {
      label: "Upcoming interviews",
      value: analytics.bookings.upcomingInterviews,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-surface p-5 shadow-xs"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {stat.label}
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className={cardClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Successful mock payments
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {gross ? formatMoney(gross.amount, gross.currency) : "—"}
          </p>
          <p className="mt-1 text-xs text-muted">
            {analytics.payments.successfulCount} payments · simulated, not real
            revenue
          </p>
        </div>
        <div className={cardClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Manual refunds recorded
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {refunds ? formatMoney(refunds.amount, refunds.currency) : "—"}
          </p>
          <p className="mt-1 text-xs text-muted">
            {analytics.refunds.count} records · no money moved by Mockoraa
          </p>
        </div>
        <div className={cardClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Eligible expert payouts
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {eligible.length > 0
              ? eligible
                  .map((entry) => formatMoney(entry.amount, entry.currency))
                  .join(" · ")
              : "—"}
          </p>
          <Link
            href="/workspace/admin/payouts"
            className="mt-2 inline-block text-xs font-semibold text-primary-700 hover:text-primary-800"
          >
            Open payout ledger
          </Link>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className={cardClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              Recent bookings
            </h2>
            <Link
              href="/workspace/admin/bookings"
              className="text-xs font-semibold text-primary-700 hover:text-primary-800"
            >
              View all
            </Link>
          </div>
          {analytics.recentBookings.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No bookings yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {analytics.recentBookings.map((booking) => (
                <li key={booking.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/workspace/admin/bookings/${booking.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {booking.candidateName} with {booking.expertName}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {formatDateTime(booking.startsAt)}
                      </span>
                    </span>
                    <span className="rounded-full border border-border bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-muted">
                      {bookingStatusLabels[booking.status]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              Recent admin activity
            </h2>
            <Link
              href="/workspace/admin/audit-logs"
              className="text-xs font-semibold text-primary-700 hover:text-primary-800"
            >
              Audit log
            </Link>
          </div>
          {analytics.recentActivity.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No sensitive admin actions recorded yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {analytics.recentActivity.map((entry) => (
                <li key={entry.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium text-foreground">
                    {entry.action.replaceAll("_", " ").toLowerCase()}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {entry.actor?.name ?? "System"} ·{" "}
                    {formatDateTime(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-foreground">
          Booking pipeline
        </h2>
        {analytics.bookings.byStatus.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No bookings yet.</p>
        ) : (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {analytics.bookings.byStatus.map((entry) => (
              <div
                key={entry.status}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <dt className="text-sm text-muted">
                  {bookingStatusLabels[entry.status]}
                </dt>
                <dd className="text-sm font-semibold text-foreground">
                  {entry.count}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  );
}
