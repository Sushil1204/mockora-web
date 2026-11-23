import { Skeleton } from "@/components/ui/feedback";

export default function ExpertsLoading() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14"
    >
      <h1 className="sr-only">Browse experts</h1>

      <div aria-hidden="true">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-4 h-10 w-full max-w-xl" />
        <Skeleton className="mt-4 h-4 w-full max-w-2xl" />
        <Skeleton className="mt-2 h-4 w-2/3 max-w-xl" />
      </div>

      <div className="mt-8 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        <div aria-hidden="true" className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-control" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
        <div
          aria-hidden="true"
          className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Skeleton className="h-11 sm:col-span-2 lg:col-span-3" />
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Skeleton key={index} className="h-11" />
          ))}
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>

      <div
        aria-hidden="true"
        className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton key={index} className="h-80 rounded-card" />
        ))}
      </div>

      <p className="sr-only" role="status">
        Loading experts…
      </p>
    </main>
  );
}
