import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { ProfileForm } from "@/components/account/profile-form";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/session";
import type { Role } from "@/lib/types";

export const metadata: Metadata = {
  title: "Account",
};

// Account content depends on the request session and must not be prerendered.
export const instant = false;

const roleLabels: Record<Role, string> = {
  CANDIDATE: "Candidate",
  EXPERT: "Expert",
  ADMIN: "Administrator",
};

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12"
      tabIndex={-1}
    >
      <PageHeader
        eyebrow="Your account"
        title={`Welcome, ${user.name.split(" ")[0]}.`}
        description="Manage your account details and move between the workspaces available to you."
      />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <ProfileForm user={user} />

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Avatar name={user.name} src={user.avatarUrl} size="lg" />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">
                  {user.name}
                </h2>
                <p className="mt-0.5 truncate text-sm text-muted">
                  {user.email}
                </p>
              </div>
            </div>

            <dl className="mt-6 space-y-4 border-t border-border pt-5 text-sm">
              <div>
                <dt className="text-muted">Email</dt>
                <dd className="mt-0.5 break-all font-medium text-foreground">
                  {user.email}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Roles</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {user.roles.map((role) => (
                    <Badge key={role} variant="brand">
                      {roleLabels[role]}
                    </Badge>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Member since</dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {new Date(user.createdAt).toLocaleDateString("en", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Workspaces
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Open the area that matches what you want to do next.
            </p>

            <ul className="mt-5 divide-y divide-border border-y border-border">
              <WorkspaceLink
                href="/experts"
                icon={<Search aria-hidden="true" className="h-4 w-4" />}
                label="Find experts"
                detail="Browse the marketplace"
              />
              {user.roles.includes("CANDIDATE") ? (
                <>
                  <WorkspaceLink
                    href="/candidate/profile"
                    icon={<UserRound aria-hidden="true" className="h-4 w-4" />}
                    label="Candidate profile"
                    detail="Keep your preparation context current"
                  />
                  <WorkspaceLink
                    href="/bookings"
                    icon={
                      <CalendarDays aria-hidden="true" className="h-4 w-4" />
                    }
                    label="Bookings"
                    detail="Track requests and confirmed sessions"
                  />
                </>
              ) : null}
              <WorkspaceLink
                href={
                  user.roles.includes("EXPERT")
                    ? "/workspace/expert"
                    : "/expert/application"
                }
                icon={
                  <BriefcaseBusiness aria-hidden="true" className="h-4 w-4" />
                }
                label="Expert"
                detail={
                  user.roles.includes("EXPERT")
                    ? "Manage requests, availability, and profile"
                    : "Apply to become an expert"
                }
              />
              {user.roles.includes("ADMIN") ? (
                <WorkspaceLink
                  href="/workspace/admin"
                  icon={<ShieldCheck aria-hidden="true" className="h-4 w-4" />}
                  label="Admin"
                  detail="Open the operations console"
                />
              ) : null}
            </ul>

            <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted">
              <BadgeCheck
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-primary-600"
              />
              Expert access is granted after an administrator reviews your
              application. Self-assigned roles are rejected by the API.
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}

function WorkspaceLink({
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
        className="group flex min-h-14 items-center gap-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-surface-muted text-primary-700">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground group-hover:text-primary-700">
            {label}
          </span>
          <span className="mt-0.5 block text-xs text-muted">{detail}</span>
        </span>
        <ArrowUpRight
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-muted group-hover:text-primary-700"
        />
      </Link>
    </li>
  );
}
