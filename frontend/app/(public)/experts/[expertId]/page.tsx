import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Languages,
  MapPin,
  Star,
} from "lucide-react";

import { BookingRequestForm } from "@/components/bookings/booking-request-form";
import { AvailabilityPreview } from "@/components/marketplace/availability-preview";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiRequest, ApiError } from "@/lib/api";
import { formatDisplayDate } from "@/lib/labels";
import { getCurrentUser } from "@/lib/session";
import type { PublicAvailability, PublicExpertProfile } from "@/lib/types";

export const metadata: Metadata = {
  title: "Expert profile",
};

function currentRole(expert: PublicExpertProfile): string {
  return [expert.currentDesignation, expert.currentCompany]
    .filter(Boolean)
    .join(" at ");
}

export default async function ExpertProfilePage({
  params,
}: {
  params: Promise<{ expertId: string }>;
}) {
  const { expertId } = await params;

  let expert: PublicExpertProfile;

  try {
    const response = await apiRequest<{ expert: PublicExpertProfile }>(
      `/experts/${expertId}`,
      { cache: "no-store" },
    );
    expert = response.expert;
  } catch (error) {
    if (error instanceof ApiError && [400, 404].includes(error.status)) {
      notFound();
    }
    throw error;
  }

  const today = new Date();
  const from = today.toISOString().slice(0, 10);
  const to = new Date(today.getTime() + 13 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [user, availability] = await Promise.all([
    getCurrentUser(),
    apiRequest<PublicAvailability>(
      `/experts/${expertId}/availability?from=${from}&to=${to}`,
      { cache: "no-store" },
    ).catch(() => null),
  ]);
  const role = currentRole(expert);
  const canBook = user?.roles.includes("CANDIDATE") ?? false;
  const location = [expert.countryCode, expert.timezone]
    .filter(Boolean)
    .join(" · ");
  const hasReviews =
    expert.reviews.total > 0 && expert.reviews.averageRating !== null;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12"
    >
      <Link
        href="/experts"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-control text-sm font-medium text-primary-700 underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        All experts
      </Link>

      <section className="mt-4 overflow-hidden rounded-panel border border-border bg-surface shadow-card">
        <div className="relative overflow-hidden bg-primary-900 px-5 py-7 text-white sm:px-8 sm:py-9">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/10 bg-white/5"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-28 right-16 h-52 w-52 rounded-full bg-terracotta-500/10 blur-2xl"
          />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
            <Avatar
              name={expert.user.name}
              src={expert.user.avatarUrl}
              size="xl"
              className="h-20 w-20 border-2 border-white/20 sm:h-24 sm:w-24"
            />

            <div className="min-w-0">
              <Badge
                variant="brand"
                className="gap-1 border-white/20 bg-white/10 px-2.5 py-1 text-primary-100"
              >
                <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
                Verified expert
              </Badge>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                {expert.user.name}
              </h1>

              {role ? (
                <p className="mt-1 text-sm font-medium text-primary-100">
                  {role}
                </p>
              ) : null}

              {hasReviews ? (
                <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary-100">
                  <Star
                    aria-hidden="true"
                    className="h-4 w-4 fill-terracotta-300 text-terracotta-300"
                  />
                  {expert.reviews.averageRating!.toFixed(1)} out of 5 ·{" "}
                  {expert.reviews.total}{" "}
                  {expert.reviews.total === 1
                    ? "candidate review"
                    : "candidate reviews"}
                </p>
              ) : null}
            </div>
          </div>

          {expert.professionalHeadline ? (
            <p className="relative mt-6 max-w-3xl border-t border-white/15 pt-5 text-base font-medium leading-relaxed text-white sm:text-lg">
              {expert.professionalHeadline}
            </p>
          ) : null}
        </div>

        <dl className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="px-5 py-4 sm:px-6">
            <dt className="flex items-center gap-2 text-xs font-medium text-muted">
              <BriefcaseBusiness aria-hidden="true" className="h-4 w-4" />
              Experience
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {expert.yearsExperience === null
                ? "Not listed"
                : `${expert.yearsExperience} ${
                    expert.yearsExperience === 1 ? "year" : "years"
                  }`}
            </dd>
          </div>
          <div className="px-5 py-4 sm:px-6">
            <dt className="flex items-center gap-2 text-xs font-medium text-muted">
              <Languages aria-hidden="true" className="h-4 w-4" />
              Languages
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {expert.languages.join(", ") || "Not listed"}
            </dd>
          </div>
          <div className="px-5 py-4 sm:px-6">
            <dt className="flex items-center gap-2 text-xs font-medium text-muted">
              <MapPin aria-hidden="true" className="h-4 w-4" />
              Based in
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {location || "Not listed"}
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="space-y-6">
          {expert.introduction ? (
            <Card className="p-5 sm:p-6">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                About {expert.user.name.split(" ")[0]}
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">
                {expert.introduction}
              </p>
            </Card>
          ) : null}

          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Interview expertise
            </h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-medium text-muted">
                  Interview types
                </h3>
                {expert.interviewTypes.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {expert.interviewTypes.map((type) => (
                      <li key={type.id}>
                        <Badge variant="neutral">{type.name}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-foreground">Not listed</p>
                )}
              </div>

              <div>
                <h3 className="text-xs font-medium text-muted">Focus areas</h3>
                {expert.industries.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {expert.industries.map((industry) => (
                      <li key={industry.id}>
                        <Badge variant="brand">{industry.name}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-foreground">Not listed</p>
                )}
              </div>

              <div>
                <h3 className="text-xs font-medium text-muted">
                  Specializations
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-foreground">
                  {expert.specializations.map((item) => item.name).join(", ") ||
                    "Not listed"}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-medium text-muted">
                  Roles they interview for
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-foreground">
                  {expert.jobRoles.map((item) => item.name).join(", ") ||
                    "Not listed"}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-medium text-muted">
                  Candidate levels
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-foreground">
                  {expert.candidateLevels
                    .map((level) => level.name)
                    .join(", ") || "Not listed"}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Candidate reviews
              </h2>
              {hasReviews ? (
                <Badge variant="neutral" className="gap-1">
                  <Star
                    aria-hidden="true"
                    className="h-3.5 w-3.5 fill-warning text-warning"
                  />
                  {expert.reviews.averageRating!.toFixed(1)} average
                </Badge>
              ) : null}
            </div>

            {expert.reviews.total === 0 ? (
              <p className="mt-3 rounded-control border border-dashed border-border px-4 py-3 text-sm leading-relaxed text-muted">
                No candidate reviews yet. Reviews come from candidates after a
                completed mock interview.
              </p>
            ) : (
              <ol className="mt-5 space-y-5">
                {expert.reviews.items.map((review) => (
                  <li
                    key={review.id}
                    className="border-l-2 border-primary-100 pl-4"
                  >
                    <p className="text-sm font-semibold text-foreground">
                      {review.rating} out of 5
                    </p>
                    {review.comment ? (
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted">
                        {review.comment}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted">
                      Verified candidate ·{" "}
                      {new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                      }).format(new Date(review.createdAt))}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Professional experience
            </h2>
            {expert.experiences.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                No experience history has been listed.
              </p>
            ) : (
              <ol className="mt-5 space-y-5">
                {expert.experiences.map((experience) => (
                  <li
                    key={experience.id ?? experience.company}
                    className="border-l-2 border-primary-100 pl-4"
                  >
                    <p className="font-medium text-foreground">
                      {experience.designation}
                    </p>
                    <p className="text-sm text-muted">{experience.company}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDisplayDate(experience.startDate)} –{" "}
                      {experience.endDate
                        ? formatDisplayDate(experience.endDate)
                        : "Present"}
                    </p>
                    {experience.description ? (
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        {experience.description}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24">
          {canBook && availability ? (
            <BookingRequestForm
              expertProfileId={expert.id}
              expertName={expert.user.name}
              availability={availability}
            />
          ) : (
            <AvailabilityPreview availability={availability} />
          )}

          {!user ? (
            <Card className="p-5 sm:p-6">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Request a mock interview
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Sessions are one-to-one and follow a booking approval flow. A
                Mockoraa account is required before a booking can be requested.
              </p>
              <Link
                href="/login"
                className={buttonClasses({ className: "mt-5 w-full" })}
              >
                Sign in to request a booking
              </Link>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                Browsing is open to everyone. Sign in is required before any
                booking request can be sent.
              </p>
              <p className="mt-3 text-sm text-muted">
                New to Mockoraa?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-primary-700 underline-offset-4 hover:underline"
                >
                  Create an account
                </Link>
              </p>
            </Card>
          ) : !canBook ? (
            <Card className="p-5 sm:p-6">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Candidate account required
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Booking requests can only be sent from a candidate account.
                Switch to your candidate account to request this expert.
              </p>
              <Link
                href="/account"
                className={buttonClasses({
                  variant: "secondary",
                  className: "mt-5 w-full",
                })}
              >
                Go to your account
              </Link>
            </Card>
          ) : !availability ? (
            <Card className="p-5 sm:p-6">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Availability unavailable
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                We could not load this expert&apos;s open times. Refresh the
                page and try again.
              </p>
            </Card>
          ) : null}

          <div className="flex gap-3 rounded-card border border-border bg-surface-muted p-4 text-xs leading-relaxed text-muted">
            <CalendarDays
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-primary-700"
            />
            <p>
              Requesting a time does not charge you. A booking is confirmed only
              after the expert approves it and payment succeeds; payments are
              not enabled yet.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
