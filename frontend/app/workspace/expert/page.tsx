import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { StatusBadge } from "@/components/status-badge";
import { fetchServerApi, getCurrentUser } from "@/lib/session";
import type { ExpertApplication } from "@/lib/types";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Expert workspace",
};

// Workspace content depends on the request session.
export const instant = false;

export default async function ExpertWorkspacePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.roles.includes("EXPERT")) {
    redirect("/account");
  }

  const response = await fetchServerApi<{ application: ExpertApplication }>(
    "/expert/profile",
  );
  const application = response?.application ?? null;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta-600">
        Expert workspace
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
        Welcome, {user.name.split(" ")[0]}.
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        Your expert role is active. Manage the profile candidates will see and
        keep your professional details current. Availability and booking
        requests arrive in later sprints.
      </p>

      {application ? (
        <section className={`${cardClass} mt-8`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Expert profile
              </h2>
              <p className="mt-1 text-sm text-muted">
                {application.professionalHeadline ??
                  "Add a headline so candidates know how you can help."}
              </p>
            </div>
            <StatusBadge status={application.verificationStatus} />
          </div>

          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted">Current role</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {application.currentDesignation ?? "Not provided"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Industries</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {application.industries.map((item) => item.name).join(", ") ||
                  "Not provided"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Publication</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {application.publicationStatus === "PUBLISHED"
                  ? "Published"
                  : "Not published"}
              </dd>
            </div>
          </dl>

          {application.reviewNotes ? (
            <p className="mt-4 rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-foreground">
              <span className="font-semibold">Administrator note:</span>{" "}
              {application.reviewNotes}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/workspace/expert/profile"
              className={primaryButtonClass}
            >
              Manage expert profile
            </Link>
            <Link href="/expert/application" className={secondaryButtonClass}>
              View application
            </Link>
          </div>
        </section>
      ) : (
        <section className={`${cardClass} mt-8`}>
          <h2 className="text-lg font-semibold text-foreground">
            Finish setting up your expert profile
          </h2>
          <p className="mt-2 text-sm text-muted">
            We could not find an expert profile for this account. Start or
            complete your application to continue.
          </p>
          <Link
            href="/expert/application"
            className={`${primaryButtonClass} mt-6`}
          >
            Open application
          </Link>
        </section>
      )}

      <Link href="/account" className={`${secondaryButtonClass} mt-8`}>
        Back to account
      </Link>
    </main>
  );
}
