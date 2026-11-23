"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  MessageSquareText,
  TimerOff,
  Video,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { apiRequest } from "@/lib/api";
import type { Notification, NotificationType } from "@/lib/types";

const typeLabels: Record<NotificationType, string> = {
  BOOKING_REQUESTED: "Booking request",
  BOOKING_APPROVED: "Approval",
  BOOKING_DECLINED: "Decline",
  PAYMENT_DEADLINE_REMINDER: "Payment reminder",
  BOOKING_CONFIRMED: "Confirmed",
  BOOKING_EXPIRED: "Expired",
  INTERVIEW_REMINDER: "Interview reminder",
  FEEDBACK_REQUESTED: "Feedback request",
  FEEDBACK_REMINDER: "Feedback reminder",
  FEEDBACK_SUBMITTED: "Feedback report",
};

const typeIcons: Record<NotificationType, LucideIcon> = {
  BOOKING_REQUESTED: CalendarClock,
  BOOKING_APPROVED: CheckCircle2,
  BOOKING_DECLINED: XCircle,
  PAYMENT_DEADLINE_REMINDER: CreditCard,
  BOOKING_CONFIRMED: BadgeCheck,
  BOOKING_EXPIRED: TimerOff,
  INTERVIEW_REMINDER: Video,
  FEEDBACK_REQUESTED: MessageSquareText,
  FEEDBACK_REMINDER: MessageSquareText,
  FEEDBACK_SUBMITTED: FileCheck2,
};

export function NotificationList({
  initialNotifications,
  initialUnreadCount,
}: {
  initialNotifications: Notification[];
  initialUnreadCount: number;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeZone = useSyncExternalStore(
    subscribeToTimeZone,
    getBrowserTimeZone,
    getServerTimeZone,
  );

  async function markRead(notification: Notification) {
    if (notification.isRead) {
      return;
    }

    setPendingId(notification.id);
    setError(null);

    try {
      await apiRequest(`/notifications/${notification.id}/read`, {
        method: "POST",
      });
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                isRead: true,
                readAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      router.refresh();
    } catch {
      setError("This notification could not be marked as read.");
    } finally {
      setPendingId(null);
    }
  }

  async function markAllRead() {
    if (unreadCount === 0) {
      return;
    }

    setMarkingAll(true);
    setError(null);

    try {
      await apiRequest("/notifications/read-all", { method: "POST" });
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => ({ ...item, isRead: true, readAt })),
      );
      setUnreadCount(0);
      router.refresh();
    } catch {
      setError("Notifications could not be marked as read.");
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card className="overflow-hidden">
          <div className="relative overflow-hidden bg-primary-900 p-5 text-white">
            <div
              aria-hidden="true"
              className="absolute -right-10 -top-12 h-36 w-36 rounded-full border border-white/10 bg-white/5"
            />
            <div className="relative flex items-start justify-between gap-4 lg:block">
              <div>
                <p className="text-overline font-semibold uppercase text-primary-200">
                  Inbox status
                </p>
                <div aria-live="polite">
                  <p className="sr-only">
                    {unreadCount > 0
                      ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
                      : "You are all caught up."}
                  </p>
                  <p
                    aria-hidden="true"
                    className="mt-2 text-4xl font-semibold tabular-nums tracking-tight"
                  >
                    {unreadCount}
                  </p>
                  <p
                    aria-hidden="true"
                    className="mt-1 text-sm text-primary-100"
                  >
                    {unreadCount > 0
                      ? `unread notification${unreadCount === 1 ? "" : "s"}`
                      : "You are all caught up."}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="min-h-11 shrink-0 bg-white text-primary-900 hover:bg-primary-50 lg:mt-5 lg:w-full"
                onClick={markAllRead}
                loading={markingAll}
                disabled={markingAll || unreadCount === 0}
              >
                <CheckCheck aria-hidden="true" className="h-4 w-4" />
                {markingAll ? "Marking…" : "Mark all as read"}
              </Button>
            </div>
          </div>
          <p className="p-5 text-xs leading-relaxed text-muted">
            Booking decisions, payment reminders, and interview alerts appear
            here. Unread items stay highlighted until you open or mark them.
          </p>
        </Card>
      </aside>

      <Card className="min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <p className="text-overline font-semibold uppercase text-terracotta-600">
              Activity
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
              All notifications
            </h2>
          </div>
          <p className="text-xs text-muted" aria-live="polite">
            {notifications.length === 1
              ? "1 notification"
              : `${notifications.length} notifications`}
          </p>
        </div>

        {error ? (
          <div className="p-5 pb-0 sm:px-6">
            <Alert variant="danger">{error}</Alert>
          </div>
        ) : null}

        {notifications.length === 0 ? (
          <EmptyState
            icon={<Bell aria-hidden="true" className="h-5 w-5" />}
            title="No notifications yet"
            description="Booking and interview updates will appear here."
            className="m-5 border-0 bg-surface sm:m-6"
          />
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((notification) => {
              const bookingId =
                typeof notification.data?.bookingId === "string"
                  ? notification.data.bookingId
                  : null;
              const Icon = typeIcons[notification.type];

              return (
                <li
                  key={notification.id}
                  className={
                    notification.isRead ? undefined : "bg-primary-50/40"
                  }
                >
                  <div className="flex items-start gap-3 p-5 sm:px-6">
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-control ${
                        notification.isRead
                          ? "bg-surface-muted text-muted"
                          : "bg-primary-100 text-primary-700"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={notification.isRead ? "neutral" : "brand"}
                        >
                          {typeLabels[notification.type]}
                        </Badge>
                        <time
                          dateTime={notification.createdAt}
                          className="text-xs text-muted"
                        >
                          {formatNotificationDateTime(
                            notification.createdAt,
                            timeZone,
                          )}
                        </time>
                        {!notification.isRead ? (
                          <span className="text-xs font-semibold text-primary-700">
                            Unread
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-2 text-sm font-semibold text-foreground">
                        {notification.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        {notification.body}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {bookingId ? (
                          <Link
                            href={`/bookings/${bookingId}`}
                            className={buttonClasses({
                              variant: "secondary",
                              size: "sm",
                              className: "min-h-11",
                            })}
                          >
                            View booking
                            <ArrowRight
                              aria-hidden="true"
                              className="h-3.5 w-3.5"
                            />
                          </Link>
                        ) : null}
                        {!notification.isRead ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="min-h-11"
                            onClick={() => markRead(notification)}
                            loading={pendingId === notification.id}
                            disabled={pendingId === notification.id}
                          >
                            {pendingId === notification.id
                              ? "Marking…"
                              : "Mark as read"}
                          </Button>
                        ) : (
                          <span className="text-xs font-medium text-muted">
                            Read
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="border-t border-border px-5 py-4 sm:px-6">
          <Link
            href="/account"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-700 hover:underline"
          >
            Back to account
          </Link>
        </div>
      </Card>
    </div>
  );
}

function subscribeToTimeZone() {
  return () => {};
}

function getBrowserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function getServerTimeZone() {
  return "UTC";
}

function formatNotificationDateTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(new Date(value));
}
