import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountDetailsCard } from "@/components/account/account-details";
import { ProfileForm } from "@/components/account/profile-form";
import { CandidateOverview } from "@/components/candidate/candidate-overview";
import { PageHeader } from "@/components/ui/page-header";
import { fetchServerApi, getCurrentUser } from "@/lib/session";
import type {
  BookingListResponse,
  NotificationListResponse,
} from "@/lib/types";

export const metadata: Metadata = {
  title: "Candidate overview",
};

// Overview content depends on the request session and must not be prerendered.
export const instant = false;

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.roles.includes("CANDIDATE")) {
    return (
      <main
        id="main-content"
        className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10"
        tabIndex={-1}
      >
        <PageHeader
          eyebrow="Your account"
          title="Account settings"
          description="Manage the name, country, and language tied to this sign-in. Your role workspace keeps its own profile details."
        />
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <ProfileForm user={user} />
          <aside>
            <AccountDetailsCard user={user} />
          </aside>
        </div>
      </main>
    );
  }

  const [bookings, notifications] = await Promise.all([
    fetchServerApi<BookingListResponse>("/bookings?as=candidate&limit=50"),
    fetchServerApi<NotificationListResponse>("/notifications?limit=10"),
  ]);

  return (
    <CandidateOverview
      user={user}
      initialBookings={bookings}
      initialNotifications={notifications}
    />
  );
}
