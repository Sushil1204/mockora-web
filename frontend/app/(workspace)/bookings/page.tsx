import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Search } from "lucide-react";

import { BookingCard } from "@/components/bookings/booking-card";
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
  title: "Your bookings",
};

// Bookings depend on the request session.
export const instant = false;

export default async function BookingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.roles.includes("CANDIDATE")) {
    redirect("/account");
  }

  const response = await fetchServerApi<BookingListResponse>(
    "/bookings?as=candidate&limit=50",
  );
  const bookings = response?.bookings ?? [];
  const count = bookings.length;
  const awaiting = countStatuses(bookings, ["PENDING_EXPERT_APPROVAL"]);
  const paymentDue = countStatuses(bookings, ["APPROVED_PENDING_PAYMENT"]);
  const upcoming = countStatuses(bookings, ["CONFIRMED", "IN_PROGRESS"]);
  const past = countStatuses(bookings, [
    "DECLINED",
    "EXPIRED",
    "CANCELLED",
    "COMPLETED_PENDING_FEEDBACK",
    "COMPLETED",
  ]);

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12"
      tabIndex={-1}
    >
      <PageHeader
        eyebrow="Candidate workspace"
        title="Your booking requests"
        description="Follow each request from expert review through payment. A request is never confirmed until the expert approves it and payment succeeds."
        actions={
          <Link href="/experts" className={buttonClasses()}>
            <Search aria-hidden="true" className="h-4 w-4" />
            Find an expert
          </Link>
        }
      />

      {!response ? (
        <ErrorState
          className="mt-8"
          title="We could not load your bookings"
          description="Check your connection and refresh the page. No booking changes were made."
        />
      ) : count === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<CalendarDays aria-hidden="true" className="h-5 w-5" />}
          title="You have not requested a mock interview yet"
          description="Browse verified experts, choose an open time, and send a request. You can track the expert's response here."
          action={
            <Link href="/experts" className={buttonClasses()}>
              Browse experts
            </Link>
          }
        />
      ) : (
        <>
          <Card className="mt-8 overflow-hidden">
            <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
              <SummaryCount label="Awaiting reply" value={awaiting} />
              <SummaryCount label="Payment due" value={paymentDue} />
              <SummaryCount label="Upcoming" value={upcoming} />
              <SummaryCount label="Past" value={past} />
            </div>
          </Card>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <section aria-labelledby="booking-list-heading">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-overline font-semibold uppercase text-terracotta-600">
                    Request history
                  </p>
                  <h2
                    id="booking-list-heading"
                    className="mt-1 text-section font-semibold tracking-tight text-foreground"
                  >
                    {count === 1
                      ? "1 booking request"
                      : `${count} booking requests`}
                  </h2>
                </div>
                <p className="max-w-xs text-xs leading-relaxed text-muted sm:text-right">
                  Newest requests appear alongside active and past sessions.
                </p>
              </div>

              <ul className="mt-4 space-y-4">
                {bookings.map((booking) => (
                  <li key={booking.id}>
                    <BookingCard booking={booking} perspective="candidate" />
                  </li>
                ))}
              </ul>
            </section>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <Card className="overflow-hidden">
                <div className="border-b border-border bg-primary-50/70 p-5">
                  <p className="text-overline font-semibold uppercase text-primary-700">
                    How it works
                  </p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                    Three checkpoints to a confirmed interview.
                  </h2>
                </div>
                <ol className="divide-y divide-border">
                  <Step
                    number="01"
                    title="Send a request"
                    detail="Pick an open slot on an expert's profile."
                  />
                  <Step
                    number="02"
                    title="Wait for approval"
                    detail="The expert has two hours to accept or decline."
                  />
                  <Step
                    number="03"
                    title="Complete payment"
                    detail="Pay within the one-hour window to secure the slot."
                  />
                </ol>
              </Card>

              <Card className="p-5">
                <h2 className="text-sm font-semibold text-foreground">
                  Need another session?
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  Compare specialists and book a time that fits your
                  preparation.
                </p>
                <Link
                  href="/experts"
                  className={buttonClasses({
                    variant: "secondary",
                    className: "mt-4 w-full",
                  })}
                >
                  Browse experts
                </Link>
              </Card>
            </aside>
          </div>
        </>
      )}

      <Link
        href="/account"
        className="mt-8 inline-flex min-h-11 items-center text-sm font-semibold text-primary-700 hover:underline"
      >
        Back to account
      </Link>
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

function Step({
  number,
  title,
  detail,
}: {
  number: string;
  title: string;
  detail: string;
}) {
  return (
    <li className="flex gap-3 p-5">
      <span className="text-xs font-semibold tabular-nums text-terracotta-600">
        {number}
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{detail}</p>
      </div>
    </li>
  );
}
