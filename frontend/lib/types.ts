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

export type CareerStage =
  | "STUDENT"
  | "FRESHER"
  | "EARLY_CAREER"
  | "MID_CAREER"
  | "SENIOR"
  | "CAREER_SWITCHER";

export type CandidateGoal =
  | "TECHNICAL_KNOWLEDGE"
  | "COMMUNICATION"
  | "PROBLEM_SOLVING"
  | "CONFIDENCE"
  | "BEHAVIORAL"
  | "LEADERSHIP"
  | "OVERALL_PREPARATION";

export type ProfileCompletionState = "INCOMPLETE" | "COMPLETE";

export type TaxonomyOption = {
  id: string;
  name: string;
  slug: string;
};

export type TaxonomyIndustry = TaxonomyOption & {
  jobRoles: TaxonomyOption[];
  specializations: TaxonomyOption[];
};

export type Taxonomy = {
  industries: TaxonomyIndustry[];
  interviewTypes: TaxonomyOption[];
  experienceLevels: Array<{ id: string; name: string; sortOrder: number }>;
};

export type CandidateProfile = {
  id: string;
  careerStage: CareerStage | null;
  industry: TaxonomyOption | null;
  currentRole: TaxonomyOption | null;
  targetRole: TaxonomyOption | null;
  yearsExperience: number | null;
  targetLevel: { id: string; name: string; sortOrder: number } | null;
  goals: CandidateGoal[];
  completionState: ProfileCompletionState;
  createdAt: string;
  updatedAt: string;
};

export type VerificationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

export type PublicationStatus = "UNPUBLISHED" | "PUBLISHED";

export type ExpertExperience = {
  id?: string;
  company: string;
  designation: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
};

export type ExpertApplication = {
  id: string;
  professionalHeadline: string | null;
  currentDesignation: string | null;
  currentCompany: string | null;
  countryCode: string | null;
  timezone: string | null;
  linkedinUrl: string | null;
  introduction: string | null;
  yearsExperience: number | null;
  verificationStatus: VerificationStatus;
  publicationStatus: PublicationStatus;
  reviewNotes: string | null;
  reviewedAt: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
  industries: TaxonomyOption[];
  specializations: Array<TaxonomyOption & { industryId: string }>;
  interviewTypes: TaxonomyOption[];
  jobRoles: Array<TaxonomyOption & { industryId: string }>;
  candidateLevels: Array<{ id: string; name: string; sortOrder: number }>;
  languages: string[];
  experiences: ExpertExperience[];
};

export type PublicExpert = {
  id: string;
  professionalHeadline: string | null;
  currentDesignation: string | null;
  currentCompany: string | null;
  countryCode: string | null;
  timezone: string | null;
  yearsExperience: number | null;
  user: { name: string; avatarUrl: string | null };
  industries: TaxonomyOption[];
  specializations: Array<TaxonomyOption & { industryId: string }>;
  interviewTypes: TaxonomyOption[];
  jobRoles: Array<TaxonomyOption & { industryId: string }>;
  candidateLevels: Array<{ id: string; name: string; sortOrder: number }>;
  languages: string[];
};

export type PublicExpertProfile = PublicExpert & {
  introduction: string | null;
  experiences: ExpertExperience[];
};

export type ExpertFilters = {
  industries: TaxonomyOption[];
  specializations: Array<TaxonomyOption & { industryId: string }>;
  interviewTypes: TaxonomyOption[];
  jobRoles: Array<TaxonomyOption & { industryId: string }>;
  experienceLevels: Array<{ id: string; name: string; sortOrder: number }>;
  languages: Array<{ code: string; name: string }>;
};

export type PublicExpertListResponse = {
  experts: PublicExpert[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type AdminApplicationsResponse = {
  applications: ExpertApplication[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
