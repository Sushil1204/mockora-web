import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/account/profile-form";
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
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta-600">
          Your account
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Welcome, {user.name.split(" ")[0]}.
        </h1>
        <p className="mt-2 text-sm text-muted">
          Manage your account details and available workspaces.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <ProfileForm user={user} />

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-surface p-6 shadow-card">
            <h2 className="text-lg font-semibold text-foreground">Account</h2>
            <dl className="mt-4 space-y-3 text-sm">
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
                    <span
                      key={role}
                      className="rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700"
                    >
                      {roleLabels[role]}
                    </span>
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
          </section>

          <section className="rounded-2xl border border-border bg-surface p-6 shadow-card">
            <h2 className="text-lg font-semibold text-foreground">
              Workspaces
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center justify-between gap-3">
                <span className="text-muted">Candidate</span>
                <Link
                  href="/candidate/profile"
                  className="font-medium text-primary-700 hover:underline"
                >
                  Open profile
                </Link>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-muted">Expert</span>
                {user.roles.includes("EXPERT") ? (
                  <Link
                    href="/workspace/expert"
                    className="font-medium text-primary-700 hover:underline"
                  >
                    Open workspace
                  </Link>
                ) : (
                  <Link
                    href="/expert/application"
                    className="font-medium text-primary-700 hover:underline"
                  >
                    Apply to become an expert
                  </Link>
                )}
              </li>
              {user.roles.includes("ADMIN") && (
                <li className="flex items-center justify-between gap-3">
                  <span className="text-muted">Admin</span>
                  <Link
                    href="/workspace/admin"
                    className="font-medium text-primary-700 hover:underline"
                  >
                    Open workspace
                  </Link>
                </li>
              )}
            </ul>
            <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-muted">
              Expert access is granted after an administrator reviews your
              application. Self-assigned roles are rejected by the API.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
