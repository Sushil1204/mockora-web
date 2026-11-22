import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BookingCard } from "@/components/bookings/booking-card";
import { fetchServerApi, getCurrentUser } from "@/lib/session";
import type { BookingListResponse } from "@/lib/types";
import { cardClass, secondaryButtonClass } from "@/lib/ui";

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
  const pending =
    response?.bookings.filter(
      (booking) => booking.status === "PENDING_EXPERT_APPROVAL",
    ) ?? [];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta-600">
            Expert workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Booking requests
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Respond within two hours. Approving reserves the slot while the
            candidate pays; declining releases it immediately.
          </p>
        </div>
        <Link href="/workspace/expert" className={secondaryButtonClass}>
          Back to workspace
        </Link>
      </div>

      {!response ? (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-foreground">
            We could not load your booking requests
          </h2>
          <p className="mt-2 text-sm text-muted">
            Check your connection and refresh the page. No booking changes were
            made.
          </p>
        </section>
      ) : response.bookings.length === 0 ? (
        <section className={`${cardClass} text-center`}>
          <h2 className="text-lg font-semibold text-foreground">
            No booking requests yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
            Candidates can request any time you have published. Keep your
            availability current so requests reach you with enough notice.
          </p>
          <Link
            href="/workspace/expert/availability"
            className={`${secondaryButtonClass} mt-6`}
          >
            Manage availability
          </Link>
        </section>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted" aria-live="polite">
            {pending.length === 1
              ? "1 request is waiting for your response."
              : `${pending.length} requests are waiting for your response.`}
          </p>
          <ul className="grid gap-5 md:grid-cols-2">
            {response.bookings.map((booking) => (
              <li key={booking.id}>
                <BookingCard booking={booking} perspective="expert" />
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
