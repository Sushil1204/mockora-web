import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AvailabilityManager } from "@/components/expert/availability-manager";
import { buttonClasses } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { fetchServerApi, getCurrentUser } from "@/lib/session";
import type { OwnAvailability } from "@/lib/types";

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
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12"
      tabIndex={-1}
    >
      <PageHeader
        eyebrow="Expert workspace"
        title="Set the hours candidates can book."
        description="Published availability appears on your public profile. Weekly windows repeat in your timezone, and blocked dates override them. Candidates can request any open time at least two hours ahead."
        actions={
          <Link
            href="/workspace/expert"
            className={buttonClasses({ variant: "secondary" })}
          >
            Back to workspace
          </Link>
        }
      />

      <div className="mt-8">
        {!availability ? (
          <ErrorState
            title="We could not load your availability"
            description="Check that your expert profile is set up and the API is running, then refresh this page. Nothing has been changed."
          />
        ) : (
          <AvailabilityManager initial={availability} today={today} />
        )}
      </div>
    </main>
  );
}
