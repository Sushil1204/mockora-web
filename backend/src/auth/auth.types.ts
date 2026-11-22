import type { AccountStatus, Role } from "@prisma/client";
import type { Request } from "express";

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  countryCode: string | null;
  preferredLanguage: string;
  emailVerifiedAt: string | null;
  accountStatus: AccountStatus;
  roles: Role[];
  createdAt: string;
  updatedAt: string;
};

export type SessionContext = {
  sessionId: string;
  user: PublicUser;
};

export type RequestWithUser = Request & {
  user?: PublicUser;
  sessionId?: string;
};
