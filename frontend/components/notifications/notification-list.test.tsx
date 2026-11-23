import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Notification } from "@/lib/types";

import { NotificationList } from "./notification-list";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

const notification: Notification = {
  id: "notification-1",
  type: "BOOKING_CONFIRMED",
  title: "Your booking is confirmed",
  body: "The interview slot is secured.",
  data: { bookingId: "booking-1" },
  readAt: null,
  isRead: false,
  createdAt: "2026-11-23T10:00:00.000Z",
};

describe("NotificationList", () => {
  it("shows unread state and links to the related booking", () => {
    render(
      <NotificationList
        initialNotifications={[notification]}
        initialUnreadCount={1}
      />,
    );

    expect(screen.getByText("1 unread notification")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view booking/i })).toHaveAttribute(
      "href",
      "/bookings/booking-1",
    );
    expect(
      screen.getByRole("button", { name: "Mark all as read" }),
    ).toBeEnabled();
  });

  it("renders the empty state when there are no notifications", () => {
    render(
      <NotificationList initialNotifications={[]} initialUnreadCount={0} />,
    );

    expect(
      screen.getByRole("heading", { name: "No notifications yet" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mark all as read" }),
    ).toBeDisabled();
  });
});
