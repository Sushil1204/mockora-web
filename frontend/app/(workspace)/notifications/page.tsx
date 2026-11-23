import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { NotificationList } from "@/components/notifications/notification-list";
import { fetchServerApi, getCurrentUser } from "@/lib/session";
import type { NotificationListResponse } from "@/lib/types";

export const metadata: Metadata = {
  title: "Notifications",
};

// Notifications depend on the request session.
export const instant = false;

export default async function NotificationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const response = await fetchServerApi<NotificationListResponse>(
    "/notifications?limit=50",
  );

  if (!response) {
    return (
      <main
        id="main-content"
        className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14"
      >
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Notifications
        </h1>
        <p className="mt-4 rounded-xl border border-error/20 bg-error-soft px-4 py-3 text-sm text-error">
          Notifications could not be loaded. Refresh the page to try again.
        </p>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta-600">
          Your activity
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Notifications
        </h1>
        <p className="mt-2 text-sm text-muted">
          Booking decisions, payment reminders, and upcoming interview alerts.
        </p>
      </div>

      <NotificationList
        initialNotifications={response.notifications}
        initialUnreadCount={response.unreadCount}
      />
    </main>
  );
}
