"use client";

import Link from "next/link";
import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DropdownMenu, type MenuItem } from "@/components/ui/menu";
import { useLogout } from "@/lib/use-logout";
import type { PublicUser } from "@/lib/types";

import { Logo } from "./logo";

function NotificationBell({
  unreadCount,
  onNavigate,
}: {
  unreadCount: number;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href="/notifications"
      onClick={onNavigate}
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

function MobileLink({
  href,
  children,
  onNavigate,
  active,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "block rounded-control bg-primary-50 px-3 py-3 text-sm font-semibold text-primary-700"
          : "block rounded-control px-3 py-3 text-sm font-medium text-foreground hover:bg-surface-muted"
      }
    >
      {children}
    </Link>
  );
}

export function PublicHeader({
  user,
  unreadCount,
}: {
  user: PublicUser | null;
  unreadCount: number;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { logout, pending } = useLogout();
  const closeMenu = () => setMenuOpen(false);
  const findExpertsActive = pathname.startsWith("/experts");
  const accountActive = pathname === "/account";

  const accountItems: MenuItem[] = [
    {
      label: "Account overview",
      href: "/account",
      icon: <LayoutDashboard aria-hidden="true" className="h-4 w-4" />,
    },
  ];

  if (user?.roles.includes("CANDIDATE")) {
    accountItems.push(
      {
        label: "Bookings",
        href: "/bookings",
        icon: <CalendarDays aria-hidden="true" className="h-4 w-4" />,
      },
      {
        label: "Candidate profile",
        href: "/candidate/profile",
        icon: <UserRound aria-hidden="true" className="h-4 w-4" />,
      },
    );
  }

  if (user?.roles.includes("EXPERT")) {
    accountItems.push({
      label: "Expert workspace",
      href: "/workspace/expert",
      icon: <BriefcaseBusiness aria-hidden="true" className="h-4 w-4" />,
    });
  }

  if (user?.roles.includes("ADMIN")) {
    accountItems.push({
      label: "Admin console",
      href: "/workspace/admin",
      icon: <ShieldCheck aria-hidden="true" className="h-4 w-4" />,
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
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6"
      >
        <Logo />

        <div className="hidden items-center gap-1 md:flex">
          <Link
            href="/experts"
            aria-current={findExpertsActive ? "page" : undefined}
            className={
              findExpertsActive
                ? "rounded-control bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700"
                : "rounded-control px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            }
          >
            Find experts
          </Link>

          {user ? (
            <>
              <Link
                href="/account"
                aria-current={accountActive ? "page" : undefined}
                className={
                  accountActive
                    ? "rounded-control bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700"
                    : "rounded-control px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                }
              >
                Dashboard
              </Link>
              <NotificationBell unreadCount={unreadCount} />
              <DropdownMenu
                label={`Account menu for ${user.name}`}
                trigger={
                  <>
                    <span className="sr-only">Account menu</span>
                    <Avatar name={user.name} src={user.avatarUrl} size="sm" />
                    <span className="hidden max-w-28 truncate lg:inline">
                      {user.name}
                    </span>
                    <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
                  </>
                }
                items={accountItems}
              />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-control px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                Sign in
              </Link>
              <Link href="/register" className={buttonClasses({ size: "sm" })}>
                Create account
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          {user ? <NotificationBell unreadCount={unreadCount} /> : null}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="inline-flex h-11 w-11 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <MenuIcon aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </nav>

      <Dialog
        open={menuOpen}
        onOpenChange={setMenuOpen}
        title="Menu"
        description="Browse experts and reach your workspace."
        variant="sheet"
      >
        <nav aria-label="Mobile navigation" className="space-y-1">
          <MobileLink
            href="/experts"
            onNavigate={closeMenu}
            active={findExpertsActive}
          >
            <span className="inline-flex items-center gap-2.5">
              <Search aria-hidden="true" className="h-4 w-4" />
              Find experts
            </span>
          </MobileLink>

          {user ? (
            <>
              <MobileLink
                href="/account"
                onNavigate={closeMenu}
                active={accountActive}
              >
                <span className="inline-flex items-center gap-2.5">
                  <LayoutDashboard aria-hidden="true" className="h-4 w-4" />
                  Dashboard
                </span>
              </MobileLink>
              {user.roles.includes("CANDIDATE") ? (
                <MobileLink href="/bookings" onNavigate={closeMenu}>
                  <span className="inline-flex items-center gap-2.5">
                    <CalendarDays aria-hidden="true" className="h-4 w-4" />
                    Bookings
                  </span>
                </MobileLink>
              ) : null}
              <MobileLink href="/notifications" onNavigate={closeMenu}>
                <span className="inline-flex items-center gap-2.5">
                  <Bell aria-hidden="true" className="h-4 w-4" />
                  Notifications
                </span>
              </MobileLink>
              {user.roles.includes("CANDIDATE") ? (
                <MobileLink href="/candidate/profile" onNavigate={closeMenu}>
                  <span className="inline-flex items-center gap-2.5">
                    <UserRound aria-hidden="true" className="h-4 w-4" />
                    Candidate profile
                  </span>
                </MobileLink>
              ) : null}
              {user.roles.includes("EXPERT") ? (
                <MobileLink href="/workspace/expert" onNavigate={closeMenu}>
                  <span className="inline-flex items-center gap-2.5">
                    <BriefcaseBusiness aria-hidden="true" className="h-4 w-4" />
                    Expert workspace
                  </span>
                </MobileLink>
              ) : null}
              {user.roles.includes("ADMIN") ? (
                <MobileLink href="/workspace/admin" onNavigate={closeMenu}>
                  <span className="inline-flex items-center gap-2.5">
                    <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                    Admin console
                  </span>
                </MobileLink>
              ) : null}
            </>
          ) : null}
        </nav>

        <div className="mt-5 border-t border-border pt-5">
          {user ? (
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                closeMenu();
                void logout();
              }}
              loading={pending}
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              {pending ? "Signing out…" : "Sign out"}
            </Button>
          ) : (
            <div className="grid gap-2">
              <Link
                href="/login"
                onClick={closeMenu}
                className={buttonClasses({
                  variant: "secondary",
                  className: "w-full",
                })}
              >
                Sign in
              </Link>
              <Link
                href="/register"
                onClick={closeMenu}
                className={buttonClasses({ className: "w-full" })}
              >
                Create account
              </Link>
            </div>
          )}
        </div>
      </Dialog>
    </header>
  );
}
