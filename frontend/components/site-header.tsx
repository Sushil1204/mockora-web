import Image from "next/image";
import Link from "next/link";

import { getCurrentUser } from "@/lib/session";
import { primaryButtonClass } from "@/lib/ui";

import { LogoutButton } from "./logout-button";

export async function SiteHeader() {
  const user = await getCurrentUser();

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
