import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/admin-nav";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Admin",
};

// Every admin screen depends on the request session.
export const instant = false;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.roles.includes("ADMIN")) {
    redirect("/account");
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta-600">
          Administration
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Operations console
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Manage people, bookings, pricing, finances, and quality. Sensitive
          actions are recorded in the audit log.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
        <aside className="shrink-0 lg:w-48">
          <AdminNav />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </main>
  );
}
