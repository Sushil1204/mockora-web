"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Textarea } from "@/components/ui/field";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/cn";
import { errorMessage, fieldErrors } from "@/lib/form-errors";
import { formatDisplayDate } from "@/lib/labels";
import type { ExpertApplication, Taxonomy } from "@/lib/types";

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
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {options.map((option) => (
        <label
          key={option.id}
          className="flex min-h-11 cursor-pointer items-start gap-3 rounded-control border border-border px-3.5 py-3 text-sm transition-colors hover:bg-surface-muted has-checked:border-primary-300 has-checked:bg-primary-50"
        >
          <input
            type="checkbox"
            name={name}
            value={option.id}
            checked={selected.includes(option.id)}
            onChange={() => onToggle(option.id)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary-600"
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
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {error ? <Alert variant="danger">{errorMessage(error)}</Alert> : null}
      {saved ? <Alert variant="success">{saved}</Alert> : null}

      <FormSection
        step="01 · Public profile"
        title="Professional details"
        description="Candidates see this information on your public expert profile once an administrator approves it."
      >
        <Field
          id="professional-headline"
          label="Professional headline"
          hint="A short sentence candidates see first."
          error={fields.professionalHeadline}
        >
          <Input
            name="professionalHeadline"
            type="text"
            maxLength={150}
            placeholder="Backend engineer helping candidates prepare for senior interviews"
            value={professionalHeadline}
            onChange={(event) => setProfessionalHeadline(event.target.value)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            id="current-designation"
            label="Current designation"
            error={fields.currentDesignation}
          >
            <Input
              name="currentDesignation"
              type="text"
              maxLength={150}
              value={currentDesignation}
              onChange={(event) => setCurrentDesignation(event.target.value)}
            />
          </Field>

          <Field
            id="current-company"
            label="Current company"
            error={fields.currentCompany}
          >
            <Input
              name="currentCompany"
              type="text"
              maxLength={150}
              value={currentCompany}
              onChange={(event) => setCurrentCompany(event.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Field
            id="expert-country"
            label="Country code"
            hint="For example IN."
            error={fields.countryCode}
          >
            <Input
              name="countryCode"
              type="text"
              maxLength={2}
              placeholder="IN"
              value={countryCode}
              onChange={(event) =>
                setCountryCode(event.target.value.toUpperCase())
              }
            />
          </Field>

          <Field
            id="expert-timezone"
            label="Timezone"
            hint="For example Asia/Kolkata."
            error={fields.timezone}
          >
            <Input
              name="timezone"
              type="text"
              placeholder="Asia/Kolkata"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
            />
          </Field>

          <Field
            id="years-experience"
            label="Years of experience"
            error={fields.yearsExperience}
          >
            <Input
              name="yearsExperience"
              type="number"
              min={0}
              max={60}
              inputMode="numeric"
              value={yearsExperience}
              onChange={(event) => setYearsExperience(event.target.value)}
            />
          </Field>
        </div>

        <Field
          id="linkedin-url"
          label="LinkedIn profile"
          hint="Required before submission so administrators can verify your experience."
          error={fields.linkedinUrl}
        >
          <Input
            name="linkedinUrl"
            type="url"
            maxLength={2048}
            placeholder="https://www.linkedin.com/in/your-profile"
            value={linkedinUrl}
            onChange={(event) => setLinkedinUrl(event.target.value)}
          />
        </Field>

        <Field
          id="introduction"
          label="Professional introduction"
          hint="Describe your background and the interviews you are best placed to run."
          error={fields.introduction}
        >
          <Textarea
            name="introduction"
            rows={5}
            maxLength={3000}
            value={introduction}
            onChange={(event) => setIntroduction(event.target.value)}
            className="min-h-32 resize-y"
          />
        </Field>
      </FormSection>

      <FormSection
        step="02 · Coverage"
        title="Industries and roles"
        description="Select at least one industry. Roles and specializations are limited to the industries you choose."
      >
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Industries</p>
          <CheckboxGrid
            name="industries"
            options={taxonomy.industries}
            selected={industryIds}
            onToggle={toggleIndustry}
          />
          {fields.industryIds ? (
            <p className="mt-1.5 text-xs font-medium text-error">
              {fields.industryIds}
            </p>
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
          <p className="rounded-control border border-dashed border-border px-4 py-3 text-sm text-muted">
            Select an industry to see matching job roles and specializations.
          </p>
        )}
      </FormSection>

      <FormSection
        step="03 · Interviews"
        title="Interview expertise"
        description="Choose the formats, candidate levels, and languages you can run."
      >
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

        <Field
          id="language-codes"
          label="Languages"
          hint="Comma-separated language codes, for example en, hi, pt-BR."
          error={fields.languageCodes}
        >
          <Input
            name="languageCodes"
            type="text"
            placeholder="en, hi"
            value={languageCodes}
            onChange={(event) => setLanguageCodes(event.target.value)}
          />
        </Field>
      </FormSection>

      <FormSection
        step="04 · Track record"
        title="Professional experience"
        description="Add at least one role. Candidates never see your contact details."
        action={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="min-h-11"
            onClick={() =>
              setExperiences((current) => [...current, createExperience()])
            }
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add experience
          </Button>
        }
        contentClassName="space-y-4"
      >
        {experiences.map((experience, index) => (
          <div
            key={experience.key}
            className="rounded-card border border-border p-4 sm:p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">
                Experience {index + 1}
              </p>
              {experiences.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-11 text-error hover:text-error"
                  onClick={() =>
                    setExperiences((current) =>
                      current.filter((item) => item.key !== experience.key),
                    )
                  }
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                  Remove
                </Button>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id={`company-${experience.key}`} label="Company">
                <Input
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
                />
              </Field>

              <Field id={`designation-${experience.key}`} label="Designation">
                <Input
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
                />
              </Field>

              <Field id={`start-date-${experience.key}`} label="Start date">
                <Input
                  type="date"
                  value={experience.startDate}
                  onChange={(event) =>
                    updateExperience(
                      experience.key,
                      "startDate",
                      event.target.value,
                    )
                  }
                />
              </Field>

              <Field
                id={`end-date-${experience.key}`}
                label="End date"
                hint="Leave blank if this is your current role."
              >
                <Input
                  type="date"
                  value={experience.endDate}
                  onChange={(event) =>
                    updateExperience(
                      experience.key,
                      "endDate",
                      event.target.value,
                    )
                  }
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field
                id={`description-${experience.key}`}
                label="What did you do?"
              >
                <Textarea
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
                  className="resize-y"
                />
              </Field>
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
      </FormSection>

      <div className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface p-5 shadow-card sm:px-6">
        {mode === "application" ? (
          <>
            <Button
              type="submit"
              loading={pending === "submit"}
              disabled={pending !== null}
            >
              {pending === "submit" ? "Submitting…" : "Submit for review"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              loading={pending === "draft"}
              disabled={pending !== null}
              onClick={() => void handleSave("draft")}
            >
              {pending === "draft" ? "Saving…" : "Save draft"}
            </Button>
          </>
        ) : (
          <Button type="submit" loading={pending !== null}>
            {pending ? "Saving profile…" : "Save profile"}
          </Button>
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

function FormSection({
  step,
  title,
  description,
  action,
  contentClassName,
  children,
}: {
  step: string;
  title: string;
  description: string;
  action?: ReactNode;
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <legend className="sr-only">{title}</legend>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border bg-surface-muted/60 px-6 py-5 sm:px-8">
        <div className="min-w-0">
          <p className="text-overline font-semibold uppercase text-terracotta-600">
            {step}
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
            {description}
          </p>
        </div>
        {action}
      </div>
      <div className={cn("space-y-5 p-6 sm:p-8", contentClassName)}>
        {children}
      </div>
    </fieldset>
  );
}
