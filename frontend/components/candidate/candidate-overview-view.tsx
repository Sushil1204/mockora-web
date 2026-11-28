import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  MessageSquareText,
  Search,
  TimerOff,
  Video,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, Skeleton } from "@/components/ui/feedback";
import {
  getActiveBookingCount,
  getCandidateDashboardMetrics,
  getNextCandidateAction,
  getRecentCandidateActivity,
  getUpcomingBookings,
  type CandidateNextAction,
} from "@/lib/candidate-dashboard";
import { formatBookingDateTime } from "@/lib/labels";
import type {
  Booking,
  BookingHistoryEntry,
  BookingStatus,
  PublicUser,
} from "@/lib/types";

const metricTones = {
  primary: "bg-primary-50 text-primary-700",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
} as const;

const activityIcons: Record<BookingStatus, LucideIcon> = {
  PENDING_EXPERT_APPROVAL: CalendarClock,
  APPROVED_PENDING_PAYMENT: CreditCard,
  CONFIRMED: BadgeCheck,
  DECLINED: XCircle,
  EXPIRED: TimerOff,
  CANCELLED: XCircle,
  IN_PROGRESS: Video,
  COMPLETED_PENDING_FEEDBACK: MessageSquareText,
  COMPLETED: CheckCircle2,
};

