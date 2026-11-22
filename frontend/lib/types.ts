export type Role = "CANDIDATE" | "EXPERT" | "ADMIN";

export type AccountStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

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

export type AuthResponse = {
  user: PublicUser;
};
