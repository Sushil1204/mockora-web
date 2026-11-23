import { Skeleton } from "@/components/ui/feedback";

export default function ExpertProfileLoading() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12"
    >
      <h1 className="sr-only">Expert profile</h1>
      <p className="sr-only" role="status">
        Loading expert profile…
      </p>

      <Skeleton className="h-5 w-24" />

      <div className="mt-4 overflow-hidden rounded-panel border border-border bg-surface shadow-card">
        <div className="bg-primary-900 px-5 py-7 sm:px-8 sm:py-9">
          <div aria-hidden="true" className="flex flex-col gap-5 sm:flex-row">
            <Skeleton className="h-20 w-20 rounded-full bg-white/15 sm:h-24 sm:w-24" />
            <div className="space-y-3">
              <Skeleton className="h-5 w-28 bg-white/15" />
              <Skeleton className="h-9 w-56 bg-white/15" />
              <Skeleton className="h-4 w-44 bg-white/15" />
            </div>
          </div>
          <Skeleton className="mt-6 h-5 w-full max-w-2xl bg-white/15" />
        </div>
        <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[0, 1, 2].map((index) => (
            <div key={index} className="space-y-2 px-5 py-4 sm:px-6">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>

      <div
        aria-hidden="true"
        className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"
      >
        <div className="space-y-6">
          <Skeleton className="h-48 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-44 rounded-card" />
        </div>
        <Skeleton className="h-80 rounded-card" />
      </div>
    </main>
  );
}
