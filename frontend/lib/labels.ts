import type {
  BookingStatus,
  CandidateGoal,
  CareerStage,
  VerificationStatus,
} from "./types";

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

export const bookingStatusLabels: Record<BookingStatus, string> = {
  PENDING_EXPERT_APPROVAL: "Awaiting expert approval",
  APPROVED_PENDING_PAYMENT: "Approved — payment required",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
  IN_PROGRESS: "In progress",
  COMPLETED_PENDING_FEEDBACK: "Feedback pending",
  COMPLETED: "Completed",
};

export const bookingStatusStyles: Record<BookingStatus, string> = {
  PENDING_EXPERT_APPROVAL: "border-warning/20 bg-warning-soft text-warning",
  APPROVED_PENDING_PAYMENT: "border-info/20 bg-info-soft text-info",
  CONFIRMED: "border-success/20 bg-success-soft text-success",
  DECLINED: "border-error/20 bg-error-soft text-error",
  EXPIRED: "border-border bg-surface-muted text-muted",
  CANCELLED: "border-border bg-surface-muted text-muted",
  IN_PROGRESS: "border-info/20 bg-info-soft text-info",
  COMPLETED_PENDING_FEEDBACK: "border-warning/20 bg-warning-soft text-warning",
  COMPLETED: "border-success/20 bg-success-soft text-success",
};

export function formatBookingDateTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

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
