import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarCheck2,
  MessagesSquare,
} from "lucide-react";

import { Logo } from "./logo";
import { SkipLink } from "./skip-link";

const trustPoints = [
  {
    icon: BadgeCheck,
    title: "Reviewed professionals",
    description:
      "Every expert is reviewed before they appear on the marketplace.",
  },
  {
    icon: CalendarCheck2,
    title: "A clear booking flow",
    description:
      "Request a time and follow each step from expert review to confirmation.",
  },
  {
    icon: MessagesSquare,
    title: "Feedback you can use",
    description:
      "Leave each session with written strengths and specific next steps.",
  },
];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <SkipLink />

      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:h-[4.5rem] sm:px-6 lg:px-8">
          <Logo />
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-1.5 rounded-control px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex flex-1">
        <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-10 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(26rem,30rem)] lg:items-center lg:gap-16 lg:py-14">
          <aside className="hidden lg:block">
            <div className="relative overflow-hidden rounded-panel bg-primary-900 p-8 text-white xl:p-10">
              <div
                aria-hidden="true"
                className="absolute -right-24 -top-24 h-64 w-64 rounded-full border border-white/10 bg-white/5"
              />
              <div
                aria-hidden="true"
                className="absolute -bottom-32 -left-16 h-64 w-64 rounded-full bg-terracotta-500/10 blur-2xl"
              />

              <div className="relative">
                <p className="text-overline font-semibold uppercase text-primary-200">
                  Mockoraa
                </p>
                <p className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-tight">
                  A calmer way to prepare for the conversation.
                </p>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-primary-100">
                  Practise with professionals who interview for the roles you
                  want, then turn their feedback into your next step.
                </p>

                <ul className="mt-8 space-y-5 border-t border-white/15 pt-7">
                  {trustPoints.map((point) => {
                    const Icon = point.icon;

                    return (
                      <li key={point.title} className="flex gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-primary-100">
                          <Icon aria-hidden="true" className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold">{point.title}</p>
                          <p className="mt-0.5 text-sm leading-relaxed text-primary-100">
                            {point.description}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <p className="mt-8 border-t border-white/15 pt-5 text-sm text-primary-100">
                  Not ready to sign in?{" "}
                  <Link
                    href="/experts"
                    className="font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
                  >
                    Browse experts first
                  </Link>
                </p>
              </div>
            </div>
          </aside>

          <div className="mx-auto w-full max-w-md lg:mx-0">{children}</div>
        </div>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>Mockoraa</p>
          <p>Mock interviews with verified professionals.</p>
        </div>
      </footer>
    </div>
  );
}
