"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  Circle,
  Clock3,
  CreditCard,
  Inbox,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MessageSquareText,
  RotateCcw,
  ScrollText,
  Search,
  ShieldCheck,
  Tags,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DropdownMenu, type MenuItem } from "@/components/ui/menu";
import { cn } from "@/lib/cn";
import {
  getRoleDestinations,
  getWorkspaceNavigation,
  isNavItemActive,
  resolveWorkspaceSection,
  type WorkspaceNavItem,
} from "@/lib/navigation";
import type { PublicUser, Role } from "@/lib/types";
import { useLogout } from "@/lib/use-logout";

import { Logo } from "./logo";
import { SkipLink } from "./skip-link";

const navIcons: Record<string, LucideIcon> = {
  "/account": LayoutDashboard,
  "/experts": Search,
  "/bookings": CalendarDays,
  "/notifications": Bell,
  "/candidate/profile": UserRound,
  "/workspace/expert": BriefcaseBusiness,
  "/workspace/expert/bookings": Inbox,
  "/workspace/expert/availability": Clock3,
  "/workspace/expert/profile": UserRound,
  "/workspace/admin": LayoutDashboard,
  "/workspace/admin/candidates": Users,
  "/workspace/admin/experts": BadgeCheck,
  "/workspace/admin/bookings": CalendarDays,
  "/workspace/admin/feedback": MessageSquareText,
  "/workspace/admin/payments": CreditCard,
  "/workspace/admin/refunds": RotateCcw,
  "/workspace/admin/payouts": Landmark,
  "/workspace/admin/pricing": Tags,
  "/workspace/admin/audit-logs": ScrollText,
};

const roleIcons: Record<Role, LucideIcon> = {
  CANDIDATE: UserRound,
  EXPERT: BriefcaseBusiness,
  ADMIN: ShieldCheck,
};

