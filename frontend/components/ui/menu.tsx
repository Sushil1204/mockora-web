"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export type MenuItem = {
  label: string;
  href?: string;
  onSelect?: () => void;
  icon?: ReactNode;
  danger?: boolean;
};

export function DropdownMenu({
  label,
  buttonLabel,
  trigger,
  items,
  align = "end",
  className,
  menuClassName,
}: {
  label: string;
  buttonLabel?: string;
  trigger: ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
  className?: string;
  menuClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    const frame = requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>("[data-menu-item]")?.focus();
    });

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(frame);
    };
  }, [open]);

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>("[data-menu-item]") ?? [],
    );
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex =
        (currentIndex + direction + items.length) % items.length;
      items[nextIndex]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items.at(-1)?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={buttonLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        {trigger}
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          className={cn(
            "absolute top-full z-50 mt-2 min-w-56 rounded-card border border-border bg-surface p-1.5 shadow-popover",
            align === "end" ? "right-0" : "left-0",
            menuClassName,
          )}
        >
          {items.map((item) => {
            const itemClass = cn(
              "flex w-full items-center gap-2.5 rounded-control px-3 py-2.5 text-left text-sm font-medium outline-none transition-colors focus:bg-surface-muted",
              item.danger
                ? "text-error hover:bg-error-soft"
                : "text-foreground hover:bg-surface-muted",
            );

            if (item.href) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  role="menuitem"
                  data-menu-item
                  tabIndex={-1}
                  onClick={() => setOpen(false)}
                  className={itemClass}
                >
                  {item.icon ? (
                    <span className="shrink-0 text-muted">{item.icon}</span>
                  ) : null}
                  {item.label}
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                data-menu-item
                tabIndex={-1}
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}
                className={itemClass}
              >
                {item.icon ? (
                  <span className="shrink-0 text-muted">{item.icon}</span>
                ) : null}
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
