import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { secondaryButtonClass } from "@/lib/ui";

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

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta-600">
        Expert workspace
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
        Your expert account is active.
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        Expert applications, availability management, and booking requests are
        delivered in the next sprints. Your role is already enforced by the API,
        so expert-only endpoints will accept your session.
      </p>
      <Link href="/account" className={`${secondaryButtonClass} mt-6`}>
        Back to account
      </Link>
    </main>
  );
}
