import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { InterviewRoom } from "@/components/interviews/interview-room";
import { fetchServerApi, getCurrentUser } from "@/lib/session";
import type { BookingResponse, InterviewStateResponse } from "@/lib/types";
import { secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Interview room",
};

// The room depends on the request session and the server-validated join window.
export const instant = false;

export default async function InterviewRoomPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { bookingId } = await params;
  const bookingResponse = await fetchServerApi<BookingResponse>(
    `/bookings/${bookingId}`,
  );

  if (!bookingResponse) {
    notFound();
  }

  const booking = bookingResponse.booking;

  if (booking.status !== "CONFIRMED" && booking.status !== "IN_PROGRESS") {
    redirect(`/bookings/${booking.id}`);
  }

  const interviewResponse = await fetchServerApi<InterviewStateResponse>(
    `/bookings/${booking.id}/interview-session`,
  );

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/bookings/${booking.id}`}
          className="text-sm font-medium text-primary-700 hover:underline"
        >
          ← Back to booking
        </Link>
        <p className="text-sm text-muted">
          {booking.viewer.isExpert
            ? booking.candidate.name
            : booking.expert.name}
          {" · "}
          {booking.durationMinutes} minutes
        </p>
      </div>

      <InterviewRoom
        bookingId={booking.id}
        counterpartName={
          booking.viewer.isExpert ? booking.candidate.name : booking.expert.name
        }
        user={user}
        initialInterview={interviewResponse?.interview ?? null}
      />

      <div className="mt-6">
        <Link href={`/bookings/${booking.id}`} className={secondaryButtonClass}>
          Return to booking details
        </Link>
      </div>
    </main>
  );
}
