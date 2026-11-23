import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ExpertApplicationForm } from "@/components/expert/expert-application-form";
import { StatusBadge } from "@/components/status-badge";
import { buttonClasses } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { fetchServerApi, getCurrentUser } from "@/lib/session";
import type { ExpertApplication, Taxonomy } from "@/lib/types";

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
      className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12"
      tabIndex={-1}
    >
      <PageHeader
        eyebrow="Expert profile"
        title="Keep your professional profile current."
        description="Candidates rely on these details when choosing an interviewer. You cannot change your verification status or candidate-facing pricing."
        actions={
          <>
            {application ? (
              <StatusBadge status={application.verificationStatus} />
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

      <div className="mt-8">
        {!application || !taxonomy ? (
          <ErrorState
            title="We could not load your expert profile"
            description="Check that the API is running, then refresh this page. Your saved details have not been changed."
          />
        ) : (
          <ExpertApplicationForm
            application={application}
            taxonomy={taxonomy}
            mode="profile"
            defaultCountryCode={user.countryCode}
          />
        )}
      </div>
    </main>
  );
}
