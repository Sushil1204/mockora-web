import type { Role } from "./types";

export type WorkspaceSection = "candidate" | "expert" | "admin";

export type WorkspaceNavItem = {
  href: string;
  label: string;
};

export type WorkspaceNavGroup = {
  label: string;
  items: WorkspaceNavItem[];
};

export type WorkspaceNavigation = {
  sectionLabel: string;
  homeHref: string;
  groups: WorkspaceNavGroup[];
  mobileHrefs: string[];
};

export type RoleDestination = {
  role: Role;
  label: string;
  href: string;
};

const roleLabels: Record<Role, string> = {
  CANDIDATE: "Candidate",
  EXPERT: "Expert",
  ADMIN: "Administrator",
};

export function resolveWorkspaceSection(pathname: string): WorkspaceSection {
  if (pathname.startsWith("/workspace/admin")) return "admin";
  if (pathname.startsWith("/workspace/expert")) return "expert";
  return "candidate";
}

export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/account" || href === "/workspace/expert") {
    return pathname === href;
  }

  if (href === "/workspace/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getRoleDestinations(roles: Role[]): RoleDestination[] {
  const destinations: RoleDestination[] = [];

  if (roles.includes("CANDIDATE")) {
    destinations.push({
      role: "CANDIDATE",
      label: roleLabels.CANDIDATE,
      href: "/account",
    });
  }

  if (roles.includes("EXPERT")) {
    destinations.push({
      role: "EXPERT",
      label: roleLabels.EXPERT,
      href: "/workspace/expert",
    });
  }

  if (roles.includes("ADMIN")) {
    destinations.push({
      role: "ADMIN",
      label: roleLabels.ADMIN,
      href: "/workspace/admin",
    });
  }

  return destinations;
}

export function getWorkspaceNavigation(
  section: WorkspaceSection,
  roles: Role[],
): WorkspaceNavigation {
  const candidateItems: WorkspaceNavItem[] = [
    { href: "/account", label: "Overview" },
    { href: "/experts", label: "Find experts" },
  ];

  if (roles.includes("CANDIDATE")) {
    candidateItems.push({ href: "/bookings", label: "Bookings" });
  }

  candidateItems.push({ href: "/notifications", label: "Notifications" });

  if (roles.includes("CANDIDATE")) {
    candidateItems.push({ href: "/candidate/profile", label: "Profile" });
  }

  if (section === "expert") {
    return {
      sectionLabel: "Expert workspace",
      homeHref: "/workspace/expert",
      groups: [
        {
          label: "Workspace",
          items: [
            { href: "/workspace/expert", label: "Overview" },
            { href: "/workspace/expert/bookings", label: "Booking requests" },
            { href: "/workspace/expert/availability", label: "Availability" },
            { href: "/workspace/expert/profile", label: "Profile" },
            { href: "/notifications", label: "Notifications" },
          ],
        },
      ],
      mobileHrefs: [
        "/workspace/expert",
        "/workspace/expert/bookings",
        "/workspace/expert/availability",
        "/workspace/expert/profile",
      ],
    };
  }

  if (section === "admin") {
    return {
      sectionLabel: "Administration",
      homeHref: "/workspace/admin",
      groups: [
        {
          label: "Overview",
          items: [{ href: "/workspace/admin", label: "Console" }],
        },
        {
          label: "People",
          items: [
            { href: "/workspace/admin/candidates", label: "Candidates" },
            { href: "/workspace/admin/experts", label: "Experts" },
          ],
        },
        {
          label: "Operations",
          items: [
            { href: "/workspace/admin/bookings", label: "Bookings" },
            { href: "/workspace/admin/feedback", label: "Feedback QA" },
          ],
        },
        {
          label: "Finance",
          items: [
            { href: "/workspace/admin/payments", label: "Payments" },
            { href: "/workspace/admin/refunds", label: "Refunds" },
            { href: "/workspace/admin/payouts", label: "Payouts" },
            { href: "/workspace/admin/pricing", label: "Pricing" },
          ],
        },
        {
          label: "Governance",
          items: [{ href: "/workspace/admin/audit-logs", label: "Audit logs" }],
        },
      ],
      mobileHrefs: [
        "/workspace/admin",
        "/workspace/admin/bookings",
        "/workspace/admin/candidates",
        "/workspace/admin/experts",
      ],
    };
  }

  return {
    sectionLabel: "Candidate workspace",
    homeHref: "/account",
    groups: [{ label: "Workspace", items: candidateItems }],
    mobileHrefs: [
      "/account",
      "/experts",
      ...(roles.includes("CANDIDATE") ? ["/bookings"] : []),
      "/notifications",
    ],
  };
}
