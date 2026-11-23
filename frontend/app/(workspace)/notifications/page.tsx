import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { NotificationList } from "@/components/notifications/notification-list";
import { ErrorState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
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

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12"
      tabIndex={-1}
    >
      <PageHeader
        eyebrow="Your activity"
        title="Notifications"
        description="Booking decisions, payment reminders, and upcoming interview alerts. Unread items stay highlighted until you open or mark them."
      />

      {!response ? (
        <ErrorState
          className="mt-8"
          title="Notifications could not be loaded"
          description="Refresh the page to try again. No notification state was changed."
        />
      ) : (
        <NotificationList
          initialNotifications={response.notifications}
          initialUnreadCount={response.unreadCount}
        />
      )}
    </main>
  );
}
