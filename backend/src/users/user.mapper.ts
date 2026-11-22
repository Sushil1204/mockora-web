import type { Prisma } from "@prisma/client";

import type { PublicUser } from "../auth/auth.types";

export type UserWithRoles = Prisma.UserGetPayload<{
  include: { roles: true };
}>;

export function toPublicUser(user: UserWithRoles): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    countryCode: user.countryCode,
    preferredLanguage: user.preferredLanguage,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    accountStatus: user.accountStatus,
    roles: user.roles
      .filter((role) => role.status === "ACTIVE")
      .map((role) => role.role)
      .sort(),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
