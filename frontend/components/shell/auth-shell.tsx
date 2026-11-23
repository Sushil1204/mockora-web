import type { ReactNode } from "react";
import Link from "next/link";

import { Logo } from "./logo";
import { SkipLink } from "./skip-link";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <SkipLink />
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <Link
            href="/"
            className="rounded-control px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            Back to home
          </Link>
        </div>
      </header>
      <main
        id="main-content"
        className="flex flex-1 items-start justify-center px-4 py-12 sm:items-center sm:py-16"
      >
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-muted sm:px-6">
          Mock interviews with verified professionals.
        </div>
      </footer>
    </div>
  );
}
