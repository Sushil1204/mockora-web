import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Search } from "lucide-react";

import { BookingCard } from "@/components/bookings/booking-card";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { fetchServerApi, getCurrentUser } from "@/lib/session";
import type { BookingListResponse } from "@/lib/types";

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
  const count = response?.bookings.length ?? 0;

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
        <section className="mt-8" aria-labelledby="booking-list-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="booking-list-heading"
              className="text-sm font-semibold text-foreground"
            >
              {count === 1 ? "1 booking request" : `${count} booking requests`}
            </h2>
            <p className="text-xs text-muted">
              Newest requests appear alongside your active and past sessions.
            </p>
          </div>
          <ul className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
            {response.bookings.map((booking) => (
              <li key={booking.id}>
                <BookingCard booking={booking} perspective="candidate" />
              </li>
            ))}
          </ul>
        </section>
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
