import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock3, Inbox } from "lucide-react";

import { BookingCard } from "@/components/bookings/booking-card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { fetchServerApi, getCurrentUser } from "@/lib/session";
import type { BookingListResponse, BookingStatus } from "@/lib/types";

function countStatuses(
  bookings: BookingListResponse["bookings"],
  statuses: BookingStatus[],
) {
  return bookings.filter((booking) => statuses.includes(booking.status)).length;
}

export const metadata: Metadata = {
  title: "Booking requests",
};

// Booking requests depend on the request session.
export const instant = false;

export default async function ExpertBookingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.roles.includes("EXPERT")) {
    redirect("/account");
  }

  const response = await fetchServerApi<BookingListResponse>(
    "/bookings?as=expert&limit=50",
  );
  const bookings = response?.bookings ?? [];
  const pending = bookings.filter(
    (booking) => booking.status === "PENDING_EXPERT_APPROVAL",
  );
  const otherBookings = bookings.filter(
    (booking) => booking.status !== "PENDING_EXPERT_APPROVAL",
  );
  const count = bookings.length;
  const upcoming = countStatuses(bookings, ["CONFIRMED", "IN_PROGRESS"]);
  const completed = countStatuses(bookings, ["COMPLETED"]);

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12"
      tabIndex={-1}
    >
      <PageHeader
        eyebrow="Expert workspace"
        title="Booking requests"
        description="Respond within two hours. Approving reserves the slot while the candidate pays; declining releases it immediately."
        actions={
          <Link
            href="/workspace/expert"
            className={buttonClasses({ variant: "secondary" })}
          >
            Back to workspace
          </Link>
        }
      />

      {!response ? (
        <ErrorState
          className="mt-8"
          title="We could not load your booking requests"
          description="Check your connection and refresh the page. No booking changes were made."
        />
      ) : count === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<Inbox aria-hidden="true" className="h-5 w-5" />}
          title="No booking requests yet"
          description="Candidates can request any time you have published. Keep your availability current so requests reach you with enough notice."
          action={
            <Link
              href="/workspace/expert/availability"
              className={buttonClasses({ variant: "secondary" })}
            >
              Manage availability
            </Link>
          }
        />
      ) : (
        <>
          <Card className="mt-8 overflow-hidden">
            <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
              <SummaryCount label="Awaiting response" value={pending.length} />
              <SummaryCount label="Upcoming" value={upcoming} />
              <SummaryCount label="Completed" value={completed} />
              <SummaryCount label="Total requests" value={count} />
            </div>
          </Card>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-8">
              {pending.length > 0 ? (
                <section aria-labelledby="response-queue-heading">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-overline font-semibold uppercase text-terracotta-600">
                        Priority queue
                      </p>
                      <h2
                        id="response-queue-heading"
                        className="mt-1 text-section font-semibold tracking-tight text-foreground"
                      >
                        Needs your response
                      </h2>
                    </div>
                    <Badge variant="warning">
                      {pending.length === 1
                        ? "1 request waiting"
                        : `${pending.length} requests waiting`}
                    </Badge>
                  </div>

                  <ul className="mt-4 space-y-4">
                    {pending.map((booking) => (
                      <li key={booking.id}>
                        <BookingCard booking={booking} perspective="expert" />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {otherBookings.length > 0 ? (
                <section aria-labelledby="expert-booking-list-heading">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-overline font-semibold uppercase text-terracotta-600">
                        Schedule
                      </p>
                      <h2
                        id="expert-booking-list-heading"
                        className="mt-1 text-section font-semibold tracking-tight text-foreground"
                      >
                        {pending.length > 0
                          ? "Other requests"
                          : "All booking requests"}
                      </h2>
                    </div>
                    <p className="text-xs text-muted">
                      {otherBookings.length === 1
                        ? "1 request"
                        : `${otherBookings.length} requests`}
                    </p>
                  </div>

                  <ul className="mt-4 space-y-4">
                    {otherBookings.map((booking) => (
                      <li key={booking.id}>
                        <BookingCard booking={booking} perspective="expert" />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <Card className="overflow-hidden">
                <div className="border-b border-border bg-warning-soft/60 p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-control bg-surface text-warning">
                    <Clock3 aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <h2 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
                    Two hours to respond
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    Approving keeps the slot reserved while the candidate pays.
                    Declining releases it immediately.
                  </p>
                </div>
                <p className="p-5 text-xs leading-relaxed text-muted">
                  Open a request to approve it or decline with an optional
                  reason the candidate can see.
                </p>
              </Card>

              <Card className="p-5">
                <h2 className="text-sm font-semibold text-foreground">
                  Need more requests?
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  Candidates can book any time inside your published windows.
                </p>
                <Link
                  href="/workspace/expert/availability"
                  className={buttonClasses({
                    variant: "secondary",
                    className: "mt-4 w-full",
                  })}
                >
                  Manage availability
                </Link>
              </Card>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}

function SummaryCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface p-4 sm:p-5">
      <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs font-medium text-muted">{label}</p>
    </div>
  );
}
