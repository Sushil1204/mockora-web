import type { Prisma } from "@prisma/client";

/**
 * A profile is only discoverable and bookable when an administrator approved
 * and published it, and the owning account still has an active expert role.
 * This predicate is the single source of truth for public eligibility.
 */
export const publiclyAvailableExpertWhere: Prisma.ExpertProfileWhereInput = {
  verificationStatus: "APPROVED",
  publicationStatus: "PUBLISHED",
  user: {
    accountStatus: "ACTIVE",
    roles: { some: { role: "EXPERT", status: "ACTIVE" } },
  },
};
