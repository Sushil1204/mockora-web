"use client";

import { useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";

import { CandidateOverviewView } from "@/components/candidate/candidate-overview-view";
import { apiRequest } from "@/lib/api";
import type {
  BookingListResponse,
  NotificationListResponse,
  PublicUser,
} from "@/lib/types";

const bookingsQueryKey = ["candidate", "overview", "bookings"] as const;
const notificationsQueryKey = [
  "candidate",
  "overview",
  "notifications",
] as const;

async function fetchBookings() {
  return apiRequest<BookingListResponse>("/bookings?as=candidate&limit=50");
}

async function fetchNotifications() {
  return apiRequest<NotificationListResponse>("/notifications?limit=10");
}

export function CandidateOverview({
  user,
  initialBookings,
  initialNotifications,
}: {
  user: PublicUser;
  initialBookings: BookingListResponse | null;
  initialNotifications: NotificationListResponse | null;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <CandidateOverviewData
        user={user}
        initialBookings={initialBookings}
        initialNotifications={initialNotifications}
      />
    </QueryClientProvider>
  );
}

function CandidateOverviewData({
  user,
  initialBookings,
  initialNotifications,
}: {
  user: PublicUser;
  initialBookings: BookingListResponse | null;
  initialNotifications: NotificationListResponse | null;
}) {
  const bookingsQuery = useQuery({
    queryKey: bookingsQueryKey,
    queryFn: fetchBookings,
    initialData: initialBookings ?? undefined,
  });
  const notificationsQuery = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: fetchNotifications,
    initialData: initialNotifications ?? undefined,
  });

  return (
    <CandidateOverviewView
      user={user}
      bookings={bookingsQuery.data?.bookings ?? []}
      unreadCount={notificationsQuery.data?.unreadCount ?? 0}
      loading={bookingsQuery.isPending}
      bookingsError={bookingsQuery.isError && !bookingsQuery.data}
      notificationsError={
        notificationsQuery.isError && !notificationsQuery.data
      }
      onRetryBookings={() => {
        void bookingsQuery.refetch();
        void notificationsQuery.refetch();
      }}
    />
  );
}
