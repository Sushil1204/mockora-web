import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function TabLink({
  href,
  active,
  children,
  count,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
  count?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-control px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
        active
          ? "bg-primary-600 text-white"
          : "text-muted hover:bg-surface-muted hover:text-foreground",
      )}
    >
      {children}
      {typeof count === "number" ? (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[11px]",
            active ? "bg-white/15" : "bg-surface-muted",
          )}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
