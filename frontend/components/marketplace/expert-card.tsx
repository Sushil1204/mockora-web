import Link from "next/link";

import { initials } from "@/lib/labels";
import type { PublicExpert } from "@/lib/types";

function experienceLabel(years: number | null): string {
  if (years === null) return "Experience not listed";
  return `${years} ${years === 1 ? "year" : "years"} of experience`;
}

export function ExpertCard({ expert }: { expert: PublicExpert }) {
  const role = [expert.currentDesignation, expert.currentCompany]
    .filter(Boolean)
    .join(" at ");

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6 shadow-card">
      <div className="flex items-start gap-4">
        {expert.user.avatarUrl ? (
          // Avatars are user-supplied; a plain image avoids remote-host config.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={expert.user.avatarUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-primary-100 bg-primary-50 text-base font-semibold text-primary-700"
          >
            {initials(expert.user.name)}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-foreground">
            {expert.user.name}
          </h2>
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-primary-700">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-success"
            />
            Verified expert
          </p>
          {role ? <p className="mt-1 text-sm text-muted">{role}</p> : null}
        </div>
      </div>

      {expert.professionalHeadline ? (
        <p className="mt-4 text-sm font-medium leading-relaxed text-foreground">
          {expert.professionalHeadline}
        </p>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">
            Experience
          </dt>
          <dd className="mt-0.5 text-foreground">
            {experienceLabel(expert.yearsExperience)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">
            Languages
          </dt>
          <dd className="mt-0.5 text-foreground">
            {expert.languages.join(", ").toUpperCase() || "Not listed"}
          </dd>
        </div>
      </dl>

      {expert.interviewTypes.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wide text-muted">
            Interview types
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {expert.interviewTypes.map((type) => (
              <li
                key={type.id}
                className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-medium text-foreground"
              >
                {type.name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {expert.industries.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {expert.industries.map((industry) => (
            <li
              key={industry.id}
              className="rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700"
            >
              {industry.name}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto pt-6">
        <Link
          href={`/experts/${expert.id}`}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          View profile
        </Link>
      </div>
    </article>
  );
}
