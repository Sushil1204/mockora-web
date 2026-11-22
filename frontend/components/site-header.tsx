import Image from "next/image";
import Link from "next/link";

import { fetchServerApi, getCurrentUser } from "@/lib/session";
import type { NotificationListResponse } from "@/lib/types";
import { primaryButtonClass } from "@/lib/ui";

import { LogoutButton } from "./logout-button";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const notificationSummary = user
    ? await fetchServerApi<NotificationListResponse>("/notifications?limit=1")
    : null;
  const unreadCount = notificationSummary?.unreadCount ?? 0;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6"
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <Image
            src="/mockoraa-icon.png"
            alt=""
            width={30}
            height={30}
            className="h-[30px] w-[30px]"
            priority
          />
          <span className="text-lg font-semibold tracking-tight text-primary-800">
            Mockoraa
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/experts"
            className="rounded-lg px-2 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:px-3"
          >
            Find experts
          </Link>

          {user ? (
            <>
              <Link
                href="/account"
                className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:block"
              >
                Dashboard
              </Link>

              {user.roles.includes("CANDIDATE") && (
                <Link
                  href="/bookings"
                  className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 lg:block"
                >
                  Bookings
                </Link>
              )}

              <Link
                href="/candidate/profile"
                className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:block"
              >
                Profile
              </Link>

              {user.roles.includes("EXPERT") && (
                <Link
                  href="/workspace/expert"
                  className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:block"
                >
                  Expert workspace
                </Link>
              )}

              {user.roles.includes("ADMIN") && (
                <Link
                  href="/workspace/admin"
                  className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:block"
                >
                  Admin
                </Link>
              )}

              <Link
                href="/notifications"
                aria-label={
                  unreadCount > 0
                    ? `Notifications, ${unreadCount} unread`
                    : "Notifications"
                }
                className="relative rounded-lg px-2 py-2 text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                  <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                </svg>
                {unreadCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta-500 px-1 text-[10px] font-bold leading-none text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </Link>

              <span className="hidden max-w-40 truncate text-sm text-muted md:block">
                {user.name}
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className={`${primaryButtonClass} h-10 px-4`}
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
