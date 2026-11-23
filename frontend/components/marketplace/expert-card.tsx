import Link from "next/link";
import { ArrowRight, BadgeCheck } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { PublicExpert } from "@/lib/types";

function experienceLabel(years: number | null): string {
  if (years === null) return "Not listed";
  return `${years} ${years === 1 ? "year" : "years"}`;
}

export function ExpertCard({ expert }: { expert: PublicExpert }) {
  const role = [expert.currentDesignation, expert.currentCompany]
    .filter(Boolean)
    .join(" at ");

  return (
    <article className="h-full">
      <Card className="group flex h-full flex-col p-5 transition-colors hover:border-primary-200 sm:p-6">
        <div className="flex items-start gap-4">
          <Avatar
            name={expert.user.name}
            src={expert.user.avatarUrl}
            size="lg"
          />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">
              {expert.user.name}
            </h2>
            <Badge variant="success" className="mt-1.5 gap-1 px-2 py-0.5">
              <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
              Verified
            </Badge>
            {role ? (
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {role}
              </p>
            ) : null}
          </div>
        </div>

        {expert.professionalHeadline ? (
          <p className="mt-4 text-sm font-medium leading-relaxed text-foreground">
            {expert.professionalHeadline}
          </p>
        ) : null}

        <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-border py-4 text-sm">
          <div>
            <dt className="text-xs font-medium text-muted">Experience</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {experienceLabel(expert.yearsExperience)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-medium text-muted">Languages</dt>
            <dd className="mt-0.5 truncate font-medium text-foreground">
              {expert.languages.join(", ") || "Not listed"}
            </dd>
          </div>
        </dl>

        {expert.interviewTypes.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-medium text-muted">Interview types</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {expert.interviewTypes.map((type) => (
                <li key={type.id}>
                  <Badge variant="neutral" className="px-2 py-0.5">
                    {type.name}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {expert.industries.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {expert.industries.map((industry) => (
              <li key={industry.id}>
                <Badge variant="brand" className="px-2 py-0.5">
                  {industry.name}
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-auto pt-5">
          <Link
            href={`/experts/${expert.id}`}
            className={buttonClasses({
              variant: "secondary",
              className: "w-full group-hover:border-primary-300",
            })}
          >
            View profile
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </Card>
    </article>
  );
}
