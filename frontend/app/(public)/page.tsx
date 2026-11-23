import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  ClipboardCheck,
  MessagesSquare,
  Search,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const benefits = [
  {
    icon: BadgeCheck,
    title: "Verified professionals",
    description:
      "Every expert is reviewed before they appear on the marketplace, so you know who you are practising with.",
  },
  {
    icon: MessagesSquare,
    title: "Structured feedback",
    description:
      "Understand your strengths and the specific areas to improve before your next interview conversation.",
  },
  {
    icon: CalendarCheck2,
    title: "A clear booking flow",
    description:
      "Request a time, track the expert's response, and see exactly what happens next at every stage.",
  },
];

const journey = [
  {
    icon: Search,
    title: "Choose an expert",
    description:
      "Browse verified professionals by industry, role, interview type, and language.",
  },
  {
    icon: CalendarCheck2,
    title: "Request a time",
    description:
      "Send an open time that works for you. The expert reviews your request before it is confirmed.",
  },
  {
    icon: ClipboardCheck,
    title: "Interview and review",
    description:
      "Meet one-to-one, then use the structured feedback to plan your next step.",
  },
];

const candidatePoints = [
  "Browse experts without creating an account.",
  "Track each request from review through confirmation.",
  "Keep your preparation notes and feedback in one place.",
];

export default function Home() {
  return (
    <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col">
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden="true"
          className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary-100/70 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-terracotta-100/50 blur-3xl"
        />

        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-20 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <Badge variant="brand" className="gap-2 px-3 py-1.5">
              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
              Verified interview practice
            </Badge>

            <h1 className="mt-5 max-w-2xl text-display font-bold tracking-tight text-foreground">
              Practice the interview before it counts.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Mockoraa connects candidates with experienced professionals for
              realistic mock interviews, honest feedback, and a calmer path to
              your next role.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className={buttonClasses({
                  size: "lg",
                  className: "sm:w-auto",
                })}
              >
                Create an account
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                href="/experts"
                className={buttonClasses({
                  variant: "secondary",
                  size: "lg",
                  className: "sm:w-auto",
                })}
              >
                Browse experts
              </Link>
            </div>

            <p className="mt-4 text-sm text-muted">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-primary-700 underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>

            <ul className="mt-8 grid gap-3 text-sm text-muted sm:grid-cols-3">
              <li className="flex items-start gap-2">
                <UserRoundCheck
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary-600"
                />
                Reviewed experts
              </li>
              <li className="flex items-start gap-2">
                <BadgeCheck
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary-600"
                />
                One-to-one sessions
              </li>
              <li className="flex items-start gap-2">
                <MessagesSquare
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary-600"
                />
                Written feedback
              </li>
            </ul>
          </div>

          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-3 rotate-2 rounded-panel bg-primary-100/70"
            />
            <Card className="relative overflow-hidden rounded-panel border-primary-200 shadow-popover">
              <div className="bg-primary-900 px-6 py-6 text-white sm:px-8">
                <p className="text-overline font-semibold uppercase text-primary-200">
                  Your preparation path
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  From first search to interview day.
                </h2>
              </div>

              <ol className="divide-y divide-border px-6 sm:px-8">
                {journey.map((step, index) => {
                  const Icon = step.icon;

                  return (
                    <li key={step.title} className="flex gap-4 py-5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary-200 bg-primary-50 text-primary-700">
                        <Icon aria-hidden="true" className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          <span className="mr-2 text-xs font-semibold text-terracotta-600">
                            0{index + 1}
                          </span>
                          {step.title}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-muted">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <p className="border-t border-border bg-surface-muted px-6 py-4 text-xs leading-relaxed text-muted sm:px-8">
                Requesting a time is free. A booking is confirmed only after the
                expert approves it and payment succeeds. Payments remain in mock
                mode while the booking flow is built.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section aria-labelledby="why-mockoraa" className="bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-overline font-semibold uppercase text-terracotta-600">
              Why Mockoraa
            </p>
            <h2
              id="why-mockoraa"
              className="mt-2 text-section font-semibold tracking-tight text-foreground"
            >
              Preparation with a human on the other side.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
              A real conversation with someone who has sat where you want to go
              is more useful than another list of generic questions.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <Card key={benefit.title} className="p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-control bg-primary-50 text-primary-700">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-foreground">
                    {benefit.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {benefit.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <p className="text-overline font-semibold uppercase text-terracotta-600">
              For candidates
            </p>
            <h2 className="mt-2 max-w-lg text-3xl font-semibold tracking-tight text-foreground">
              Walk in knowing what to expect.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
              Find a professional who interviews for the role you want, choose
              an open time, and get feedback you can act on.
            </p>
            <ul className="mt-6 space-y-3">
              {candidatePoints.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                    <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
                  </span>
                  <span className="leading-relaxed text-foreground">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/experts"
              className={buttonClasses({
                variant: "secondary",
                className: "mt-7",
              })}
            >
              Browse verified experts
            </Link>
          </div>

          <div className="rounded-panel border border-primary-200 bg-primary-50 p-6 sm:p-8">
            <p className="text-overline font-semibold uppercase text-primary-700">
              For professionals
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              Interview on your terms.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Share the experience you have built. Every application is reviewed
              by the Mockoraa team before candidates can book you.
            </p>
            <dl className="mt-6 grid gap-4 border-y border-primary-200 py-5 text-sm">
              <div>
                <dt className="font-semibold text-foreground">
                  Set your availability
                </dt>
                <dd className="mt-0.5 text-muted">
                  Offer only the times that work for you.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">
                  Review each request
                </dt>
                <dd className="mt-0.5 text-muted">
                  Approve a booking before it moves forward.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">
                  Submit structured feedback
                </dt>
                <dd className="mt-0.5 text-muted">
                  Give candidates clear strengths and next steps.
                </dd>
              </div>
            </dl>
            <Link
              href="/expert/application"
              className={buttonClasses({
                variant: "secondary",
                className: "mt-6",
              })}
            >
              Apply to become an expert
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:flex-row sm:items-center sm:px-6 sm:py-16">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Ready to prepare with intent?
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            Explore verified experts, then create an account when you are ready
            to request your first session.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            href="/experts"
            className={buttonClasses({ variant: "secondary" })}
          >
            Find an expert
          </Link>
          <Link href="/register" className={buttonClasses()}>
            Get started
          </Link>
        </div>
      </section>
    </main>
  );
}
