import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ExpertApplicationForm } from "@/components/expert/expert-application-form";
import { StatusBadge } from "@/components/status-badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12"
      tabIndex={-1}
    >
      <PageHeader
        eyebrow="Expert profile"
        title="Keep your professional profile current."
        description="Candidates rely on these details when choosing an interviewer. You cannot change your verification status or candidate-facing pricing."
        actions={
          <Link
            href="/workspace/expert"
            className={buttonClasses({ variant: "secondary" })}
          >
            Back to workspace
          </Link>
        }
      />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0">
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

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {application ? (
            <Card className="overflow-hidden">
              <div className="border-b border-border bg-surface-muted/60 px-5 py-4">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Profile status
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Your verification and publication state come from the saved
                  application.
                </p>
              </div>
              <dl className="divide-y divide-border px-5">
                <div className="py-4">
                  <dt className="text-xs font-medium text-muted">
                    Verification
                  </dt>
                  <dd className="mt-1.5">
                    <StatusBadge status={application.verificationStatus} />
                  </dd>
                </div>
                <div className="py-4">
                  <dt className="text-xs font-medium text-muted">
                    Publication
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">
                    {application.publicationStatus === "PUBLISHED"
                      ? "Visible on the public marketplace"
                      : "Not visible to candidates yet"}
                  </dd>
                </div>
                <div className="py-4">
                  <dt className="text-xs font-medium text-muted">Submitted</dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">
                    {new Date(application.submittedAt).toLocaleDateString(
                      "en",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      },
                    )}
                  </dd>
                </div>
              </dl>
            </Card>
          ) : null}

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Changes keep your status
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Saving updates to an approved profile does not reset verification
              or remove it from the marketplace.
            </p>
          </Card>
        </aside>
      </div>
    </main>
  );
}
