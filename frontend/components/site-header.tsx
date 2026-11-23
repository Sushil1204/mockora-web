import { PublicHeader } from "@/components/shell/public-header";
import { fetchServerApi, getCurrentUser } from "@/lib/session";
import type { NotificationListResponse } from "@/lib/types";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const notificationSummary = user
    ? await fetchServerApi<NotificationListResponse>("/notifications?limit=1")
    : null;

  return (
    <PublicHeader
      user={user}
      unreadCount={notificationSummary?.unreadCount ?? 0}
    />
  );
}
