"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { apiRequest } from "@/lib/api";
import { errorMessage, fieldErrors } from "@/lib/form-errors";
import { formatDisplayDate } from "@/lib/labels";
import type { ExpertApplication, Taxonomy } from "@/lib/types";
import {
  cardClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";

type ExperienceEditor = {
  key: string;
  company: string;
  designation: string;
  startDate: string;
  endDate: string;
  description: string;
};

let experienceKey = 0;

function createExperience(): ExperienceEditor {
  experienceKey += 1;
  return {
    key: `experience-${experienceKey}`,
    company: "",
    designation: "",
    startDate: "",
    endDate: "",
    description: "",
  };
}

function CheckboxGrid({
  name,
  options,
  selected,
  onToggle,
}: {
  name: string;
  options: Array<{ id: string; name: string }>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => (
        <label
          key={option.id}
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3.5 py-3 text-sm transition-colors hover:bg-surface-muted has-checked:border-primary-300 has-checked:bg-primary-50"
        >
          <input
            type="checkbox"
            name={name}
            value={option.id}
            checked={selected.includes(option.id)}
            onChange={() => onToggle(option.id)}
            className="mt-0.5 h-4 w-4 accent-primary-600"
          />
          <span className="text-foreground">{option.name}</span>
        </label>
      ))}
    </div>
  );
}

