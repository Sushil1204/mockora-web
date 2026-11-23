import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookingRequestForm } from "@/components/bookings/booking-request-form";
import { AvailabilityPreview } from "@/components/marketplace/availability-preview";
import { ApiError, apiRequest } from "@/lib/api";
import { formatDisplayDate, initials } from "@/lib/labels";
import { getCurrentUser } from "@/lib/session";
import type { PublicAvailability, PublicExpertProfile } from "@/lib/types";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

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

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14"
    >
      <Link
        href="/experts"
        className="text-sm font-medium text-primary-700 hover:underline"
      >
        ← Back to all experts
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-6">
          <section className={cardClass}>
            <div className="flex flex-wrap items-start gap-5">
              {expert.user.avatarUrl ? (
                // Avatars are user-supplied; a plain image avoids remote-host config.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={expert.user.avatarUrl}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-full border border-border object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-primary-100 bg-primary-50 text-xl font-semibold text-primary-700"
                >
                  {initials(expert.user.name)}
                </span>
              )}

              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  {expert.user.name}
                </h1>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2 w-2 rounded-full bg-success"
                  />
                  Verified expert
                </p>
                {role ? (
                  <p className="mt-1 text-sm text-muted">{role}</p>
                ) : null}
                {expert.reviews.total > 0 &&
                expert.reviews.averageRating !== null ? (
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {expert.reviews.averageRating.toFixed(1)} out of 5 ·{" "}
                    {expert.reviews.total}{" "}
                    {expert.reviews.total === 1
                      ? "candidate review"
                      : "candidate reviews"}
                  </p>
                ) : null}
                {expert.professionalHeadline ? (
                  <p className="mt-3 text-base font-medium leading-relaxed text-foreground">
                    {expert.professionalHeadline}
                  </p>
                ) : null}
              </div>
            </div>

            <dl className="mt-6 grid gap-4 border-t border-border pt-6 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Experience
                </dt>
                <dd className="mt-1 text-foreground">
                  {expert.yearsExperience === null
                    ? "Not listed"
                    : `${expert.yearsExperience} ${
                        expert.yearsExperience === 1 ? "year" : "years"
                      }`}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Languages
                </dt>
                <dd className="mt-1 text-foreground">
                  {expert.languages.join(", ").toUpperCase() || "Not listed"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Based in
                </dt>
                <dd className="mt-1 text-foreground">
                  {location || "Not listed"}
                </dd>
              </div>
            </dl>

            {expert.industries.length > 0 ? (
              <ul className="mt-5 flex flex-wrap gap-2">
                {expert.industries.map((industry) => (
                  <li
                    key={industry.id}
                    className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700"
                  >
                    {industry.name}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {expert.introduction ? (
            <section className={cardClass}>
              <h2 className="text-lg font-semibold text-foreground">
                About {expert.user.name.split(" ")[0]}
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">
                {expert.introduction}
              </p>
            </section>
          ) : null}

          <section className={cardClass}>
            <h2 className="text-lg font-semibold text-foreground">
              Interview expertise
            </h2>
            <dl className="mt-4 grid gap-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Interview types
                </dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {expert.interviewTypes.length > 0 ? (
                    expert.interviewTypes.map((type) => (
                      <span
                        key={type.id}
                        className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-medium text-foreground"
                      >
                        {type.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted">Not listed</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Specializations
                </dt>
                <dd className="mt-1 text-foreground">
                  {expert.specializations.map((item) => item.name).join(", ") ||
                    "Not listed"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Roles they interview for
                </dt>
                <dd className="mt-1 text-foreground">
                  {expert.jobRoles.map((item) => item.name).join(", ") ||
                    "Not listed"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Candidate levels
                </dt>
                <dd className="mt-1 text-foreground">
                  {expert.candidateLevels
                    .map((level) => level.name)
                    .join(", ") || "Not listed"}
                </dd>
              </div>
            </dl>
          </section>

          <section className={cardClass}>
            <h2 className="text-lg font-semibold text-foreground">
              Candidate reviews
            </h2>
            {expert.reviews.total === 0 ? (
              <p className="mt-3 text-sm text-muted">
                No candidate reviews yet. Reviews come from candidates after a
                completed mock interview.
              </p>
            ) : (
              <ol className="mt-4 space-y-5">
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
          </section>

          <section className={cardClass}>
            <h2 className="text-lg font-semibold text-foreground">
              Professional experience
            </h2>
            {expert.experiences.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                No experience history has been listed.
              </p>
            ) : (
              <ol className="mt-4 space-y-5">
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
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
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
            <section className={cardClass}>
              <h2 className="text-lg font-semibold text-foreground">
                Request a mock interview
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Sessions are one-to-one and follow a booking approval flow. A
                Mockoraa account is required before a booking can be requested.
              </p>
              <Link
                href="/login"
                className={`${primaryButtonClass} mt-5 w-full`}
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
                  className="font-medium text-primary-700 hover:underline"
                >
                  Create an account
                </Link>
              </p>
            </section>
          ) : !canBook ? (
            <section className={cardClass}>
              <h2 className="text-lg font-semibold text-foreground">
                Candidate account required
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Booking requests can only be sent from a candidate account.
                Switch to your candidate account to request this expert.
              </p>
              <Link
                href="/account"
                className={`${secondaryButtonClass} mt-5 w-full`}
              >
                Go to your account
              </Link>
            </section>
          ) : !availability ? (
            <section className={cardClass}>
              <h2 className="text-lg font-semibold text-foreground">
                Availability unavailable
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                We could not load this expert&apos;s open times. Refresh the
                page and try again.
              </p>
            </section>
          ) : null}

          <p className="rounded-2xl border border-border bg-surface-muted p-5 text-xs leading-relaxed text-muted">
            Requesting a time does not charge you. A booking is confirmed only
            after the expert approves it and payment succeeds; payments are not
            enabled yet.
          </p>
        </aside>
      </div>
    </main>
  );
}
