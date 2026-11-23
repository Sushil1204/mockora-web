import type { ReactNode } from "react";
import { AlertCircle, Inbox, RotateCcw } from "lucide-react";

import { cn } from "@/lib/cn";
import { buttonClasses } from "./button";

export type AlertVariant = "info" | "success" | "warning" | "danger";

const alertVariants: Record<AlertVariant, string> = {
  info: "border-info/20 bg-info-soft text-info",
  success: "border-success/20 bg-success-soft text-success",
  warning: "border-warning/20 bg-warning-soft text-warning",
  danger: "border-error/20 bg-error-soft text-error",
};

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: AlertVariant;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={cn(
        "rounded-control border px-4 py-3 text-sm leading-relaxed",
        alertVariants[variant],
        className,
      )}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? (
        <div className={title ? "mt-1" : undefined}>{children}</div>
      ) : null}
    </div>
  );
}

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-lg bg-surface-muted", className)}
      {...props}
    />
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-card border border-dashed border-border bg-surface p-8 text-center",
        className,
      )}
    >
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-muted">
        {icon ?? <Inbox aria-hidden="true" className="h-5 w-5" />}
      </div>
      <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </section>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  retryHref,
  className,
}: {
  title?: string;
  description?: ReactNode;
  retryHref?: string;
  className?: string;
}) {
  return (
    <section
      role="alert"
      className={cn(
        "rounded-card border border-error/20 bg-surface p-6 shadow-card",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-error-soft text-error">
          <AlertCircle aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {description}
            </p>
          ) : null}
          {retryHref ? (
            <a
              href={retryHref}
              className={buttonClasses({ size: "sm", className: "mt-4" })}
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Try again
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
