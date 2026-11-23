/**
 * The approved Sprint 9 evaluation template. Criteria remain fixed for this
 * sprint; changing them requires a versioned template rather than editing a
 * template that already has reports attached.
 */
export const DEFAULT_FEEDBACK_TEMPLATE_NAME = "Mock interview evaluation";
export const DEFAULT_FEEDBACK_TEMPLATE_VERSION = 1;

export const DEFAULT_FEEDBACK_CRITERIA = [
  {
    name: "Technical knowledge",
    description:
      "Depth and accuracy of subject-matter knowledge for the target role.",
  },
  {
    name: "Problem solving",
    description:
      "Structured thinking, reasoning, and the ability to work through problems.",
  },
  {
    name: "Communication",
    description:
      "Clarity, active listening, and the ability to explain ideas effectively.",
  },
  {
    name: "Interview readiness",
    description:
      "Preparation, relevant examples, and familiarity with interview expectations.",
  },
  {
    name: "Overall performance",
    description:
      "Overall readiness for the target role, level, and interview type.",
  },
] as const;