export function ExpertApplicationForm({
  application,
  taxonomy,
  mode = "application",
  defaultCountryCode,
}: {
  application: ExpertApplication | null;
  taxonomy: Taxonomy;
  mode?: "application" | "profile";
  defaultCountryCode?: string | null;
}) {
  const router = useRouter();
  const endpoint =
    mode === "profile" ? "/expert/profile" : "/expert/application";

  const [professionalHeadline, setProfessionalHeadline] = useState(
    application?.professionalHeadline ?? "",
  );
  const [currentDesignation, setCurrentDesignation] = useState(
    application?.currentDesignation ?? "",
  );
  const [currentCompany, setCurrentCompany] = useState(
    application?.currentCompany ?? "",
  );
  const [countryCode, setCountryCode] = useState(
    application?.countryCode ?? defaultCountryCode ?? "",
  );
  const [timezone, setTimezone] = useState(application?.timezone ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(
    application?.linkedinUrl ?? "",
  );
  const [introduction, setIntroduction] = useState(
    application?.introduction ?? "",
  );
  const [yearsExperience, setYearsExperience] = useState(
    application?.yearsExperience?.toString() ?? "",
  );
  const [industryIds, setIndustryIds] = useState(
    application?.industries.map((industry) => industry.id) ?? [],
  );
  const [specializationIds, setSpecializationIds] = useState(
    application?.specializations.map((item) => item.id) ?? [],
  );
  const [interviewTypeIds, setInterviewTypeIds] = useState(
    application?.interviewTypes.map((item) => item.id) ?? [],
  );
  const [jobRoleIds, setJobRoleIds] = useState(
    application?.jobRoles.map((item) => item.id) ?? [],
  );
  const [candidateLevelIds, setCandidateLevelIds] = useState(
    application?.candidateLevels.map((item) => item.id) ?? [],
  );
  const [languageCodes, setLanguageCodes] = useState(
    application?.languages.join(", ") ?? "",
  );
  const [experiences, setExperiences] = useState<ExperienceEditor[]>(
    application && application.experiences.length > 0
      ? application.experiences.map((experience) => ({
          key: experience.id ?? `saved-${experience.company}`,
          company: experience.company,
          designation: experience.designation,
          startDate: experience.startDate,
          endDate: experience.endDate ?? "",
          description: experience.description ?? "",
        }))
      : [createExperience()],
  );
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState<"draft" | "submit" | null>(null);
  const fields = fieldErrors(error);

  const selectedIndustries = taxonomy.industries.filter((industry) =>
    industryIds.includes(industry.id),
  );
  const specializationOptions = selectedIndustries.flatMap((industry) =>
    industry.specializations.map((item) => ({
      ...item,
      industryName: industry.name,
    })),
  );
  const jobRoleOptions = selectedIndustries.flatMap((industry) =>
    industry.jobRoles.map((item) => ({
      ...item,
      industryName: industry.name,
    })),
  );

  function toggle(
    id: string,
    selected: string[],
    setSelected: (next: string[]) => void,
  ) {
    setSelected(
      selected.includes(id)
        ? selected.filter((item) => item !== id)
        : [...selected, id],
    );
  }

  function toggleIndustry(id: string) {
    if (industryIds.includes(id)) {
      const industry = taxonomy.industries.find((item) => item.id === id);
      const roleIds = new Set(industry?.jobRoles.map((role) => role.id) ?? []);
      const specializationIdsInIndustry = new Set(
        industry?.specializations.map((item) => item.id) ?? [],
      );

      setIndustryIds(industryIds.filter((item) => item !== id));
      setJobRoleIds(jobRoleIds.filter((roleId) => !roleIds.has(roleId)));
      setSpecializationIds(
        specializationIds.filter(
          (specializationId) =>
            !specializationIdsInIndustry.has(specializationId),
        ),
      );
    } else {
      setIndustryIds([...industryIds, id]);
    }
  }

  function updateExperience(
    key: string,
    field: keyof Omit<ExperienceEditor, "key">,
    value: string,
  ) {
    setExperiences((current) =>
      current.map((experience) =>
        experience.key === key ? { ...experience, [field]: value } : experience,
      ),
    );
  }

  function buildPayload(): Record<string, unknown> {
    const trimmedYears = yearsExperience.trim();
    const years = trimmedYears === "" ? null : Number(trimmedYears);

    return {
      ...(professionalHeadline.trim()
        ? { professionalHeadline: professionalHeadline.trim() }
        : {}),
      ...(currentDesignation.trim()
        ? { currentDesignation: currentDesignation.trim() }
        : {}),
      ...(currentCompany.trim()
        ? { currentCompany: currentCompany.trim() }
        : {}),
      ...(countryCode.trim() ? { countryCode: countryCode.trim() } : {}),
      ...(timezone.trim() ? { timezone: timezone.trim() } : {}),
      ...(linkedinUrl.trim() ? { linkedinUrl: linkedinUrl.trim() } : {}),
      ...(introduction.trim() ? { introduction: introduction.trim() } : {}),
      ...(years !== null && Number.isFinite(years)
        ? { yearsExperience: years }
        : {}),
      industryIds,
      specializationIds,
      interviewTypeIds,
      jobRoleIds,
      candidateLevelIds,
      languageCodes: languageCodes
        .split(",")
        .map((code) => code.trim())
        .filter(Boolean),
      experiences: experiences
        .filter(
          (experience) =>
            experience.company.trim() &&
            experience.designation.trim() &&
            experience.startDate,
        )
        .map((experience) => ({
          company: experience.company.trim(),
          designation: experience.designation.trim(),
          startDate: experience.startDate,
          endDate: experience.endDate || null,
          description: experience.description.trim() || null,
        })),
    };
  }

  async function handleSave(action: "draft" | "submit") {
    setError(null);
    setSaved(null);
    setPending(action);

    try {
      await apiRequest(endpoint, {
        method: "PATCH",
        body: JSON.stringify(buildPayload()),
      });

      if (action === "submit") {
        await apiRequest(`${endpoint}`, { method: "POST" });
        setSaved(
          "Application submitted. An administrator will review it before your profile becomes visible.",
        );
      } else {
        setSaved(
          mode === "profile"
            ? "Profile updated."
            : "Draft saved. Submit when your application is ready for review.",
        );
      }

      router.refresh();
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSave(mode === "profile" ? "draft" : "submit");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`${cardClass} space-y-8`}
      noValidate
    >
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-error/20 bg-error-soft px-4 py-3 text-sm text-error"
        >
          {errorMessage(error)}
        </div>
      ) : null}

      {saved ? (
        <div
          role="status"
          className="rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-sm text-foreground"
        >
          {saved}
        </div>
      ) : null}

      <fieldset className="space-y-5">
        <legend className="text-lg font-semibold text-foreground">
          Professional details
        </legend>
        <p className="-mt-2 text-sm text-muted">
          Candidates see this information on your public expert profile once an
          administrator approves it.
        </p>

        <div>
          <label htmlFor="professional-headline" className={labelClass}>
            Professional headline
          </label>
          <input
            id="professional-headline"
            name="professionalHeadline"
            type="text"
            maxLength={150}
            placeholder="Backend engineer helping candidates prepare for senior interviews"
            value={professionalHeadline}
            onChange={(event) => setProfessionalHeadline(event.target.value)}
            aria-invalid={Boolean(fields.professionalHeadline)}
            className={inputClass}
          />
          {fields.professionalHeadline ? (
            <p className="mt-1.5 text-sm text-error">
              {fields.professionalHeadline}
            </p>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="current-designation" className={labelClass}>
              Current designation
            </label>
            <input
              id="current-designation"
              name="currentDesignation"
              type="text"
              maxLength={150}
              value={currentDesignation}
              onChange={(event) => setCurrentDesignation(event.target.value)}
              aria-invalid={Boolean(fields.currentDesignation)}
              className={inputClass}
            />
            {fields.currentDesignation ? (
              <p className="mt-1.5 text-sm text-error">
                {fields.currentDesignation}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="current-company" className={labelClass}>
              Current company
            </label>
            <input
              id="current-company"
              name="currentCompany"
              type="text"
              maxLength={150}
              value={currentCompany}
              onChange={(event) => setCurrentCompany(event.target.value)}
              aria-invalid={Boolean(fields.currentCompany)}
              className={inputClass}
            />
            {fields.currentCompany ? (
              <p className="mt-1.5 text-sm text-error">
                {fields.currentCompany}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="expert-country" className={labelClass}>
              Country code
            </label>
            <input
              id="expert-country"
              name="countryCode"
              type="text"
              maxLength={2}
              placeholder="IN"
              value={countryCode}
              onChange={(event) =>
                setCountryCode(event.target.value.toUpperCase())
              }
              aria-invalid={Boolean(fields.countryCode)}
              className={inputClass}
            />
            {fields.countryCode ? (
              <p className="mt-1.5 text-sm text-error">{fields.countryCode}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="expert-timezone" className={labelClass}>
              Timezone
            </label>
            <input
              id="expert-timezone"
              name="timezone"
              type="text"
              placeholder="Asia/Kolkata"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              aria-invalid={Boolean(fields.timezone)}
              className={inputClass}
            />
            {fields.timezone ? (
              <p className="mt-1.5 text-sm text-error">{fields.timezone}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="years-experience" className={labelClass}>
              Years of experience
            </label>
            <input
              id="years-experience"
              name="yearsExperience"
              type="number"
              min={0}
              max={60}
              inputMode="numeric"
              value={yearsExperience}
              onChange={(event) => setYearsExperience(event.target.value)}
              aria-invalid={Boolean(fields.yearsExperience)}
              className={inputClass}
            />
            {fields.yearsExperience ? (
              <p className="mt-1.5 text-sm text-error">
                {fields.yearsExperience}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <label htmlFor="linkedin-url" className={labelClass}>
            LinkedIn profile
          </label>
          <input
            id="linkedin-url"
            name="linkedinUrl"
            type="url"
            maxLength={2048}
            placeholder="https://www.linkedin.com/in/your-profile"
            value={linkedinUrl}
            onChange={(event) => setLinkedinUrl(event.target.value)}
            aria-invalid={Boolean(fields.linkedinUrl)}
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-muted">
            Required before submission so administrators can verify your
            experience.
          </p>
          {fields.linkedinUrl ? (
            <p className="mt-1.5 text-sm text-error">{fields.linkedinUrl}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="introduction" className={labelClass}>
            Professional introduction
          </label>
          <textarea
            id="introduction"
            name="introduction"
            rows={5}
            maxLength={3000}
            value={introduction}
            onChange={(event) => setIntroduction(event.target.value)}
            aria-invalid={Boolean(fields.introduction)}
            className={`${inputClass} min-h-32 resize-y`}
          />
          <p className="mt-1.5 text-xs text-muted">
            Describe your background and the interviews you are best placed to
            run.
          </p>
          {fields.introduction ? (
            <p className="mt-1.5 text-sm text-error">{fields.introduction}</p>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t border-border pt-8">
        <legend className="text-lg font-semibold text-foreground">
          Industries and roles
        </legend>
        <p className="-mt-2 text-sm text-muted">
          Select at least one industry. Roles and specializations are limited to
          the industries you choose.
        </p>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Industries</p>
          <CheckboxGrid
            name="industries"
            options={taxonomy.industries}
            selected={industryIds}
            onToggle={toggleIndustry}
          />
          {fields.industryIds ? (
            <p className="mt-1.5 text-sm text-error">{fields.industryIds}</p>
          ) : null}
        </div>

        {selectedIndustries.length > 0 ? (
          <>
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                Job roles you can interview for
              </p>
              <CheckboxGrid
                name="jobRoles"
                options={jobRoleOptions}
                selected={jobRoleIds}
                onToggle={(id) => toggle(id, jobRoleIds, setJobRoleIds)}
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                Specializations
              </p>
              <CheckboxGrid
                name="specializations"
                options={specializationOptions}
                selected={specializationIds}
                onToggle={(id) =>
                  toggle(id, specializationIds, setSpecializationIds)
                }
              />
            </div>
          </>
        ) : (
          <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">
            Select an industry to see matching job roles and specializations.
          </p>
        )}
      </fieldset>

      <fieldset className="space-y-5 border-t border-border pt-8">
        <legend className="text-lg font-semibold text-foreground">
          Interview expertise
        </legend>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">
            Interview types
          </p>
          <CheckboxGrid
            name="interviewTypes"
            options={taxonomy.interviewTypes}
            selected={interviewTypeIds}
            onToggle={(id) => toggle(id, interviewTypeIds, setInterviewTypeIds)}
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">
            Candidate levels you can interview
          </p>
          <CheckboxGrid
            name="candidateLevels"
            options={taxonomy.experienceLevels}
            selected={candidateLevelIds}
            onToggle={(id) =>
              toggle(id, candidateLevelIds, setCandidateLevelIds)
            }
          />
        </div>

        <div>
          <label htmlFor="language-codes" className={labelClass}>
            Languages
          </label>
          <input
            id="language-codes"
            name="languageCodes"
            type="text"
            placeholder="en, hi"
            value={languageCodes}
            onChange={(event) => setLanguageCodes(event.target.value)}
            aria-invalid={Boolean(fields.languageCodes)}
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-muted">
            Comma-separated language codes, for example en, hi, pt-BR.
          </p>
          {fields.languageCodes ? (
            <p className="mt-1.5 text-sm text-error">{fields.languageCodes}</p>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-border pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <legend className="text-lg font-semibold text-foreground">
              Professional experience
            </legend>
            <p className="mt-1 text-sm text-muted">
              Add at least one role. Candidates never see your contact details.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setExperiences((current) => [...current, createExperience()])
            }
            className={`${secondaryButtonClass} h-10 px-4`}
          >
            Add experience
          </button>
        </div>

        {experiences.map((experience, index) => (
          <div
            key={experience.key}
            className="rounded-xl border border-border p-4 sm:p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">
                Experience {index + 1}
              </p>
              {experiences.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setExperiences((current) =>
                      current.filter((item) => item.key !== experience.key),
                    )
                  }
                  className="text-sm font-medium text-error hover:underline"
                >
                  Remove
                </button>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={`company-${experience.key}`}
                  className={labelClass}
                >
                  Company
                </label>
                <input
                  id={`company-${experience.key}`}
                  type="text"
                  maxLength={150}
                  value={experience.company}
                  onChange={(event) =>
                    updateExperience(
                      experience.key,
                      "company",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor={`designation-${experience.key}`}
                  className={labelClass}
                >
                  Designation
                </label>
                <input
                  id={`designation-${experience.key}`}
                  type="text"
                  maxLength={150}
                  value={experience.designation}
                  onChange={(event) =>
                    updateExperience(
                      experience.key,
                      "designation",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor={`start-date-${experience.key}`}
                  className={labelClass}
                >
                  Start date
                </label>
                <input
                  id={`start-date-${experience.key}`}
                  type="date"
                  value={experience.startDate}
                  onChange={(event) =>
                    updateExperience(
                      experience.key,
                      "startDate",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor={`end-date-${experience.key}`}
                  className={labelClass}
                >
                  End date
                </label>
                <input
                  id={`end-date-${experience.key}`}
                  type="date"
                  value={experience.endDate}
                  onChange={(event) =>
                    updateExperience(
                      experience.key,
                      "endDate",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs text-muted">
                  Leave blank if this is your current role.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label
                htmlFor={`description-${experience.key}`}
                className={labelClass}
              >
                What did you do?
              </label>
              <textarea
                id={`description-${experience.key}`}
                rows={3}
                maxLength={2000}
                value={experience.description}
                onChange={(event) =>
                  updateExperience(
                    experience.key,
                    "description",
                    event.target.value,
                  )
                }
                className={`${inputClass} resize-y`}
              />
            </div>

            {experience.startDate ? (
              <p className="mt-3 text-xs text-muted">
                {formatDisplayDate(experience.startDate)} –{" "}
                {experience.endDate
                  ? formatDisplayDate(experience.endDate)
                  : "Present"}
              </p>
            ) : null}
          </div>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        {mode === "application" ? (
          <>
            <button
              type="submit"
              disabled={pending !== null}
              className={primaryButtonClass}
            >
              {pending === "submit" ? "Submitting…" : "Submit for review"}
            </button>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => void handleSave("draft")}
              className={secondaryButtonClass}
            >
              {pending === "draft" ? "Saving…" : "Save draft"}
            </button>
          </>
        ) : (
          <button
            type="submit"
            disabled={pending !== null}
            className={primaryButtonClass}
          >
            {pending ? "Saving…" : "Save profile"}
          </button>
        )}
        <p className="text-xs text-muted">
          {mode === "application"
            ? "An administrator reviews every application before it is published."
            : "Updates to an approved profile keep your verification status."}
        </p>
      </div>
    </form>
  );
}
