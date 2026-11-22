import Link from "next/link";

import type { ExpertFilters } from "@/lib/types";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";

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
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        className={`${inputClass} appearance-none`}
      >
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
      </select>
    </div>
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

  return (
    <form
      method="get"
      action="/experts"
      aria-label="Filter experts"
      className="rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <label htmlFor="expert-search" className={labelClass}>
            Search
          </label>
          <input
            id="expert-search"
            name="q"
            type="search"
            defaultValue={values.q ?? ""}
            placeholder="Name, role, company, or headline"
            className={inputClass}
          />
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
          label="Role they interview for"
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

        <div>
          <label htmlFor="expert-language" className={labelClass}>
            Language
          </label>
          <select
            id="expert-language"
            name="language"
            defaultValue={values.language ?? ""}
            className={`${inputClass} appearance-none`}
          >
            <option value="">All languages</option>
            {filters.languages.map((language) => (
              <option key={language.code} value={language.code}>
                {language.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <Link href="/experts" className={`${secondaryButtonClass} sm:w-auto`}>
          Clear filters
        </Link>
        <button type="submit" className={primaryButtonClass}>
          Apply filters
        </button>
      </div>
    </form>
  );
}
