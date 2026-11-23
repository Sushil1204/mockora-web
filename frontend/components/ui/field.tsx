import {
  Children,
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

export const inputBaseClass =
  "w-full rounded-control border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:bg-surface-muted";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputBaseClass, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(inputBaseClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputBaseClass, className)} {...props} />;
}

type FieldChildProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

export function Field({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-error">
            *
          </span>
        ) : null}
      </label>

      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child;

        const element = child as ReactElement<FieldChildProps>;
        const describedBy = [element.props["aria-describedby"], hintId, errorId]
          .filter(Boolean)
          .join(" ");

        return cloneElement(element, {
          id,
          "aria-describedby": describedBy || undefined,
          "aria-invalid": error ? true : undefined,
        });
      })}

      {hint ? (
        <p id={hintId} className="text-xs leading-relaxed text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
