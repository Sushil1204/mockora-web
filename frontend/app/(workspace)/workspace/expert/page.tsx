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
      {!response ? (
        <ErrorState
          title="We could not load your expert workspace"
          description="Check your connection and refresh the page. No profile changes were made."
        />
      ) : application ? (
        <>
          <section className="relative overflow-hidden rounded-panel border border-border bg-primary-900 px-5 py-7 text-white shadow-card sm:px-8 sm:py-9">
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/10 bg-white/5"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-28 right-28 h-52 w-52 rounded-full bg-terracotta-500/10 blur-2xl"
            />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
                <Avatar
                  name={user.name}
                  src={user.avatarUrl}
                  size="xl"
                  className="h-20 w-20 border-2 border-white/20 sm:h-24 sm:w-24"
                />
                <div className="min-w-0">
                  <p className="text-overline font-semibold uppercase text-terracotta-300">
                    Expert workspace
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                    Welcome, {user.name.split(" ")[0]}.
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-primary-100 sm:text-base">
                    {application.professionalHeadline ??
                      "Add a headline so candidates know how you can help."}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={application.verificationStatus} />
                  <Badge
                    variant={
                      application.publicationStatus === "PUBLISHED"
                        ? "success"
                        : "neutral"
                    }
                    className="border-white/20 bg-white/10 text-primary-100"
                  >
                    {application.publicationStatus === "PUBLISHED"
                      ? "Published"
                      : "Not published"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/workspace/expert/bookings"
                    className={buttonClasses({
                      className:
                        "bg-white text-primary-900 hover:bg-primary-50",
                    })}
                  >
                    <Inbox aria-hidden="true" className="h-4 w-4" />
                    View booking requests
                  </Link>
                  <Link
                    href="/workspace/expert/profile"
                    className={buttonClasses({
                      variant: "secondary",
                      className:
                        "border-white/20 bg-white/10 text-white shadow-none hover:bg-white/15",
                    })}
                  >
                    <UserRound aria-hidden="true" className="h-4 w-4" />
                    Manage profile
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6" aria-labelledby="expert-shortcuts-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-overline font-semibold uppercase text-terracotta-600">
                  Quick actions
                </p>
                <h2
                  id="expert-shortcuts-heading"
                  className="mt-1 text-section font-semibold tracking-tight text-foreground"
                >
                  Keep your workspace ready.
                </h2>
              </div>
              <p className="max-w-sm text-xs leading-relaxed text-muted sm:text-right">
                Requests, availability, and profile details all feed the
                candidate-facing experience.
              </p>
            </div>

            <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <QuickAction
                href="/workspace/expert/bookings"
                icon={<Clock3 aria-hidden="true" className="h-5 w-5" />}
                label="Respond to requests"
                detail="Candidates wait up to two hours for your decision."
              />
              <QuickAction
                href="/workspace/expert/availability"
                icon={<CalendarClock aria-hidden="true" className="h-5 w-5" />}
                label="Publish your hours"
                detail="Weekly windows and blocked dates control what candidates can request."
              />
              <QuickAction
                href="/workspace/expert/profile"
                icon={
                  <BriefcaseBusiness aria-hidden="true" className="h-5 w-5" />
                }
                label="Review your profile"
                detail="Keep your headline, expertise, and experience current."
              />
              <QuickAction
                href="/expert/application"
                icon={<FileText aria-hidden="true" className="h-5 w-5" />}
                label="View your application"
                detail="Check the details you submitted for review."
              />
            </ul>
          </section>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border bg-primary-50/50 px-6 py-5 sm:px-8">
                <div>
                  <p className="text-overline font-semibold uppercase text-terracotta-600">
                    Public profile
                  </p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                    What candidates can check.
                  </h2>
                </div>
                <Link
                  href="/workspace/expert/profile"
                  className={buttonClasses({
                    variant: "secondary",
                    size: "sm",
                    className: "min-h-11",
                  })}
                >
                  Edit profile
                </Link>
              </div>

              <dl className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2">
                <ProfileFact
                  label="Current role"
                  value={application.currentDesignation ?? "Not provided"}
                />
                <ProfileFact
                  label="Company"
                  value={application.currentCompany ?? "Not provided"}
                />
                <ProfileFact
                  label="Experience"
                  value={
                    application.yearsExperience !== null
                      ? `${application.yearsExperience} years`
                      : "Not provided"
                  }
                />
                <ProfileFact
                  label="Industries"
                  value={
                    application.industries
                      .map((item) => item.name)
                      .join(", ") || "Not provided"
                  }
                />
              </dl>

              {application.reviewNotes ? (
                <div className="border-t border-border p-6 sm:p-8">
                  <Alert variant="info">
                    <span className="font-semibold">Administrator note:</span>{" "}
                    {application.reviewNotes}
                  </Alert>
                </div>
              ) : null}
            </Card>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <Card className="overflow-hidden">
                <div className="border-b border-border bg-surface-muted/60 px-5 py-4">
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    Profile status
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Verification and publication are managed by an
                    administrator.
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
                    <dt className="text-xs font-medium text-muted">
                      Submitted
                    </dt>
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
                <p className="border-t border-border px-5 py-4 text-xs leading-relaxed text-muted">
                  Updates to an approved profile keep your current status.
                </p>
              </Card>
            </aside>
          </div>
        </>
      ) : (
        <Card className="p-6 text-center sm:p-10">
          <p className="text-overline font-semibold uppercase text-terracotta-600">
            Expert workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Finish setting up your expert profile.
          </h1>
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

function QuickAction({
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
        className="group flex h-full flex-col rounded-card border border-border bg-surface p-5 shadow-card transition-colors duration-150 hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-control bg-primary-50 text-primary-700">
          {icon}
        </span>
        <span className="mt-4 block text-sm font-semibold text-foreground group-hover:text-primary-700">
          {label}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-muted">
          {detail}
        </span>
        <span className="mt-auto flex items-center gap-1.5 pt-4 text-xs font-semibold text-primary-700">
          Open
          <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        </span>
      </Link>
    </li>
  );
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-6 py-5 sm:px-8">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
