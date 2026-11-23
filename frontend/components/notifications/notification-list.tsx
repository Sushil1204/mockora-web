"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import { apiRequest } from "@/lib/api";
import type { Notification, NotificationType } from "@/lib/types";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

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
    <section className={`${cardClass} mt-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            All notifications
          </h2>
          <p className="mt-1 text-sm text-muted">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "You are all caught up."}
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={markingAll || unreadCount === 0}
          className={`${secondaryButtonClass} h-9 px-3 text-xs`}
        >
          {markingAll ? "Marking…" : "Mark all as read"}
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-error/20 bg-error-soft px-3 py-2 text-sm text-error">
          {error}
        </p>
      ) : null}

      {notifications.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">
          Booking and interview updates will appear here.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {notifications.map((notification) => {
            const bookingId =
              typeof notification.data?.bookingId === "string"
                ? notification.data.bookingId
                : null;

            return (
              <li key={notification.id} className="py-5">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      notification.isRead ? "bg-border" : "bg-primary-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-700">
                        {typeLabels[notification.type]}
                      </span>
                      <span className="text-xs text-muted">
                        {formatNotificationDateTime(
                          notification.createdAt,
                          timeZone,
                        )}
                      </span>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-foreground">
                      {notification.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {notification.body}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {bookingId ? (
                        <Link
                          href={`/bookings/${bookingId}`}
                          className="text-sm font-medium text-primary-700 hover:underline"
                        >
                          View booking
                        </Link>
                      ) : null}
                      {!notification.isRead ? (
                        <button
                          type="button"
                          onClick={() => markRead(notification)}
                          disabled={pendingId === notification.id}
                          className="text-sm font-medium text-muted hover:text-foreground disabled:opacity-60"
                        >
                          {pendingId === notification.id
                            ? "Marking…"
                            : "Mark as read"}
                        </button>
                      ) : (
                        <span className="text-sm text-muted">Read</span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-5 flex justify-end">
        <Link
          href="/account"
          className={`${primaryButtonClass} h-9 px-4 text-xs`}
        >
          Back to account
        </Link>
      </div>
    </section>
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
