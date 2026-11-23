"use client";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default function WorkspaceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14"
    >
      <PageHeader
        eyebrow="Workspace error"
        title="We could not load this workspace page."
        description="No changes were made to your account, bookings, or expert profile. Try again, or use the navigation to open another section."
      />
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <a
          href="/account"
          className="inline-flex h-11 items-center rounded-control px-4 text-sm font-semibold text-primary-700 hover:bg-surface-muted"
        >
          Go to account
        </a>
      </div>
    </main>
  );
}
