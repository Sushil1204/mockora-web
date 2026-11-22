import type { Prisma } from "@prisma/client";

export const candidateProfileInclude = {
  industry: { select: { id: true, name: true, slug: true } },
  currentRole: { select: { id: true, name: true, slug: true } },
  targetRole: { select: { id: true, name: true, slug: true } },
  targetLevel: { select: { id: true, name: true, sortOrder: true } },
} satisfies Prisma.CandidateProfileInclude;

export type CandidateProfileWithRelations = Prisma.CandidateProfileGetPayload<{
  include: typeof candidateProfileInclude;
}>;

export function toCandidateProfile(profile: CandidateProfileWithRelations) {
  return {
    id: profile.id,
    careerStage: profile.careerStage,
    industry: profile.industry,
    currentRole: profile.currentRole,
    targetRole: profile.targetRole,
    yearsExperience: profile.yearsExperience,
    targetLevel: profile.targetLevel,
    goals: profile.goals,
    completionState: profile.profileCompletionState,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}
