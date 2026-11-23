import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export type BadgeVariant =
  "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const variants: Record<BadgeVariant, string> = {
  neutral: "border-border bg-surface-muted text-muted",
  brand: "border-primary-200 bg-primary-50 text-primary-700",
  success: "border-success/20 bg-success-soft text-success",
  warning: "border-warning/20 bg-warning-soft text-warning",
  danger: "border-error/20 bg-error-soft text-error",
  info: "border-info/20 bg-info-soft text-info",
};

export function Badge({
  variant = "neutral",
  className,
  children,
  ...props
}: ComponentProps<"span"> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
