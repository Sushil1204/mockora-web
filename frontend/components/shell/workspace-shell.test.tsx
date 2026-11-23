import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PublicUser } from "@/lib/types";

import { WorkspaceShell } from "./workspace-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/bookings",
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const user: PublicUser = {
  id: "user-1",
  email: "candidate@example.com",
  name: "Avery Candidate",
  avatarUrl: null,
  countryCode: "IN",
  preferredLanguage: "en",
  emailVerifiedAt: null,
  accountStatus: "ACTIVE",
  roles: ["CANDIDATE"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("WorkspaceShell", () => {
  it("renders candidate navigation with the active destination", () => {
    render(
      <WorkspaceShell user={user} unreadCount={2}>
        <main id="main-content">Workspace content</main>
      </WorkspaceShell>,
    );

    expect(screen.getByText("Workspace content")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", {
        name: /candidate workspace navigation/i,
      }),
    ).toBeInTheDocument();

    const bookingLinks = screen.getAllByRole("link", { name: "Bookings" });
    expect(bookingLinks).toHaveLength(2);
    bookingLinks.forEach((link) => {
      expect(link).toHaveAttribute("aria-current", "page");
    });

    expect(
      screen.queryByRole("link", { name: "Admin console" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Expert workspace" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Avery Candidate").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /account menu/i }),
    ).toBeInTheDocument();
  });

  it("shows unread notification state", () => {
    render(
      <WorkspaceShell user={user} unreadCount={4}>
        <main id="main-content">Workspace content</main>
      </WorkspaceShell>,
    );

    expect(
      screen.getByRole("link", {
        name: /notifications, 4 unread/i,
      }),
    ).toBeInTheDocument();
  });
});
