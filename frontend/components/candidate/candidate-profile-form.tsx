"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { apiRequest } from "@/lib/api";
import { errorMessage, fieldErrors } from "@/lib/form-errors";
import { candidateGoalLabels, careerStageLabels } from "@/lib/labels";
import type {
  CandidateGoal,
  CandidateProfile,
  CareerStage,
  Taxonomy,
} from "@/lib/types";

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
    <Card className="p-6 sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
        {error ? <Alert variant="danger">{errorMessage(error)}</Alert> : null}
        {saved ? <Alert variant="success">{saved}</Alert> : null}

        <fieldset className="space-y-5">
          <legend className="text-lg font-semibold tracking-tight text-foreground">
            Where you are today
          </legend>
          <p className="-mt-2 text-sm leading-relaxed text-muted">
            This helps experts understand your background before the interview.
          </p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              id="career-stage"
              label="Career stage"
              error={fields.careerStage}
            >
              <Select
                name="careerStage"
                value={careerStage}
                onChange={(event) => setCareerStage(event.target.value)}
              >
                <option value="">Select your career stage</option>
                {careerStages.map((stage) => (
                  <option key={stage} value={stage}>
                    {careerStageLabels[stage]}
                  </option>
                ))}
              </Select>
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

          <Field id="industry" label="Industry" error={fields.industryId}>
            <Select
              name="industryId"
              value={industryId}
              onChange={(event) => handleIndustryChange(event.target.value)}
            >
              <option value="">Select your industry</option>
              {taxonomy.industries.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              id="current-role"
              label="Current role"
              hint={!industry ? "Select an industry first." : undefined}
              error={fields.currentRoleId}
            >
              <Select
                name="currentRoleId"
                value={currentRoleId}
                onChange={(event) => setCurrentRoleId(event.target.value)}
                disabled={!industry}
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
              </Select>
            </Field>

            <Field
              id="target-role"
              label="Target role"
              hint={!industry ? "Select an industry first." : undefined}
              error={fields.targetRoleId}
            >
              <Select
                name="targetRoleId"
                value={targetRoleId}
                onChange={(event) => setTargetRoleId(event.target.value)}
                disabled={!industry}
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
              </Select>
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-5 border-t border-border pt-8">
          <legend className="text-lg font-semibold tracking-tight text-foreground">
            Where you are heading
          </legend>
          <p className="-mt-2 text-sm leading-relaxed text-muted">
            We use this to match you with experts who interview for your target
            level.
          </p>

          <Field
            id="target-level"
            label="Target seniority level"
            error={fields.targetLevelId}
          >
            <Select
              name="targetLevelId"
              value={targetLevelId}
              onChange={(event) => setTargetLevelId(event.target.value)}
            >
              <option value="">Select your target level</option>
              {taxonomy.experienceLevels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </Select>
          </Field>

          <fieldset>
            <legend className="text-sm font-medium text-foreground">
              What do you want to improve?
            </legend>
            <p className="mt-1 text-sm text-muted">Select all that apply.</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {goals.map((goal) => (
                <label
                  key={goal}
                  className="flex min-h-11 cursor-pointer items-start gap-3 rounded-control border border-border px-3.5 py-3 text-sm transition-colors hover:bg-surface-muted has-checked:border-primary-300 has-checked:bg-primary-50"
                >
                  <input
                    type="checkbox"
                    name="goals"
                    value={goal}
                    checked={selectedGoals.includes(goal)}
                    onChange={() => toggleGoal(goal)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary-600"
                  />
                  <span className="text-foreground">
                    {candidateGoalLabels[goal]}
                  </span>
                </label>
              ))}
            </div>
            {fields.goals ? (
              <p className="mt-1.5 text-xs font-medium text-error">
                {fields.goals}
              </p>
            ) : null}
          </fieldset>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
          <Button type="submit" loading={pending}>
            {pending ? "Saving profile…" : "Save profile"}
          </Button>
          <p className="text-xs text-muted">
            You can update these details any time from your account.
          </p>
        </div>
      </form>
    </Card>
  );
}
