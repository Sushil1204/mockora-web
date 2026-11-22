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

export type AvailabilityRule = {
  id: string;
  weekday: number;
  startLocalTime: string;
  endLocalTime: string;
  timezone: string;
  slotDurationMinutes: number;
  effectiveFrom: string;
  effectiveUntil: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AvailabilityException = {
  id: string;
  startsAt: string;
  endsAt: string;
  exceptionType: "UNAVAILABLE";
  reason: string | null;
  createdAt: string;
};

export type OwnAvailability = {
  timezone: string;
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
};

export type PublicAvailability = {
  expertProfileId: string;
  timezone: string;
  minimumNoticeMinutes: number;
  from: string;
  to: string;
  truncated: boolean;
  slots: Array<{ startsAt: string; endsAt: string }>;
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

export type BookingStatus =
  | "PENDING_EXPERT_APPROVAL"
  | "APPROVED_PENDING_PAYMENT"
  | "CONFIRMED"
  | "DECLINED"
  | "EXPIRED"
  | "CANCELLED"
  | "IN_PROGRESS"
  | "COMPLETED_PENDING_FEEDBACK"
  | "COMPLETED";

export type BookingHistoryEntry = {
  id: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  reason: string | null;
  createdAt: string;
};

export type Booking = {
  id: string;
  status: BookingStatus;
  startsAt: string;
  endsAt: string;
  timezone: string;
  durationMinutes: number;
  expertResponseDeadline: string;
  paymentDeadline: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  viewer: {
    isCandidate: boolean;
    isExpert: boolean;
  };
  expert: {
    id: string;
    name: string;
    avatarUrl: string | null;
    professionalHeadline: string | null;
    timezone: string | null;
  };
  candidate: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  reservation: {
    id: string;
    status: "HELD" | "CONSUMED" | "RELEASED" | "EXPIRED";
    expiresAt: string;
  } | null;
  history: BookingHistoryEntry[];
};

export type BookingResponse = {
  booking: Booking;
};

export type PaymentProvider = "MOCK" | "RAZORPAY";

export type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "REFUND_PENDING"
  | "REFUNDED";

export type Payment = {
  id: string;
  bookingId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number | null;
  currency: string | null;
  providerReference: string | null;
  paidAt: string | null;
  failureReason: string | null;
  isSimulated: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PaymentResponse = {
  payment: Payment;
};

export type BookingListResponse = {
  bookings: Booking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
