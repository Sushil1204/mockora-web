import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CandidateProfileForm } from "@/components/candidate/candidate-profile-form";
import { fetchServerApi, getCurrentUser } from "@/lib/session";
import type { CandidateProfile, Taxonomy } from "@/lib/types";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Candidate profile",
};

// Profile content depends on the request session.
export const instant = false;

export default async function CandidateProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.roles.includes("CANDIDATE")) {
    redirect("/account");
  }

  const [profileResponse, taxonomy] = await Promise.all([
    fetchServerApi<{ profile: CandidateProfile | null }>("/candidate/profile"),
    fetchServerApi<Taxonomy>("/taxonomies"),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta-600">
          Candidate onboarding
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Tell us where you are and where you want to go.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          A complete profile helps us recommend the right experts and gives your
          interviewer useful context. You can change every answer later.
        </p>
        {profileResponse?.profile?.completionState === "COMPLETE" ? (
          <p className="mt-4 inline-flex items-center rounded-full border border-success/20 bg-success-soft px-3 py-1 text-xs font-semibold text-success">
            Profile complete
          </p>
        ) : null}
      </div>

      {!profileResponse || !taxonomy ? (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-foreground">
            We could not load your profile
          </h2>
          <p className="mt-2 text-sm text-muted">
            Check that the API is running, then refresh this page. Your saved
            details have not been changed.
          </p>
        </section>
      ) : (
        <CandidateProfileForm
          profile={profileResponse.profile}
          taxonomy={taxonomy}
        />
      )}
    </main>
  );
}
