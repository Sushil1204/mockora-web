export default function ExpertsLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div aria-hidden="true" className="max-w-3xl animate-pulse">
        <div className="h-3 w-28 rounded bg-surface-muted" />
        <div className="mt-4 h-9 w-full max-w-xl rounded bg-surface-muted" />
        <div className="mt-4 h-4 w-full max-w-2xl rounded bg-surface-muted" />
      </div>
      <p className="sr-only" role="status">
        Loading experts…
      </p>

      <div
        aria-hidden="true"
        className="mt-8 h-40 animate-pulse rounded-2xl border border-border bg-surface"
      />

      <div
        aria-hidden="true"
        className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            className="h-72 animate-pulse rounded-2xl border border-border bg-surface"
          />
        ))}
      </div>
    </main>
  );
}
