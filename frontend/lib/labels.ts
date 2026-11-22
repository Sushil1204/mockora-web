import type { CandidateGoal, CareerStage, VerificationStatus } from "./types";

export const careerStageLabels: Record<CareerStage, string> = {
  STUDENT: "Student",
  FRESHER: "Fresher",
  EARLY_CAREER: "Early career",
  MID_CAREER: "Mid career",
  SENIOR: "Senior professional",
  CAREER_SWITCHER: "Career switcher",
};

export const candidateGoalLabels: Record<CandidateGoal, string> = {
  TECHNICAL_KNOWLEDGE: "Technical or domain knowledge",
  COMMUNICATION: "Communication",
  PROBLEM_SOLVING: "Problem solving",
  CONFIDENCE: "Confidence",
  BEHAVIORAL: "Behavioral interviewing",
  LEADERSHIP: "Leadership",
  OVERALL_PREPARATION: "Overall interview preparation",
};

export const verificationStatusLabels: Record<VerificationStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Changes requested",
  SUSPENDED: "Suspended",
};

export const verificationStatusStyles: Record<VerificationStatus, string> = {
  DRAFT: "border-border bg-surface-muted text-muted",
  SUBMITTED: "border-info/20 bg-info-soft text-info",
  UNDER_REVIEW: "border-warning/20 bg-warning-soft text-warning",
  APPROVED: "border-success/20 bg-success-soft text-success",
  REJECTED: "border-error/20 bg-error-soft text-error",
  SUSPENDED: "border-error/20 bg-error-soft text-error",
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDisplayDate(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString("en", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
