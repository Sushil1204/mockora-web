"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { ArrowRight, Bell, CheckCheck } from "lucide-react";

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
    <Card className="mt-8 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            All notifications
          </h2>
          <p className="mt-1 text-sm text-muted" aria-live="polite">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "You are all caught up."}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="min-h-11"
          onClick={markAllRead}
          loading={markingAll}
          disabled={markingAll || unreadCount === 0}
        >
          <CheckCheck aria-hidden="true" className="h-4 w-4" />
          {markingAll ? "Marking…" : "Mark all as read"}
        </Button>
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

            return (
              <li
                key={notification.id}
                className={
                  notification.isRead
                    ? "p-5 sm:px-6"
                    : "bg-primary-50/40 p-5 sm:px-6"
                }
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      notification.isRead ? "bg-border" : "bg-primary-500"
                    }`}
                  />
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
                        <span className="sr-only">Unread</span>
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

      <div className="border-t border-border p-5 sm:px-6">
        <Link
          href="/account"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-700 hover:underline"
        >
          Back to account
        </Link>
      </div>
    </Card>
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
