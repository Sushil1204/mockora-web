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

export type PublicExpertReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export type PublicExpertProfile = PublicExpert & {
  introduction: string | null;
  experiences: ExpertExperience[];
  reviews: {
    averageRating: number | null;
    total: number;
    items: PublicExpertReview[];
  };
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
  priceAmount: number | null;
  currency: string | null;
  expertPayoutAmount: number | null;
  platformAmount: number | null;
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

export type NotificationType =
  | "BOOKING_REQUESTED"
  | "BOOKING_APPROVED"
  | "BOOKING_DECLINED"
  | "PAYMENT_DEADLINE_REMINDER"
  | "BOOKING_CONFIRMED"
  | "BOOKING_EXPIRED"
  | "INTERVIEW_REMINDER"
  | "FEEDBACK_REQUESTED"
  | "FEEDBACK_REMINDER"
  | "FEEDBACK_SUBMITTED";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  isRead: boolean;
  createdAt: string;
};

export type InterviewSessionStatus =
  "NOT_STARTED" | "READY" | "IN_PROGRESS" | "ENDED";

export type InterviewUnavailableReason =
  "NOT_CONFIGURED" | "NOT_CONFIRMED" | "NOT_OPEN" | "WINDOW_CLOSED" | "ENDED";

export type InterviewState = {
  provider: "STREAM_VIDEO";
  sessionName: string;
  status: InterviewSessionStatus;
  startedAt: string | null;
  endedAt: string | null;
  configured: boolean;
  canJoin: boolean;
  unavailableReason: InterviewUnavailableReason | null;
  joinWindow: {
    opensAt: string;
    closesAt: string;
  };
  booking: {
    id: string;
    status: BookingStatus;
    startsAt: string;
    endsAt: string;
    timezone: string;
  };
};

export type InterviewStateResponse = {
  interview: InterviewState;
};

export type InterviewAccess = InterviewState & {
  token: string;
  apiKey: string;
  callId: string;
  callType: string;
  userName: string;
  userId: string;
};

export type InterviewTokenResponse = {
  interview: InterviewAccess;
};

export type NotificationListResponse = {
  notifications: Notification[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type FeedbackCriterion = {
  id: string;
  name: string;
  description: string | null;
  weight: number;
  sortOrder: number;
};

export type FeedbackTemplate = {
  id: string;
  name: string;
  version: number;
  criteria: FeedbackCriterion[];
};

export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export type FeedbackCriterionScore = FeedbackCriterion & {
  criterionId: string;
  score: number;
  evidenceComment: string | null;
};

export type FeedbackReport = {
  id: string;
  bookingId: string;
  overallSummary: string;
  strengths: string;
  improvementAreas: string;
  recommendations: string | null;
  submittedAt: string;
  template: { id: string; name: string; version: number };
  averageScore: number | null;
  criteria: FeedbackCriterionScore[];
  review: Review | null;
};

export type FeedbackStateResponse = {
  feedback: FeedbackReport | null;
  template: FeedbackTemplate | null;
  canSubmit: boolean;
  canReview: boolean;
  review: Review | null;
};

export type FeedbackResponse = {
  feedback: FeedbackReport;
};

export type ReviewResponse = {
  review: Review;
};

export type AdminPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminCandidate = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  countryCode: string | null;
  accountStatus: AccountStatus;
  roles: Array<{ role: Role; status: "ACTIVE" | "PENDING" | "SUSPENDED" }>;
  createdAt: string;
  profile: {
    careerStage: CareerStage | null;
    yearsExperience: number | null;
    completionState: ProfileCompletionState;
    industry: string | null;
    currentRole: string | null;
    targetRole: string | null;
    targetLevel: string | null;
  } | null;
  recentBookings?: Array<{
    id: string;
    status: BookingStatus;
    startsAt: string;
    createdAt: string;
    priceAmount: number | null;
    currency: string | null;
    expertName: string;
  }>;
  recentReviews?: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    expertName: string;
  }>;
};

export type AdminCandidatesResponse = {
  candidates: AdminCandidate[];
  pagination: AdminPagination;
};

export type AdminCandidateResponse = { candidate: AdminCandidate };

export type AdminBooking = {
  id: string;
  status: BookingStatus;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  timezone: string;
  priceAmount: number | null;
  currency: string | null;
  expertPayoutAmount: number | null;
  platformAmount: number | null;
  createdAt: string;
  cancelledAt: string | null;
  candidate: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  expert: {
    id: string;
    name: string;
    email: string;
    professionalHeadline: string | null;
  };
  payment: {
    id: string;
    provider: PaymentProvider;
    status: PaymentStatus;
    amount: number | null;
    currency: string | null;
    paidAt: string | null;
  } | null;
  refundedAmount: number;
  refundCurrency: string | null;
};

