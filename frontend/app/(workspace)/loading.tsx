import { Skeleton } from "@/components/ui/feedback";

export default function WorkspaceLoading() {
  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14"
      tabIndex={-1}
    >
      <div className="max-w-2xl">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-4 h-9 w-80 max-w-full" />
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-2/3" />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-40 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
      </div>
      <p className="sr-only" role="status">
        Loading workspace
      </p>
    </main>
  );
}
