import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgeCheck } from "lucide-react";

import { CandidateProfileForm } from "@/components/candidate/candidate-profile-form";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { fetchServerApi, getCurrentUser } from "@/lib/session";
import type { CandidateProfile, Taxonomy } from "@/lib/types";

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
  const complete = profileResponse?.profile?.completionState === "COMPLETE";

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12"
      tabIndex={-1}
    >
      <PageHeader
        eyebrow="Candidate profile"
        title="Tell us where you are and where you want to go."
        description="A complete profile gives your interviewer useful context before the session. You can change every answer later."
        actions={
          complete ? (
            <Badge variant="success" className="gap-1.5">
              <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
              Profile complete
            </Badge>
          ) : null
        }
      />

      <div className="mt-8">
        {!profileResponse || !taxonomy ? (
          <ErrorState
            title="We could not load your profile"
            description="Check that the API is running, then refresh this page. Your saved details have not been changed."
          />
        ) : (
          <CandidateProfileForm
            profile={profileResponse.profile}
            taxonomy={taxonomy}
          />
        )}
      </div>
    </main>
  );
}