export type AdminBookingDetail = AdminBooking & {
  history: Array<{
    id: string;
    fromStatus: BookingStatus | null;
    toStatus: BookingStatus;
    reason: string | null;
    createdAt: string;
    changedBy: { id: string; name: string } | null;
  }>;
  payments: Array<{
    id: string;
    provider: PaymentProvider;
    status: PaymentStatus;
    amount: number | null;
    currency: string | null;
    paidAt: string | null;
    createdAt: string;
  }>;
  refunds: Array<{
    id: string;
    amount: number;
    currency: string;
    reason: string;
  }>;
  interviewSession: {
    id: string;
    status: InterviewSessionStatus;
    startedAt: string | null;
    endedAt: string | null;
  } | null;
  feedback: {
    id: string;
    submittedAt: string;
    overallSummary: string;
    strengths: string;
    improvementAreas: string;
    recommendations: string | null;
    scores: Array<{
      name: string;
      score: number;
      evidenceComment: string | null;
    }>;
  } | null;
  review: Review | null;
  payout: {
    id: string;
    amount: number;
    currency: string;
    status: AdminPayoutStatus;
    eligibleAt: string | null;
    paidAt: string | null;
  } | null;
};

export type AdminBookingsResponse = {
  bookings: AdminBooking[];
  pagination: AdminPagination;
};

export type AdminBookingResponse = { booking: AdminBookingDetail };

export type AdminPaymentRecord = {
  id: string;
  provider: PaymentProvider;
  providerPaymentReference: string | null;
  status: PaymentStatus;
  amount: number | null;
  currency: string | null;
  paidAt: string | null;
  failureReason: string | null;
  createdAt: string;
  booking: {
    id: string;
    status: BookingStatus;
    startsAt: string;
    durationMinutes: number;
    candidate: { id: string; name: string; email: string };
    expert: { id: string; name: string };
  };
};

export type AdminPaymentsResponse = {
  payments: AdminPaymentRecord[];
  pagination: AdminPagination;
};

export type AdminRefundRecord = {
  id: string;
  amount: number;
  currency: string;
  reason: string;
  createdAt: string;
  payment: {
    id: string;
    provider: PaymentProvider;
    status: PaymentStatus;
    amount: number | null;
  } | null;
  recordedBy: { id: string; name: string; email: string };
  booking: {
    id: string;
    status: BookingStatus;
    startsAt: string;
    candidate: { id: string; name: string; email: string };
    expert: { id: string; name: string };
  };
};

export type AdminRefundsResponse = {
  refunds: AdminRefundRecord[];
  pagination: AdminPagination;
};

export type AdminPayoutStatus =
  "PENDING" | "ELIGIBLE" | "PROCESSING" | "PAID" | "FAILED" | "REVERSED";

export type AdminPayout = {
  id: string;
  amount: number;
  currency: string;
  status: AdminPayoutStatus;
  eligibleAt: string | null;
  paidAt: string | null;
  createdAt: string;
  expert: { id: string; name: string; email: string };
  paidBy: { id: string; name: string } | null;
  booking: {
    id: string;
    status: BookingStatus;
    startsAt: string;
    completedAt: string | null;
    candidateName: string;
  };
};

export type AdminPayoutsResponse = {
  payouts: AdminPayout[];
  pagination: AdminPagination;
};

export type AdminPayoutResponse = { payout: AdminPayout };

export type AdminPricingRule = {
  id: string;
  durationMinutes: number;
  candidatePriceAmount: number;
  expertPayoutAmount: number;
  platformAmount: number;
  commissionPercent: number;
  currency: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string; email: string } | null;
};

export type AdminPricingResponse = { rules: AdminPricingRule[] };

export type AdminFeedbackReport = {
  id: string;
  bookingId: string;
  overallSummary: string;
  strengths: string;
  improvementAreas: string;
  recommendations: string | null;
  submittedAt: string;
  template: { id: string; name: string; version: number };
  averageScore: number | null;
  scores: Array<{
    criterionId: string;
    name: string;
    weight: number;
    sortOrder: number;
    score: number;
    evidenceComment: string | null;
  }>;
  expert: { id: string; name: string; email: string };
  candidate: { id: string; name: string; email: string };
  booking: {
    id: string;
    status: BookingStatus;
    startsAt: string;
    durationMinutes: number;
    expertProfileId: string;
  };
  review: Review | null;
};

export type AdminFeedbackResponse = {
  reports: AdminFeedbackReport[];
  pagination: AdminPagination;
};

export type AdminFeedbackDetailResponse = { report: AdminFeedbackReport };

export type AdminAuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  actor: { id: string; name: string; email: string } | null;
  createdAt: string;
};

export type AdminAuditResponse = {
  logs: AdminAuditLog[];
  pagination: AdminPagination;
};

export type AdminAnalytics = {
  users: {
    candidates: number;
    approvedExperts: number;
    pendingApplications: number;
  };
  bookings: {
    total: number;
    completed: number;
    awaitingFeedback: number;
    upcomingInterviews: number;
    byStatus: Array<{ status: BookingStatus; count: number }>;
  };
  payments: {
    successfulCount: number;
    grossByCurrency: Array<{
      currency: string;
      amount: number;
      count: number;
    }>;
  };
  refunds: {
    count: number;
    byCurrency: Array<{ currency: string; amount: number; count: number }>;
  };
  payouts: Array<{
    status: AdminPayoutStatus;
    currency: string;
    amount: number;
    count: number;
  }>;
  feedback: {
    reports: number;
    reviews: number;
    averageRating: number | null;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    actor: { id: string; name: string } | null;
    createdAt: string;
  }>;
  recentBookings: Array<{
    id: string;
    status: BookingStatus;
    startsAt: string;
    createdAt: string;
    candidateName: string;
    expertName: string;
  }>;
};
