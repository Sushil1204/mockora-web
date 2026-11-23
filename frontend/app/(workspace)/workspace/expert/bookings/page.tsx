import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";

import { BookingCard } from "@/components/bookings/booking-card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { fetchServerApi, getCurrentUser } from "@/lib/session";
import type { BookingListResponse } from "@/lib/types";

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
  const count = response?.bookings.length ?? 0;

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
          <>
            {pending.length > 0 ? (
              <Badge variant="warning">
                {pending.length === 1
                  ? "1 awaiting response"
                  : `${pending.length} awaiting response`}
              </Badge>
            ) : null}
            <Link
              href="/workspace/expert"
              className={buttonClasses({ variant: "secondary" })}
            >
              Back to workspace
            </Link>
          </>
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
        <section className="mt-8" aria-labelledby="expert-booking-list-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="expert-booking-list-heading"
              className="text-sm font-semibold text-foreground"
            >
              {pending.length === 0
                ? "No requests are waiting for your response."
                : pending.length === 1
                  ? "1 request is waiting for your response."
                  : `${pending.length} requests are waiting for your response.`}
            </h2>
            <p className="text-xs text-muted">
              {count === 1 ? "1 total request" : `${count} total requests`}
            </p>
          </div>
          <ul className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
            {response.bookings.map((booking) => (
              <li key={booking.id}>
                <BookingCard booking={booking} perspective="expert" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
