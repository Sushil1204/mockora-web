"use client";

import Link from "next/link";

import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export default function ExpertsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6"
      tabIndex={-1}
    >
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          We could not load this page
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          The marketplace is temporarily unavailable. Check that the API is
          running, then try again. Nothing in your account has changed.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={reset} className={primaryButtonClass}>
            Try again
          </button>
          <Link href="/experts" className={secondaryButtonClass}>
            Back to browse
          </Link>
        </div>
      </section>
    </main>
  );
}