const mobileLabels: Record<string, string> = {
  "/experts": "Experts",
  "/notifications": "Alerts",
  "/workspace/expert/bookings": "Requests",
  "/workspace/admin/candidates": "People",
};

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: WorkspaceNavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = navIcons[item.href] ?? Circle;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-2.5 rounded-control px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
        active
          ? "bg-primary-50 font-semibold text-primary-700"
          : "text-muted hover:bg-surface-muted hover:text-foreground",
      )}
    >
      <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function NotificationLink({ unreadCount }: { unreadCount: number }) {
  return (
    <Link
      href="/notifications"
      aria-label={
        unreadCount > 0
          ? `Notifications, ${unreadCount} unread`
          : "Notifications"
      }
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      <Bell aria-hidden="true" className="h-5 w-5" />
      {unreadCount > 0 ? (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta-500 px-1 text-[10px] font-bold leading-none text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}

function roleDestinationLabel(role: Role): string {
  if (role === "ADMIN") return "Admin console";
  if (role === "EXPERT") return "Expert workspace";
  return "Candidate workspace";
}

export function WorkspaceShell({
  user,
  unreadCount,
  children,
}: {
  user: PublicUser;
  unreadCount: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const section = resolveWorkspaceSection(pathname);
  const navigation = getWorkspaceNavigation(section, user.roles);
  const [moreOpen, setMoreOpen] = useState(false);
  const { logout, pending } = useLogout();

  const flatItems = navigation.groups.flatMap((group) => group.items);
  const activeItem = flatItems.find((item) =>
    isNavItemActive(item.href, pathname),
  );
  const currentLabel = activeItem?.label ?? navigation.sectionLabel;
  const roleDestinations = getRoleDestinations(user.roles);

  const accountItems: MenuItem[] = [
    {
      label: "Account overview",
      href: "/account",
      icon: <LayoutDashboard aria-hidden="true" className="h-4 w-4" />,
    },
  ];

  if (user.roles.includes("CANDIDATE")) {
    accountItems.push({
      label: "Candidate profile",
      href: "/candidate/profile",
      icon: <UserRound aria-hidden="true" className="h-4 w-4" />,
    });
  }

  for (const destination of roleDestinations) {
    if (destination.href === navigation.homeHref) continue;

    const Icon = roleIcons[destination.role];
    accountItems.push({
      label: `Switch to ${roleDestinationLabel(destination.role).toLowerCase()}`,
      href: destination.href,
      icon: <Icon aria-hidden="true" className="h-4 w-4" />,
    });
  }

  accountItems.push({
    label: pending ? "Signing out…" : "Sign out",
    onSelect: () => {
      void logout();
    },
    icon: <LogOut aria-hidden="true" className="h-4 w-4" />,
    danger: true,
  });

  return (
    <div className="min-h-dvh bg-background">
      <SkipLink />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
          <Logo />
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto px-3 py-5">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-terracotta-600">
            {navigation.sectionLabel}
          </p>

          <nav
            aria-label={`${navigation.sectionLabel} navigation`}
            className="mt-3"
          >
            {navigation.groups.map((group, groupIndex) => (
              <div
                key={group.label}
                className={groupIndex > 0 ? "mt-5" : undefined}
              >
                {navigation.groups.length > 1 ? (
                  <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                    {group.label}
                  </p>
                ) : null}
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <NavLink
                        item={item}
                        active={isNavItemActive(item.href, pathname)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="shrink-0 border-t border-border p-4">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} src={user.avatarUrl} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {user.name}
              </p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="lg:hidden">
                <Logo compact />
              </div>
              <div className="min-w-0">
                <p className="hidden truncate text-[11px] font-medium uppercase tracking-[0.12em] text-muted lg:block">
                  {navigation.sectionLabel}
                </p>
                <p className="truncate text-sm font-semibold text-foreground">
                  {currentLabel}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <NotificationLink unreadCount={unreadCount} />
              <span
                aria-hidden="true"
                className="mx-1 hidden h-6 w-px bg-border sm:block"
              />
              <DropdownMenu
                label={`Account menu for ${user.name}`}
                trigger={
                  <>
                    <span className="sr-only">Account menu</span>
                    <Avatar name={user.name} src={user.avatarUrl} size="sm" />
                    <span className="hidden max-w-28 truncate md:inline">
                      {user.name}
                    </span>
                    <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
                  </>
                }
                items={accountItems}
                menuClassName="max-h-[min(70vh,32rem)] overflow-y-auto"
              />
            </div>
          </div>
        </header>

        <div className="pb-24 lg:pb-0">{children}</div>
      </div>

      <nav
        aria-label="Mobile workspace navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-stretch">
          {navigation.mobileHrefs.map((href) => {
            const item = flatItems.find((entry) => entry.href === href);
            if (!item) return null;
            const Icon = navIcons[href] ?? Circle;
            const active = isNavItemActive(href, pathname);

            return (
              <li key={href} className="min-w-0 flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors",
                    active ? "text-primary-700" : "text-muted",
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className={cn("h-5 w-5", active && "stroke-[2.4]")}
                  />
                  <span className="max-w-full truncate">
                    {mobileLabels[item.href] ?? item.label}
                  </span>
                </Link>
              </li>
            );
          })}

          <li className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-expanded={moreOpen}
              className="flex min-h-14 w-full flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium text-muted transition-colors"
            >
              <LayoutGrid aria-hidden="true" className="h-5 w-5" />
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>

      <Dialog
        open={moreOpen}
        onOpenChange={setMoreOpen}
        title="More"
        description="All workspace sections and account links."
        variant="sheet"
      >
        <nav aria-label="All workspace sections">
          {navigation.groups.map((group) => (
            <div key={group.label} className="mb-4 last:mb-0">
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      item={item}
                      active={isNavItemActive(item.href, pathname)}
                      onNavigate={() => setMoreOpen(false)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mt-5 space-y-1 border-t border-border pt-5">
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Account
          </p>
          {roleDestinations
            .filter((destination) => destination.href !== navigation.homeHref)
            .map((destination) => {
              const Icon = roleIcons[destination.role];

              return (
                <Link
                  key={destination.href}
                  href={destination.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex min-h-11 items-center gap-2.5 rounded-control px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-muted"
                >
                  <Icon aria-hidden="true" className="h-4 w-4 text-muted" />
                  {roleDestinationLabel(destination.role)}
                </Link>
              );
            })}
          <Button
            variant="ghost"
            className="w-full justify-start"
            loading={pending}
            onClick={() => {
              setMoreOpen(false);
              void logout();
            }}
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            {pending ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
