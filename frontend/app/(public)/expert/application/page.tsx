import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ExpertApplicationForm } from "@/components/expert/expert-application-form";
import { StatusBadge } from "@/components/status-badge";
import { fetchServerApi, getCurrentUser } from "@/lib/session";
import type { ExpertApplication, Taxonomy } from "@/lib/types";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Expert application",
};

// Application content depends on the request session.
export const instant = false;

export default async function ExpertApplicationPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [applicationResponse, taxonomy] = await Promise.all([
    fetchServerApi<{ application: ExpertApplication | null }>(
      "/expert/application",
    ),
    fetchServerApi<Taxonomy>("/taxonomies"),
  ]);

  const application = applicationResponse?.application ?? null;
  const isUnderReview =
    application?.verificationStatus === "SUBMITTED" ||
    application?.verificationStatus === "UNDER_REVIEW";
  const isApproved = application?.verificationStatus === "APPROVED";
  const isSuspended = application?.verificationStatus === "SUSPENDED";
  const isRejected = application?.verificationStatus === "REJECTED";

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14"
    >
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta-600">
          Become an expert
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Share your experience. Coach the next generation.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Every expert is reviewed by the Mockoraa team before candidates can
          book them. Save a draft as you go, then submit when you are ready.
        </p>
        {application ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <StatusBadge status={application.verificationStatus} />
            <span className="text-xs text-muted">
              Last updated{" "}
              {new Date(application.updatedAt).toLocaleDateString("en", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        ) : null}
      </div>

      {!applicationResponse || !taxonomy ? (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-foreground">
            We could not load your application
          </h2>
          <p className="mt-2 text-sm text-muted">
            Check that the API is running, then refresh this page. Nothing has
            been lost.
          </p>
        </section>
      ) : isApproved ? (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-foreground">
            Your expert profile is approved.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Candidates will be able to discover your profile once the
            marketplace launches. You can keep your professional details current
            from your expert workspace.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/workspace/expert/profile"
              className={primaryButtonClass}
            >
              Manage expert profile
            </Link>
            <Link href="/workspace/expert" className={secondaryButtonClass}>
              Open expert workspace
            </Link>
          </div>
        </section>
      ) : isSuspended ? (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-foreground">
            This expert profile is suspended.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {application.reviewNotes ??
              "Contact support if you believe this was a mistake."}
          </p>
        </section>
      ) : isUnderReview ? (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-foreground">
            Your application is with our team.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            We review every application manually. You will see the outcome here
            and your expert workspace will unlock after approval. Editing is
            paused while the review is in progress.
          </p>
          <Link href="/account" className={`${secondaryButtonClass} mt-6`}>
            Back to account
          </Link>
        </section>
      ) : (
        <>
          {isRejected ? (
            <div
              role="status"
              className="mb-6 rounded-lg border border-warning/20 bg-warning-soft px-4 py-3 text-sm text-foreground"
            >
              <p className="font-semibold">Changes requested</p>
              <p className="mt-1 text-muted">
                {application?.reviewNotes ??
                  "Update your details and submit again for review."}
              </p>
            </div>
          ) : null}

          <ExpertApplicationForm
            application={application}
            taxonomy={taxonomy}
            defaultCountryCode={user.countryCode}
          />
        </>
      )}
    </main>
  );
}
