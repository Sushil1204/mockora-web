export default function ExpertProfileLoading() {
  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14"
      tabIndex={-1}
    >
      <p className="sr-only" role="status">
        Loading expert profile…
      </p>
      <div
        aria-hidden="true"
        className="grid animate-pulse gap-6 lg:grid-cols-[1.6fr_1fr]"
      >
        <div className="space-y-6">
          <div className="h-64 rounded-2xl border border-border bg-surface" />
          <div className="h-40 rounded-2xl border border-border bg-surface" />
          <div className="h-56 rounded-2xl border border-border bg-surface" />
        </div>
        <div className="h-72 rounded-2xl border border-border bg-surface" />
      </div>
    </main>
  );
}
