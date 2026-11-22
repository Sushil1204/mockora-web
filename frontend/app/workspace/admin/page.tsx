import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Admin workspace",
};

// Workspace content depends on the request session.
export const instant = false;

export default async function AdminWorkspacePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.roles.includes("ADMIN")) {
    redirect("/account");
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta-600">
        Administration
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
        Administrator workspace
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        User and role administration is enforced by the API at
        <code className="mx-1 rounded bg-surface-muted px-1.5 py-0.5 text-xs">
          POST /api/v1/admin/users/:userId/roles
        </code>
        . The admin console arrives with the later administration sprint.
      </p>
      <Link href="/account" className={`${secondaryButtonClass} mt-6`}>
        Back to account
      </Link>
    </main>
  );
}
