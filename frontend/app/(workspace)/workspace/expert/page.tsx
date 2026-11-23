import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  Clock3,
  FileText,
  Inbox,
  UserRound,
} from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, ErrorState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { fetchServerApi, getCurrentUser } from "@/lib/session";
import type { ExpertApplication } from "@/lib/types";

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
    <main
      id="main-content"
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12"
      tabIndex={-1}
    >
      <PageHeader
        eyebrow="Expert workspace"
        title={`Welcome, ${user.name.split(" ")[0]}.`}
        description="Manage the profile candidates see, keep your professional details current, publish the hours they can book, and respond to booking requests within two hours."
        actions={
          application ? (
            <StatusBadge status={application.verificationStatus} />
          ) : null
        }
      />

      {!response ? (
        <ErrorState
          className="mt-8"
          title="We could not load your expert workspace"
          description="Check your connection and refresh the page. No profile changes were made."
        />
      ) : application ? (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <Card className="p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <Avatar name={user.name} src={user.avatarUrl} size="lg" />
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">
                      {user.name}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {application.professionalHeadline ??
                        "Add a headline so candidates know how you can help."}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    application.publicationStatus === "PUBLISHED"
                      ? "success"
                      : "neutral"
                  }
                >
                  {application.publicationStatus === "PUBLISHED"
                    ? "Published"
                    : "Not published"}
                </Badge>
              </div>

              <dl className="mt-6 grid grid-cols-1 gap-5 border-t border-border pt-6 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Current role</dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {application.currentDesignation ?? "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Company</dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {application.currentCompany ?? "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Industries</dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {application.industries
                      .map((item) => item.name)
                      .join(", ") || "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Experience</dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {application.yearsExperience !== null
                      ? `${application.yearsExperience} years`
                      : "Not provided"}
                  </dd>
                </div>
              </dl>

              {application.reviewNotes ? (
                <Alert variant="info" className="mt-6">
                  <span className="font-semibold">Administrator note:</span>{" "}
                  {application.reviewNotes}
                </Alert>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-6">
                <Link
                  href="/workspace/expert/bookings"
                  className={buttonClasses()}
                >
                  <Inbox aria-hidden="true" className="h-4 w-4" />
                  View booking requests
                </Link>
                <Link
                  href="/workspace/expert/profile"
                  className={buttonClasses({ variant: "secondary" })}
                >
                  <UserRound aria-hidden="true" className="h-4 w-4" />
                  Manage profile
                </Link>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Keep your workspace ready
              </h2>
              <ul className="mt-4 divide-y divide-border border-y border-border">
                <WorkspaceAction
                  href="/workspace/expert/availability"
                  icon={
                    <CalendarClock aria-hidden="true" className="h-4 w-4" />
                  }
                  label="Publish your hours"
                  detail="Weekly windows and blocked dates control what candidates can request."
                />
                <WorkspaceAction
                  href="/workspace/expert/bookings"
                  icon={<Clock3 aria-hidden="true" className="h-4 w-4" />}
                  label="Respond to requests"
                  detail="Candidates wait up to two hours for your decision."
                />
                <WorkspaceAction
                  href="/workspace/expert/profile"
                  icon={
                    <BriefcaseBusiness aria-hidden="true" className="h-4 w-4" />
                  }
                  label="Review your profile"
                  detail="Keep your headline, expertise, and experience current."
                />
                <WorkspaceAction
                  href="/expert/application"
                  icon={<FileText aria-hidden="true" className="h-4 w-4" />}
                  label="View your application"
                  detail="Check the details you submitted for review."
                />
              </ul>
            </Card>
          </div>

          <Card className="h-fit p-6 lg:sticky lg:top-24">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Profile status
            </h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-muted">Verification</dt>
                <dd className="mt-1">
                  <StatusBadge status={application.verificationStatus} />
                </dd>
              </div>
              <div>
                <dt className="text-muted">Publication</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {application.publicationStatus === "PUBLISHED"
                    ? "Visible on the public marketplace"
                    : "Not visible to candidates yet"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Submitted</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {new Date(application.submittedAt).toLocaleDateString("en", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
            </dl>

            <div className="mt-6 border-t border-border pt-5">
              <p className="text-xs leading-relaxed text-muted">
                An administrator controls verification and publication. Updates
                to an approved profile keep your current status.
              </p>
              <Link
                href="/workspace/expert/profile"
                className={buttonClasses({
                  variant: "secondary",
                  className: "mt-4 w-full",
                })}
              >
                Update profile
              </Link>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="mt-8 p-6 text-center sm:p-8">
          <h2 className="text-lg font-semibold text-foreground">
            Finish setting up your expert profile
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
            We could not find an expert profile for this account. Start or
            complete your application to continue.
          </p>
          <Link
            href="/expert/application"
            className={buttonClasses({ className: "mt-6" })}
          >
            Open application
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </Card>
      )}
    </main>
  );
}

function WorkspaceAction({
  href,
  icon,
  label,
  detail,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex min-h-14 items-start gap-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-surface-muted text-primary-700">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground group-hover:text-primary-700">
            {label}
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">
            {detail}
          </span>
        </span>
        <ArrowUpRight
          aria-hidden="true"
          className="mt-1 h-4 w-4 shrink-0 text-muted group-hover:text-primary-700"
        />
      </Link>
    </li>
  );
}
