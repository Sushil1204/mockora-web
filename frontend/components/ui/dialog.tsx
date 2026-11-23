"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/cn";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  variant = "dialog",
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "dialog" | "sheet";
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open && typeof dialog.showModal === "function") {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onClose={() => onOpenChange(false)}
      onClick={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
      className={cn(
        "fixed m-0 w-full max-w-none overflow-y-auto border border-border bg-surface p-0 text-foreground shadow-dialog backdrop:bg-foreground/40 backdrop:backdrop-blur-[2px]",
        variant === "sheet"
          ? "inset-x-0 bottom-0 top-auto max-h-[85dvh] rounded-t-panel sm:inset-0 sm:m-auto sm:h-fit sm:max-w-lg sm:rounded-panel"
          : "inset-0 m-auto max-h-[85dvh] max-w-lg rounded-panel",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2
            id={titleId}
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            {title}
          </h2>
          {description ? (
            <p
              id={descriptionId}
              className="mt-1 text-sm leading-relaxed text-muted"
            >
              {description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close dialog"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>

      <div className="px-5 py-5">{children}</div>

      {footer ? (
        <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}
