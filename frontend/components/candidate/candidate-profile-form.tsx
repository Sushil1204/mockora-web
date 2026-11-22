"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { apiRequest } from "@/lib/api";
import { errorMessage, fieldErrors } from "@/lib/form-errors";
import { candidateGoalLabels, careerStageLabels } from "@/lib/labels";
import type {
  CandidateGoal,
  CandidateProfile,
  CareerStage,
  Taxonomy,
} from "@/lib/types";
import {
  cardClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "@/lib/ui";

const careerStages = Object.keys(careerStageLabels) as CareerStage[];
const goals = Object.keys(candidateGoalLabels) as CandidateGoal[];

export function CandidateProfileForm({
  profile,
  taxonomy,
}: {
  profile: CandidateProfile | null;
  taxonomy: Taxonomy;
}) {
  const router = useRouter();
  const [careerStage, setCareerStage] = useState(profile?.careerStage ?? "");
  const [industryId, setIndustryId] = useState(profile?.industry?.id ?? "");
  const [currentRoleId, setCurrentRoleId] = useState(
    profile?.currentRole?.id ?? "",
  );
  const [targetRoleId, setTargetRoleId] = useState(
    profile?.targetRole?.id ?? "",
  );
  const [yearsExperience, setYearsExperience] = useState(
    profile?.yearsExperience?.toString() ?? "",
  );
  const [targetLevelId, setTargetLevelId] = useState(
    profile?.targetLevel?.id ?? "",
  );
  const [selectedGoals, setSelectedGoals] = useState<CandidateGoal[]>(
    profile?.goals ?? [],
  );
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const fields = fieldErrors(error);

  const industry = taxonomy.industries.find((item) => item.id === industryId);
  const roles = industry?.jobRoles ?? [];

  function handleIndustryChange(nextIndustryId: string) {
    if (nextIndustryId !== industryId) {
      setCurrentRoleId("");
      setTargetRoleId("");
    }
    setIndustryId(nextIndustryId);
  }

  function toggleGoal(goal: CandidateGoal) {
    setSelectedGoals((current) =>
      current.includes(goal)
        ? current.filter((item) => item !== goal)
        : [...current, goal],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(null);
    setPending(true);

    const years =
      yearsExperience.trim() === "" ? undefined : Number(yearsExperience);

    try {
      const response = await apiRequest<{ profile: CandidateProfile }>(
        "/candidate/profile",
        {
          method: "PUT",
          body: JSON.stringify({
            ...(careerStage ? { careerStage } : {}),
            ...(industryId ? { industryId } : {}),
            ...(currentRoleId ? { currentRoleId } : {}),
            ...(targetRoleId ? { targetRoleId } : {}),
            ...(years !== undefined && Number.isFinite(years)
              ? { yearsExperience: years }
              : {}),
            ...(targetLevelId ? { targetLevelId } : {}),
            ...(selectedGoals.length > 0 ? { goals: selectedGoals } : {}),
          }),
        },
      );

      setSaved(
        response.profile.completionState === "COMPLETE"
          ? "Your candidate profile is complete."
          : "Progress saved. Complete the remaining fields to finish your profile.",
      );
      router.refresh();
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(false);
    }
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
          Where you are today
        </legend>
        <p className="-mt-2 text-sm text-muted">
          This helps experts understand your background before the interview.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="career-stage" className={labelClass}>
              Career stage
            </label>
            <select
              id="career-stage"
              name="careerStage"
              value={careerStage}
              onChange={(event) => setCareerStage(event.target.value)}
              aria-invalid={Boolean(fields.careerStage)}
              className={inputClass}
            >
              <option value="">Select your career stage</option>
              {careerStages.map((stage) => (
                <option key={stage} value={stage}>
                  {careerStageLabels[stage]}
                </option>
              ))}
            </select>
            {fields.careerStage ? (
              <p className="mt-1.5 text-sm text-error">{fields.careerStage}</p>
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
          <label htmlFor="industry" className={labelClass}>
            Industry
          </label>
          <select
            id="industry"
            name="industryId"
            value={industryId}
            onChange={(event) => handleIndustryChange(event.target.value)}
            aria-invalid={Boolean(fields.industryId)}
            className={inputClass}
          >
            <option value="">Select your industry</option>
            {taxonomy.industries.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {fields.industryId ? (
            <p className="mt-1.5 text-sm text-error">{fields.industryId}</p>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="current-role" className={labelClass}>
              Current role
            </label>
            <select
              id="current-role"
              name="currentRoleId"
              value={currentRoleId}
              onChange={(event) => setCurrentRoleId(event.target.value)}
              disabled={!industry}
              aria-invalid={Boolean(fields.currentRoleId)}
              className={inputClass}
            >
              <option value="">
                {industry
                  ? "Select your current role"
                  : "Select an industry first"}
              </option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            {fields.currentRoleId ? (
              <p className="mt-1.5 text-sm text-error">
                {fields.currentRoleId}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="target-role" className={labelClass}>
              Target role
            </label>
            <select
              id="target-role"
              name="targetRoleId"
              value={targetRoleId}
              onChange={(event) => setTargetRoleId(event.target.value)}
              disabled={!industry}
              aria-invalid={Boolean(fields.targetRoleId)}
              className={inputClass}
            >
              <option value="">
                {industry
                  ? "Select your target role"
                  : "Select an industry first"}
              </option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            {fields.targetRoleId ? (
              <p className="mt-1.5 text-sm text-error">{fields.targetRoleId}</p>
            ) : null}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t border-border pt-8">
        <legend className="text-lg font-semibold text-foreground">
          Where you are heading
        </legend>
        <p className="-mt-2 text-sm text-muted">
          We use this to match you with experts who interview for your target
          level.
        </p>

        <div>
          <label htmlFor="target-level" className={labelClass}>
            Target seniority level
          </label>
          <select
            id="target-level"
            name="targetLevelId"
            value={targetLevelId}
            onChange={(event) => setTargetLevelId(event.target.value)}
            aria-invalid={Boolean(fields.targetLevelId)}
            className={inputClass}
          >
            <option value="">Select your target level</option>
            {taxonomy.experienceLevels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </select>
          {fields.targetLevelId ? (
            <p className="mt-1.5 text-sm text-error">{fields.targetLevelId}</p>
          ) : null}
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-foreground">
            What do you want to improve?
          </legend>
          <p className="mb-3 text-sm text-muted">Select all that apply.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {goals.map((goal) => (
              <label
                key={goal}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3.5 py-3 text-sm transition-colors hover:bg-surface-muted has-checked:border-primary-300 has-checked:bg-primary-50"
              >
                <input
                  type="checkbox"
                  name="goals"
                  value={goal}
                  checked={selectedGoals.includes(goal)}
                  onChange={() => toggleGoal(goal)}
                  className="mt-0.5 h-4 w-4 accent-primary-600"
                />
                <span className="text-foreground">
                  {candidateGoalLabels[goal]}
                </span>
              </label>
            ))}
          </div>
          {fields.goals ? (
            <p className="mt-1.5 text-sm text-error">{fields.goals}</p>
          ) : null}
        </fieldset>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Saving…" : "Save profile"}
        </button>
        <p className="text-xs text-muted">
          You can update these details any time from your account.
        </p>
      </div>
    </form>
  );
}
