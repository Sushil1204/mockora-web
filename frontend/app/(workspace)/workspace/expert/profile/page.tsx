import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ExpertApplicationForm } from "@/components/expert/expert-application-form";
import { StatusBadge } from "@/components/status-badge";
import { fetchServerApi, getCurrentUser } from "@/lib/session";
import type { ExpertApplication, Taxonomy } from "@/lib/types";
import { cardClass, secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Expert profile",
};

// Profile content depends on the request session.
export const instant = false;

export default async function ExpertProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.roles.includes("EXPERT")) {
    redirect("/account");
  }

  const [applicationResponse, taxonomy] = await Promise.all([
    fetchServerApi<{ application: ExpertApplication }>("/expert/profile"),
    fetchServerApi<Taxonomy>("/taxonomies"),
  ]);

  const application = applicationResponse?.application ?? null;

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14"
      tabIndex={-1}
    >
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta-600">
            Expert profile
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Keep your professional profile current.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Candidates rely on these details when choosing an interviewer. You
            cannot change your verification status or candidate-facing pricing.
          </p>
          {application ? (
            <div className="mt-4">
              <StatusBadge status={application.verificationStatus} />
            </div>
          ) : null}
        </div>
        <Link href="/workspace/expert" className={secondaryButtonClass}>
          Back to workspace
        </Link>
      </div>

      {!application || !taxonomy ? (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-foreground">
            We could not load your expert profile
          </h2>
          <p className="mt-2 text-sm text-muted">
            Check that the API is running, then refresh this page. Your saved
            details have not been changed.
          </p>
        </section>
      ) : (
        <ExpertApplicationForm
          application={application}
          taxonomy={taxonomy}
          mode="profile"
          defaultCountryCode={user.countryCode}
        />
      )}
    </main>
  );
}
