import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import type { ExpertFilters } from "@/lib/types";

export type ExpertFilterValues = {
  q?: string;
  industryId?: string;
  specializationId?: string;
  interviewTypeId?: string;
  jobRoleId?: string;
  levelId?: string;
  language?: string;
};

type SelectOption = { id: string; name: string; industryId?: string };

function FilterSelect({
  id,
  label,
  name,
  options,
  defaultValue,
  placeholder,
  groups,
}: {
  id: string;
  label: string;
  name: string;
  options?: SelectOption[];
  defaultValue?: string;
  placeholder: string;
  groups?: Array<{ label: string; options: SelectOption[] }>;
}) {
  return (
    <Field id={id} label={label}>
      <Select name={name} defaultValue={defaultValue ?? ""}>
        <option value="">{placeholder}</option>
        {groups
          ? groups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </optgroup>
            ))
          : options?.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
      </Select>
    </Field>
  );
}

export function ExpertFiltersForm({
  filters,
  values,
}: {
  filters: ExpertFilters;
  values: ExpertFilterValues;
}) {
  const specializationsByIndustry = filters.industries
    .map((industry) => ({
      label: industry.name,
      options: filters.specializations.filter(
        (specialization) => specialization.industryId === industry.id,
      ),
    }))
    .filter((group) => group.options.length > 0);

  const rolesByIndustry = filters.industries
    .map((industry) => ({
      label: industry.name,
      options: filters.jobRoles.filter(
        (role) => role.industryId === industry.id,
      ),
    }))
    .filter((group) => group.options.length > 0);

  const activeCount = Object.values(values).filter(Boolean).length;

  return (
    <Card className="p-5 sm:p-6">
      <form method="get" action="/experts" aria-label="Filter experts">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-control bg-primary-50 text-primary-700">
              <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Filter experts
              </h2>
              <p className="text-xs text-muted">
                Narrow the marketplace by what matters for your interview.
              </p>
            </div>
          </div>
          {activeCount > 0 ? (
            <Badge variant="brand">
              {activeCount} {activeCount === 1 ? "filter" : "filters"} active
            </Badge>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
            <label
              htmlFor="expert-search"
              className="block text-sm font-medium text-foreground"
            >
              Search
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              />
              <Input
                id="expert-search"
                name="q"
                type="search"
                defaultValue={values.q ?? ""}
                placeholder="Name, role, company, or headline"
                className="pl-10"
              />
            </div>
          </div>

          <FilterSelect
            id="expert-industry"
            label="Industry"
            name="industryId"
            options={filters.industries}
            defaultValue={values.industryId}
            placeholder="All industries"
          />

          <FilterSelect
            id="expert-specialization"
            label="Specialization"
            name="specializationId"
            groups={specializationsByIndustry}
            defaultValue={values.specializationId}
            placeholder="All specializations"
          />

          <FilterSelect
            id="expert-interview-type"
            label="Interview type"
            name="interviewTypeId"
            options={filters.interviewTypes}
            defaultValue={values.interviewTypeId}
            placeholder="All interview types"
          />

          <FilterSelect
            id="expert-role"
            label="Role"
            name="jobRoleId"
            groups={rolesByIndustry}
            defaultValue={values.jobRoleId}
            placeholder="All roles"
          />

          <FilterSelect
            id="expert-level"
            label="Candidate level"
            name="levelId"
            options={filters.experienceLevels}
            defaultValue={values.levelId}
            placeholder="All levels"
          />

          <Field id="expert-language" label="Language">
            <Select name="language" defaultValue={values.language ?? ""}>
              <option value="">All languages</option>
              {filters.languages.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/experts"
            className={buttonClasses({
              variant: "ghost",
              className: "sm:w-auto",
            })}
          >
            Clear filters
          </Link>
          <button
            type="submit"
            className={buttonClasses({
              className: "w-full sm:w-auto",
            })}
          >
            <Search aria-hidden="true" className="h-4 w-4" />
            Apply filters
          </button>
        </div>
      </form>
    </Card>
  );
}
