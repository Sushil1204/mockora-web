"use client";

import Link from "next/link";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-[#faf9f6] text-[#1c1917]">
        <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c2410c]">
            Application error
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Mockoraa could not start this page.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#6b6560]">
            Refresh the page to try again. If the problem continues, contact
            support and include the current time.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-11 items-center rounded-lg bg-[#1b4332] px-5 text-sm font-semibold text-white"
            >
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-lg border border-[#e7e5e4] bg-white px-5 text-sm font-semibold"
            >
              Return home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
