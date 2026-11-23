"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function PublicError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6"
      tabIndex={-1}
    >
      <p className="text-overline font-semibold uppercase text-terracotta-600">
        Something went wrong
      </p>
      <h1 className="mt-3 text-page font-semibold tracking-tight text-foreground">
        We could not load this page.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Nothing was changed. Try again, or return to the marketplace.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link
          href="/experts"
          className="inline-flex h-11 items-center rounded-control px-4 text-sm font-semibold text-primary-700 hover:bg-surface-muted"
        >
          Browse experts
        </Link>
      </div>
    </main>
  );
}
