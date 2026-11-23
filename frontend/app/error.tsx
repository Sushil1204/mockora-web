"use client";

import Link from "next/link";

import { Logo } from "@/components/shell/logo";
import { SkipLink } from "@/components/shell/skip-link";
import { Button } from "@/components/ui/button";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <SkipLink />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:h-[4.5rem] sm:px-6 lg:px-8">
          <Logo />
        </div>
      </header>
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-16 sm:px-6"
        tabIndex={-1}
      >
        <p className="text-overline font-semibold uppercase text-terracotta-600">
          Something went wrong
        </p>
        <h1 className="mt-3 text-page font-semibold tracking-tight text-foreground">
          We could not load this page.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          No changes were made to your account or bookings. Try again, or return
          to the home page if the problem continues.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-control px-4 text-sm font-semibold text-primary-700 hover:bg-surface-muted"
          >
            Return home
          </Link>
        </div>
      </main>
    </div>
  );
}
