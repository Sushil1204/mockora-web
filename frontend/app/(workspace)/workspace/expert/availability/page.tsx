import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AvailabilityManager } from "@/components/expert/availability-manager";
import { fetchServerApi, getCurrentUser } from "@/lib/session";
import type { OwnAvailability } from "@/lib/types";
import { cardClass, secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Expert availability",
};

// Availability depends on the request session.
export const instant = false;

export default async function ExpertAvailabilityPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.roles.includes("EXPERT")) {
    redirect("/account");
  }

  const availability = await fetchServerApi<OwnAvailability>(
    "/expert/availability/rules",
  );
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14"
    >
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta-600">
            Expert workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Set the hours candidates can book.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Published availability appears on your public profile. Weekly
            windows repeat in your timezone, and blocked dates override them.
            Candidates can request any open time at least two hours ahead.
          </p>
        </div>
        <Link href="/workspace/expert" className={secondaryButtonClass}>
          Back to workspace
        </Link>
      </div>

      {!availability ? (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-foreground">
            We could not load your availability
          </h2>
          <p className="mt-2 text-sm text-muted">
            Check that your expert profile is set up and the API is running,
            then refresh this page. Nothing has been changed.
          </p>
          <Link
            href="/workspace/expert/profile"
            className={`${secondaryButtonClass} mt-5`}
          >
            Review expert profile
          </Link>
        </section>
      ) : (
        <AvailabilityManager initial={availability} today={today} />
      )}
    </main>
  );
}
