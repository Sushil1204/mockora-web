import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BookingCard } from "@/components/bookings/booking-card";
import { fetchServerApi, getCurrentUser } from "@/lib/session";
import type { BookingListResponse } from "@/lib/types";
import { cardClass, primaryButtonClass } from "@/lib/ui";

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

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta-600">
            Candidate workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Your booking requests
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Follow each request from expert review through payment. A request is
            never confirmed until the expert approves it and payment succeeds.
          </p>
        </div>
        <Link href="/experts" className={primaryButtonClass}>
          Find an expert
        </Link>
      </div>

      {!response ? (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-foreground">
            We could not load your bookings
          </h2>
          <p className="mt-2 text-sm text-muted">
            Check your connection and refresh the page. No booking changes were
            made.
          </p>
        </section>
      ) : response.bookings.length === 0 ? (
        <section className={`${cardClass} text-center`}>
          <h2 className="text-lg font-semibold text-foreground">
            You have not requested a mock interview yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
            Browse verified experts, choose an open time, and send a request.
            You can track the expert&apos;s response here.
          </p>
          <Link href="/experts" className={`${primaryButtonClass} mt-6`}>
            Browse experts
          </Link>
        </section>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {response.bookings.map((booking) => (
            <li key={booking.id}>
              <BookingCard booking={booking} perspective="candidate" />
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/account"
        className="mt-8 inline-block text-sm font-medium text-primary-700 hover:underline"
      >
        Back to account
      </Link>
    </main>
  );
}
