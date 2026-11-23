"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/workspace/admin", label: "Overview" },
  { href: "/workspace/admin/candidates", label: "Candidates" },
  { href: "/workspace/admin/experts", label: "Experts" },
  { href: "/workspace/admin/bookings", label: "Bookings" },
  { href: "/workspace/admin/payments", label: "Payments" },
  { href: "/workspace/admin/refunds", label: "Refunds" },
  { href: "/workspace/admin/payouts", label: "Payouts" },
  { href: "/workspace/admin/feedback", label: "Feedback QA" },
  { href: "/workspace/admin/pricing", label: "Pricing" },
  { href: "/workspace/admin/audit-logs", label: "Audit logs" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="lg:sticky lg:top-24">
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {links.map((link) => {
          const active =
            link.href === "/workspace/admin"
              ? pathname === link.href
              : pathname.startsWith(link.href);

          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                  active
                    ? "bg-primary-600 text-white"
                    : "text-muted hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