export function CandidateOverviewView({
  user,
  bookings,
  unreadCount,
  loading,
  bookingsError,
  notificationsError,
  onRetryBookings,
}: {
  user: PublicUser;
  bookings: Booking[];
  unreadCount: number;
  loading: boolean;
  bookingsError: boolean;
  notificationsError: boolean;
  onRetryBookings: () => void;
}) {
  const firstName = user.name.trim().split(/\s+/)[0];
  const metrics = getCandidateDashboardMetrics(bookings);
  const nextAction = getNextCandidateAction(bookings);
  const activeCount = getActiveBookingCount(bookings);
  const upcoming = getUpcomingBookings(bookings);

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10"
      tabIndex={-1}
    >
      <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar
            name={user.name}
            src={user.avatarUrl}
            size="lg"
            className="hidden sm:flex"
          />
          <div className="min-w-0">
            <p className="text-overline font-semibold uppercase text-terracotta-600">
              Candidate overview
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {firstName ? `Welcome back, ${firstName}.` : "Welcome back."}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Here&apos;s what&apos;s happening with your interview preparation.
            </p>
          </div>
        </div>
        <Link
          href="/experts"
          className={buttonClasses({ className: "w-full sm:w-auto" })}
        >
          <Search aria-hidden="true" className="h-4 w-4" />
          Find an expert
        </Link>
      </header>

      {loading ? (
        <DashboardSkeleton />
      ) : bookingsError ? (
        <LoadError onRetry={onRetryBookings} />
      ) : (
        <>
          <section
            className="mt-6"
            aria-labelledby="interview-activity-heading"
          >
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2
                id="interview-activity-heading"
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                Interview activity
              </h2>
              <Link
                href="/bookings"
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline"
              >
                All bookings
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <ActivityMetric
                href="/bookings"
                icon={CalendarCheck2}
                label="Upcoming interviews"
                tone="primary"
                value={metrics.upcoming}
              />
              <ActivityMetric
                href="/bookings"
                icon={Clock3}
                label="Awaiting approval"
                tone="warning"
                value={metrics.pending}
              />
              <ActivityMetric
                href="/bookings"
                icon={CreditCard}
                label="Payment due"
                tone="info"
                value={metrics.paymentDue}
              />
              <ActivityMetric
                href="/bookings"
                icon={CheckCircle2}
                label="Completed interviews"
                tone="success"
                value={metrics.completed}
              />
            </div>
          </section>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="min-w-0 space-y-6">
              <NextActionCard action={nextAction} activeCount={activeCount} />

              {upcoming.length > 0 ? (
                <section aria-labelledby="upcoming-interviews-heading">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <p className="text-overline font-semibold uppercase text-terracotta-600">
                        Scheduled
                      </p>
                      <h2
                        id="upcoming-interviews-heading"
                        className="mt-1 text-lg font-semibold tracking-tight text-foreground"
                      >
                        Upcoming interviews
                      </h2>
                    </div>
                    <p className="text-xs text-muted">
                      {upcoming.length === 1
                        ? "1 session scheduled"
                        : `${upcoming.length} sessions scheduled`}
                    </p>
                  </div>

                  <ul className="mt-3 space-y-3">
                    {upcoming.map((booking) => (
                      <li key={booking.id}>
                        <Card className="overflow-hidden transition-colors hover:border-border-strong">
                          <UpcomingRow booking={booking} />
                        </Card>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
              <RecentActivityCard
                bookings={bookings}
                unreadCount={unreadCount}
                notificationsError={notificationsError}
              />
            </aside>
          </div>
        </>
      )}

      <ExpertDiscoveryCta />
    </main>
  );
}

function ActivityMetric({
  href,
  icon: Icon,
  label,
  tone,
  value,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  tone: keyof typeof metricTones;
  value: number;
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 items-start gap-3 rounded-card border border-border bg-surface p-4 shadow-card transition-colors duration-150 hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span
        aria-hidden="true"
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-control ${metricTones[tone]}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          {value}
        </span>
        <span className="mt-0.5 block text-xs font-medium leading-snug text-muted">
          {label}
        </span>
      </span>
    </Link>
  );
}

function NextActionCard({
  action,
  activeCount,
}: {
  action: CandidateNextAction;
  activeCount: number;
}) {
  const booking = "booking" in action ? action.booking : null;
  const content = nextActionContent(action);

  return (
    <section aria-labelledby="next-action-heading">
      <Card className="overflow-hidden">
        <div className="border-b border-border bg-primary-50/70 px-5 py-4 sm:px-6">
          <p className="text-overline font-semibold uppercase text-primary-700">
            Next step
          </p>
          <h2
            id="next-action-heading"
            className="mt-1 text-xl font-semibold tracking-tight text-foreground"
          >
            {content.title}
          </h2>
        </div>

        <div className="p-5 sm:p-6">
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            {content.description}
          </p>

          {booking ? (
            <div className="mt-5 rounded-control border border-border bg-surface-muted/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={booking.expert.name} size="md" />
                  <div className="min-w-0">
                    <p className="text-overline font-semibold uppercase text-muted">
                      Expert
                    </p>
                    <p className="truncate text-sm font-semibold text-foreground">
                      {booking.expert.name}
                    </p>
                  </div>
                </div>
                <BookingStatusBadge status={booking.status} />
              </div>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-primary-600"
                  />
                  {formatBookingDateTime(booking.startsAt, booking.timezone)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Clock3
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-primary-600"
                  />
                  {booking.durationMinutes} minutes · {booking.timezone}
                </span>
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {content.actions}
          </div>

          {activeCount > 1 && content.showActiveCount ? (
            <p className="mt-3 text-xs leading-relaxed text-muted">
              You have {activeCount} active bookings.{" "}
              <Link
                href="/bookings"
                className="font-semibold text-primary-700 hover:underline"
              >
                Review all bookings
              </Link>
              .
            </p>
          ) : null}
        </div>
      </Card>
    </section>
  );
}

function nextActionContent(action: CandidateNextAction): {
  title: string;
  description: string;
  showActiveCount: boolean;
  actions: ReactNode;
} {
  if (action.kind === "ready") {
    return {
      title: "Ready to practise?",
      description:
        "Find an experienced professional and start preparing for your next interview.",
      showActiveCount: false,
      actions: (
        <Link href="/experts" className={buttonClasses()}>
          Explore experts
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      ),
    };
  }

  const { booking } = action;
  const bookingHref = `/bookings/${booking.id}`;

  if (action.kind === "inProgress") {
    return {
      title: "Your interview is in progress.",
      description:
        "Rejoin from the booking while the join window is open. The room keeps your session if the connection drops.",
      showActiveCount: true,
      actions: (
        <>
          <Link href={bookingHref} className={buttonClasses()}>
            Rejoin interview
            <Video aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link
            href="/bookings"
            className={buttonClasses({ variant: "secondary" })}
          >
            All bookings
          </Link>
        </>
      ),
    };
  }

  if (action.kind === "payment") {
    const deadline = booking.paymentDeadline
      ? ` Complete payment by ${formatBookingDateTime(
          booking.paymentDeadline,
          booking.timezone,
        )} to secure the slot.`
      : " Complete payment from the booking to secure the slot.";

    return {
      title: "Your request has been approved.",
      description: `${booking.expert.name} approved your request.${deadline} The booking is not confirmed until payment succeeds.`,
      showActiveCount: true,
      actions: (
        <>
          <Link href={bookingHref} className={buttonClasses()}>
            Complete payment
            <CreditCard aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link
            href="/bookings"
            className={buttonClasses({ variant: "secondary" })}
          >
            View request
          </Link>
        </>
      ),
    };
  }

  if (action.kind === "pending") {
    return {
      title: "Waiting for expert approval.",
      description: `${booking.expert.name} has until ${formatBookingDateTime(
        booking.expertResponseDeadline,
        booking.timezone,
      )} to respond. The slot is held, but the request is not confirmed yet.`,
      showActiveCount: true,
      actions: (
        <Link
          href={bookingHref}
          className={buttonClasses({ variant: "secondary" })}
        >
          View request
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      ),
    };
  }

  if (action.kind === "confirmed") {
    return {
      title: "Your next interview is confirmed.",
      description: `You are meeting ${booking.expert.name} on ${formatBookingDateTime(
        booking.startsAt,
        booking.timezone,
      )}. Open the booking for the interview room and session details.`,
      showActiveCount: true,
      actions: (
        <Link href={bookingHref} className={buttonClasses()}>
          View booking details
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      ),
    };
  }

  if (action.kind === "feedbackPending") {
    return {
      title: "Your interview is complete.",
      description: `${booking.expert.name} is preparing your feedback report. It will appear on this booking when it is submitted.`,
      showActiveCount: false,
      actions: (
        <>
          <Link
            href={bookingHref}
            className={buttonClasses({ variant: "secondary" })}
          >
            View booking
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link href="/experts" className={buttonClasses()}>
            Find another expert
          </Link>
        </>
      ),
    };
  }

  const reason = booking.history.at(-1)?.reason;

  return {
    title:
      booking.status === "DECLINED"
        ? "This request was declined."
        : booking.status === "CANCELLED"
          ? "This booking was cancelled."
          : "This request expired.",
    description:
      reason ??
      "The slot is no longer held. Browse other experts and choose a time that works for you.",
    showActiveCount: false,
    actions: (
      <>
        <Link href="/experts" className={buttonClasses()}>
          Find another expert
          <Search aria-hidden="true" className="h-4 w-4" />
        </Link>
        <Link
          href={bookingHref}
          className={buttonClasses({ variant: "secondary" })}
        >
          View booking
        </Link>
      </>
    ),
  };
}

function UpcomingRow({ booking }: { booking: Booking }) {
  const date = getDateParts(booking.startsAt, booking.timezone);

  return (
    <article className="flex flex-col sm:flex-row">
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-surface-muted/60 px-5 py-3.5 sm:w-24 sm:flex-col sm:justify-center sm:gap-0 sm:border-b-0 sm:border-r sm:px-3 sm:py-5">
        <p className="text-overline font-semibold uppercase tracking-[0.14em] text-terracotta-600">
          {date.month}
        </p>
        <p className="text-2xl font-semibold leading-none tracking-tight text-foreground sm:mt-1.5">
          {date.day}
        </p>
        <p className="text-xs font-medium text-muted sm:mt-1">{date.weekday}</p>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-4 p-5 sm:py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar
              name={booking.expert.name}
              src={booking.expert.avatarUrl}
              size="md"
            />
            <div className="min-w-0">
              <p className="text-overline font-semibold uppercase text-muted">
                Expert
              </p>
              <h3 className="truncate text-base font-semibold tracking-tight text-foreground">
                {booking.expert.name}
              </h3>
            </div>
          </div>

          <BookingStatusBadge status={booking.status} />

          <Link
            href={`/bookings/${booking.id}`}
            className={buttonClasses({
              variant: "secondary",
              size: "sm",
              className:
                "min-h-11 w-full justify-between sm:w-auto sm:justify-center",
            })}
          >
            View booking
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        <dl className="flex flex-col gap-x-6 gap-y-2 border-t border-border pt-3.5 text-sm sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex min-w-0 items-center gap-2">
            <dt className="sr-only">Start time</dt>
            <dd className="inline-flex min-w-0 items-center gap-2 font-medium text-foreground">
              <CalendarDays
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-primary-600"
              />
              <time dateTime={booking.startsAt}>
                {formatBookingDateTime(booking.startsAt, booking.timezone)}
              </time>
            </dd>
          </div>
          <div className="flex min-w-0 items-center gap-2 text-muted">
            <dt className="sr-only">Duration</dt>
            <dd className="inline-flex min-w-0 items-center gap-2">
              <Clock3
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-primary-600"
              />
              <span>
                {booking.durationMinutes} minutes · {booking.timezone}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

function RecentActivityCard({
  bookings,
  unreadCount,
  notificationsError,
}: {
  bookings: Booking[];
  unreadCount: number;
  notificationsError: boolean;
}) {
  const activity = getRecentCandidateActivity(bookings, 5);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="text-overline font-semibold uppercase text-terracotta-600">
            Timeline
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            Recent activity
          </h2>
        </div>
        <Link
          href="/notifications"
          className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-primary-700 hover:underline"
        >
          Notifications
          {unreadCount > 0 ? (
            <Badge variant="brand">{unreadCount} new</Badge>
          ) : null}
          <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </div>

      {notificationsError ? (
        <div className="px-5 pt-4">
          <Alert variant="warning">
            Unread notification counts could not be loaded.
          </Alert>
        </div>
      ) : null}

      {activity.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-muted">
            <CalendarClock aria-hidden="true" className="h-5 w-5" />
          </span>
          <h3 className="mt-3 text-sm font-semibold text-foreground">
            No activity yet
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Your booking requests, approvals, and interview updates will appear
            here.
          </p>
          <Link
            href="/experts"
            className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary-700 hover:underline"
          >
            Find an expert
          </Link>
        </div>
      ) : (
        <ol className="divide-y divide-border">
          {activity.map((item) => (
            <li key={item.id}>
              <ActivityRow booking={item.booking} entry={item.entry} />
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap gap-x-4 border-t border-border px-5 py-3">
        <Link
          href="/bookings"
          className="inline-flex min-h-11 items-center text-xs font-semibold text-primary-700 hover:underline"
        >
          All bookings
        </Link>
        <Link
          href="/notifications"
          className="inline-flex min-h-11 items-center text-xs font-semibold text-primary-700 hover:underline"
        >
          All notifications
        </Link>
      </div>
    </Card>
  );
}

function ActivityRow({
  booking,
  entry,
}: {
  booking: Booking;
  entry: BookingHistoryEntry;
}) {
  const Icon = activityIcons[entry.toStatus];
  const copy = activityCopy(entry, booking.expert.name);

  return (
    <Link
      href={`/bookings/${booking.id}`}
      className="group flex gap-3 px-5 py-4 transition-colors duration-150 hover:bg-surface-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary-50 text-primary-700"
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-snug text-foreground group-hover:text-primary-700">
          {copy.title}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-muted">
          {copy.detail}
        </span>
        <time
          dateTime={entry.createdAt}
          className="mt-1.5 block text-xs text-muted"
        >
          {formatActivityTime(entry.createdAt, booking.timezone)}
        </time>
      </span>
      <ArrowUpRight
        aria-hidden="true"
        className="mt-1 h-3.5 w-3.5 shrink-0 text-muted group-hover:text-primary-700"
      />
    </Link>
  );
}

function activityCopy(entry: BookingHistoryEntry, expertName: string) {
  switch (entry.toStatus) {
    case "PENDING_EXPERT_APPROVAL":
      return {
        title: "Booking request submitted",
        detail: `Your request was sent to ${expertName}.`,
      };
    case "APPROVED_PENDING_PAYMENT":
      return {
        title: "Expert approved your request",
        detail: `Complete payment to confirm the booking with ${expertName}.`,
      };
    case "CONFIRMED":
      return {
        title: "Booking confirmed",
        detail: `Payment succeeded and your session with ${expertName} is secured.`,
      };
    case "DECLINED":
      return {
        title: "Expert declined the request",
        detail: entry.reason ?? "The slot was released.",
      };
    case "EXPIRED":
      return {
        title: "Booking request expired",
        detail: "The response or payment deadline passed.",
      };
    case "CANCELLED":
      return {
        title: "Booking cancelled",
        detail: entry.reason ?? "This session was cancelled.",
      };
    case "IN_PROGRESS":
      return {
        title: "Interview started",
        detail: `Your session with ${expertName} is in progress.`,
      };
    case "COMPLETED_PENDING_FEEDBACK":
      return {
        title: "Interview completed",
        detail: `Your feedback report from ${expertName} is pending.`,
      };
    case "COMPLETED":
      return {
        title: "Feedback report ready",
        detail: `Review the feedback from your session with ${expertName}.`,
      };
  }

  return {
    title: "Booking updated",
    detail: `Your session with ${expertName} was updated.`,
  };
}

function ExpertDiscoveryCta() {
  return (
    <section className="mt-6 overflow-hidden rounded-panel border border-primary-800 bg-primary-900 px-5 py-6 text-white shadow-card sm:px-8 sm:py-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-overline font-semibold uppercase text-terracotta-300">
            Expert discovery
          </p>
          <h2 className="mt-1 max-w-2xl text-xl font-semibold tracking-tight sm:text-2xl">
            Your next interview starts with the right practice.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-primary-100">
            Explore verified professionals and get actionable feedback to
            improve your interview performance.
          </p>
        </div>
        <Link
          href="/experts"
          className={buttonClasses({
            className:
              "w-full shrink-0 bg-white text-primary-900 hover:bg-primary-50 sm:w-auto",
          })}
        >
          <Search aria-hidden="true" className="h-4 w-4" />
          Find an expert
        </Link>
      </div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-label="Loading candidate overview" role="status">
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-card" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-6">
          <Skeleton className="h-72 rounded-card" />
          <Skeleton className="h-48 rounded-card" />
        </div>
        <Skeleton className="h-[28rem] rounded-card" />
      </div>
    </div>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="mt-6 border-error/20 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-error-soft text-error">
          <AlertCircle aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">
            We could not load your interview activity
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Your bookings and notifications were not changed. Check your
            connection and try again.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4"
            onClick={onRetry}
          >
            Try again
          </Button>
        </div>
      </div>
    </Card>
  );
}

function getDateParts(value: string, timeZone: string) {
  const date = new Date(value);

  return {
    weekday: new Intl.DateTimeFormat("en", {
      timeZone,
      weekday: "short",
    }).format(date),
    month: new Intl.DateTimeFormat("en", {
      timeZone,
      month: "short",
    }).format(date),
    day: new Intl.DateTimeFormat("en", {
      timeZone,
      day: "numeric",
    }).format(date),
  };
}

function formatActivityTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
