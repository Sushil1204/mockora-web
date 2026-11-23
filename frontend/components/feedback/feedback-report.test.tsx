import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { FeedbackReport } from "@/lib/types";

import { FeedbackReportView } from "./feedback-report";

const report: FeedbackReport = {
  id: "report-1",
  bookingId: "booking-1",
  overallSummary:
    "A well-prepared interview with clear examples and steady reasoning.",
  strengths: "Explains trade-offs clearly and structures answers well.",
  improvementAreas: "Add measurable outcomes when describing past projects.",
  recommendations: "Practice two more system design interviews.",
  submittedAt: "2026-11-23T08:00:00.000Z",
  template: { id: "template-1", name: "Mock interview evaluation", version: 1 },
  averageScore: 4.5,
  criteria: [
    {
      id: "criterion-1",
      criterionId: "criterion-1",
      name: "Technical knowledge",
      description: "Depth and accuracy of subject-matter knowledge.",
      weight: 1,
      sortOrder: 1,
      score: 5,
      evidenceComment: "Explained indexing trade-offs with a concrete example.",
    },
    {
      id: "criterion-2",
      criterionId: "criterion-2",
      name: "Communication",
      description: "Clarity and active listening.",
      weight: 1,
      sortOrder: 2,
      score: 4,
      evidenceComment: null,
    },
  ],
  review: null,
};

describe("FeedbackReportView", () => {
  it("shows the genuine average, criterion scores, and written feedback", () => {
    render(<FeedbackReportView report={report} title="Your feedback report" />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Your feedback report" }),
    ).toBeInTheDocument();
    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(screen.getByText("5 / 5")).toBeInTheDocument();
    expect(screen.getByText("4 / 5")).toBeInTheDocument();
    expect(
      screen.getByText(/explained indexing trade-offs/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/add measurable outcomes/i)).toBeInTheDocument();
  });
});
