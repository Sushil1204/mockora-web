import Link from "next/link";

import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

const benefits = [
  {
    title: "Verified professionals",
    description:
      "Every expert is reviewed before they appear on the marketplace, so you know who you are practising with.",
  },
  {
    title: "Realistic interview practice",
    description:
      "Book a focused one-to-one session that mirrors the pressure and structure of a real interview.",
  },
  {
    title: "Structured feedback",
    description:
      "Understand your strengths and the specific areas to improve before your next conversation.",
  },
];

export default function Home() {
  return (
    <main id="main-content" className="flex flex-1 flex-col">
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-terracotta-600">
              Mock interview marketplace
            </p>
            <h1 className="max-w-2xl text-4xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Practice the interview before it counts.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Mockoraa connects candidates with experienced professionals for
              realistic mock interviews, honest feedback, and a calmer path to
              your next role.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className={primaryButtonClass}>
                Create an account
              </Link>
              <Link href="/experts" className={secondaryButtonClass}>
                Browse experts
              </Link>
              <Link href="/login" className={secondaryButtonClass}>
                Sign in
              </Link>
            </div>

            <p className="mt-4 text-sm text-muted">
              Browse verified experts without an account. Sign in only when you
              are ready to request a mock interview.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
              Built for preparation
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              One session. Clear next steps.
            </h2>
            <ol className="mt-6 space-y-5">
              {[
                "Choose an expert and request a time.",
                "Complete your booking and prepare.",
                "Meet for the interview, then review your feedback.",
              ].map((step, index) => (
                <li key={step} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary-700"
                  >
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm leading-relaxed text-muted">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
            <div className="mt-6 rounded-xl border border-terracotta-100 bg-terracotta-50 px-4 py-3 text-sm text-terracotta-700">
              Payments remain in mock mode while the booking flow is built.
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-3">
          {benefits.map((benefit) => (
            <article key={benefit.title}>
              <h2 className="text-base font-semibold text-foreground">
                {benefit.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {benefit.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:flex-row sm:items-center sm:px-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Ready to prepare with intent?
          </h2>
          <p className="mt-2 text-sm text-muted">
            Explore verified experts, then create an account when you are ready
            to book.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/experts" className={secondaryButtonClass}>
            Find an expert
          </Link>
          <Link href="/register" className={primaryButtonClass}>
            Get started
          </Link>
        </div>
      </section>
    </main>
  );
}
