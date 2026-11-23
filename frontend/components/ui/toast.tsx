"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

import { cn } from "@/lib/cn";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (input: Omit<ToastItem, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const icons: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle2 aria-hidden="true" className="h-5 w-5" />,
  error: <TriangleAlert aria-hidden="true" className="h-5 w-5" />,
  info: <Info aria-hidden="true" className="h-5 w-5" />,
};

const variantClasses: Record<ToastVariant, string> = {
  success: "border-success/20 text-success",
  error: "border-error/20 text-error",
  info: "border-info/20 text-info",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: Omit<ToastItem, "id">) => {
      const id = nextId.current++;
      setItems((current) => [...current.slice(-3), { ...input, id }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), 6000),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timer) => clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 bottom-20 z-[100] flex flex-col items-end gap-2 sm:bottom-6 sm:left-auto sm:right-6"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border bg-surface p-4 shadow-popover",
              variantClasses[item.variant],
            )}
          >
            <span className="mt-0.5 shrink-0">{icons[item.variant]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                {item.title}
              </p>
              {item.description ? (
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {item.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss notification"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
