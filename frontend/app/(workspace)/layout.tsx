import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { WorkspaceShell } from "@/components/shell/workspace-shell";
import { fetchServerApi, getCurrentUser } from "@/lib/session";
import type { NotificationListResponse } from "@/lib/types";

// Every workspace screen depends on the request session.
export const instant = false;

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const notificationSummary = await fetchServerApi<NotificationListResponse>(
    "/notifications?limit=1",
  );

  return (
    <WorkspaceShell
      user={user}
      unreadCount={notificationSummary?.unreadCount ?? 0}
    >
      {children}
    </WorkspaceShell>
  );
}
