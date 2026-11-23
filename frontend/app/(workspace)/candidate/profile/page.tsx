import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgeCheck, CheckCircle2, Circle } from "lucide-react";

import { AccountDetailsCard } from "@/components/account/account-details";
import { ProfileForm } from "@/components/account/profile-form";
import { CandidateProfileForm } from "@/components/candidate/candidate-profile-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
  const profile = profileResponse?.profile ?? null;
  const complete = profile?.completionState === "COMPLETE";
  const checklist = [
    { label: "Career stage", done: Boolean(profile?.careerStage) },
    {
      label: "Industry and current role",
      done: Boolean(profile?.industry && profile.currentRole),
    },
    {
      label: "Target role and level",
      done: Boolean(profile?.targetRole && profile.targetLevel),
    },
    { label: "Preparation goals", done: (profile?.goals.length ?? 0) > 0 },
  ];

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12"
      tabIndex={-1}
    >
      <PageHeader
        eyebrow="Candidate profile"
        title="Tell us where you are and where you want to go."
        description="A complete profile gives your interviewer useful context before the session. You can change every answer later."
      />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-6">
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

          <ProfileForm user={user} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden">
            <div className="border-b border-border bg-surface-muted/60 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Profile status
                </h2>
                <Badge variant={complete ? "success" : "neutral"}>
                  {complete ? (
                    <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
                  ) : null}
                  {complete ? "Complete" : "In progress"}
                </Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {complete
                  ? "Your saved profile has everything experts need before a session."
                  : "A few saved details are still missing. Complete them when you are ready."}
              </p>
            </div>

            <ul className="divide-y divide-border px-5">
              {checklist.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center gap-2.5 py-3 text-sm"
                >
                  {item.done ? (
                    <CheckCircle2
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-success"
                    />
                  ) : (
                    <Circle
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-border-strong"
                    />
                  )}
                  <span
                    className={item.done ? "text-foreground" : "text-muted"}
                  >
                    {item.label}
                  </span>
                  <span className="sr-only">
                    {item.done ? "Complete" : "Not saved yet"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <AccountDetailsCard user={user} />

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Saved when you choose save
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              The checklist reflects the profile currently stored on your
              account. Unsaved edits do not change it until you save.
            </p>
          </Card>
        </aside>
      </div>
    </main>
  );
}
