import { describe, expect, it } from "vitest";

import {
  getRoleDestinations,
  getWorkspaceNavigation,
  isNavItemActive,
  resolveWorkspaceSection,
} from "./navigation";

describe("workspace navigation", () => {
  it("resolves the workspace section from the route", () => {
    expect(resolveWorkspaceSection("/account")).toBe("candidate");
    expect(resolveWorkspaceSection("/bookings/123")).toBe("candidate");
    expect(resolveWorkspaceSection("/workspace/expert/bookings")).toBe(
      "expert",
    );
    expect(resolveWorkspaceSection("/workspace/admin/candidates")).toBe(
      "admin",
    );
  });

  it("keeps admin destinations out of the candidate workspace", () => {
    const navigation = getWorkspaceNavigation("candidate", ["CANDIDATE"]);
    const hrefs = navigation.groups.flatMap((group) =>
      group.items.map((item) => item.href),
    );

    expect(hrefs).toContain("/bookings");
    expect(hrefs).not.toContain("/workspace/admin");
    expect(hrefs).not.toContain("/workspace/expert");
  });

  it("gives experts their operational navigation", () => {
    const navigation = getWorkspaceNavigation("expert", [
      "CANDIDATE",
      "EXPERT",
    ]);
    const hrefs = navigation.groups.flatMap((group) =>
      group.items.map((item) => item.href),
    );

    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/workspace/expert",
        "/workspace/expert/bookings",
        "/workspace/expert/availability",
        "/workspace/expert/profile",
      ]),
    );
    expect(hrefs).not.toContain("/workspace/admin");
  });

  it("preserves every admin destination in grouped navigation", () => {
    const navigation = getWorkspaceNavigation("admin", ["ADMIN"]);
    const hrefs = navigation.groups.flatMap((group) =>
      group.items.map((item) => item.href),
    );

    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/workspace/admin",
        "/workspace/admin/candidates",
        "/workspace/admin/experts",
        "/workspace/admin/bookings",
        "/workspace/admin/payments",
        "/workspace/admin/refunds",
        "/workspace/admin/payouts",
        "/workspace/admin/feedback",
        "/workspace/admin/pricing",
        "/workspace/admin/audit-logs",
      ]),
    );
  });

  it("matches active items without marking sibling routes active", () => {
    expect(isNavItemActive("/account", "/account")).toBe(true);
    expect(isNavItemActive("/account", "/account/bookings")).toBe(false);
    expect(isNavItemActive("/bookings", "/bookings/123")).toBe(true);
    expect(isNavItemActive("/workspace/admin", "/workspace/admin")).toBe(true);
    expect(
      isNavItemActive("/workspace/admin", "/workspace/admin/bookings"),
    ).toBe(false);
    expect(
      isNavItemActive(
        "/workspace/admin/bookings",
        "/workspace/admin/bookings/123",
      ),
    ).toBe(true);
  });

  it("only offers workspaces the account can access", () => {
    expect(getRoleDestinations(["CANDIDATE"])).toEqual([
      { role: "CANDIDATE", label: "Candidate", href: "/account" },
    ]);

    expect(getRoleDestinations(["CANDIDATE", "ADMIN"])).toEqual(
      expect.arrayContaining([
        { role: "CANDIDATE", label: "Candidate", href: "/account" },
        { role: "ADMIN", label: "Administrator", href: "/workspace/admin" },
      ]),
    );
  });
});
