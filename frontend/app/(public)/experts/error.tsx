"use client";

import Link from "next/link";

import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ExpertsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6"
    >
      <Card className="p-6 sm:p-8">
        <p className="text-overline font-semibold uppercase text-terracotta-600">
          Marketplace unavailable
        </p>
        <h1 className="mt-2 text-page font-semibold tracking-tight text-foreground">
          We could not load this page.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The marketplace is temporarily unavailable. Check your connection and
          try again. Nothing in your account has changed.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button onClick={reset}>Try again</Button>
          <Link
            href="/experts"
            className={buttonClasses({ variant: "secondary" })}
          >
            Back to browse
          </Link>
        </div>
      </Card>
    </main>
  );
}
