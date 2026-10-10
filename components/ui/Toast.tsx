"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type ToastTone = "default" | "success" | "info" | "warning" | "danger";

export type Toast = {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Milliseconds before the toast auto-dismisses. Pass `null`
   *  to require manual dismissal. */
  durationMs?: number | null;
};

type ToastContextValue = {
  push: (toast: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_BORDER: Record<ToastTone, string> = {
  default: "border-line",
  success: "border-success/40",
  info: "border-info/40",
  warning: "border-warning/40",
  danger: "border-danger/40",
};

const TONE_DOT: Record<ToastTone, string> = {
  default: "bg-ink",
  success: "bg-success",
  info: "bg-info",
  warning: "bg-warning",
  danger: "bg-danger",
};

const DEFAULT_DURATION_MS = 4000;
const MAX_STACK = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback<ToastContextValue["dismiss"]>((id) => {
    setToasts((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const push = useCallback<ToastContextValue["push"]>((toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => {
      const next = [...current, { id, ...toast }];
      // Trim the stack so we never cover essential mobile
      // checkout controls. The most recent toasts win.
      return next.length > MAX_STACK ? next.slice(-MAX_STACK) : next;
    });
    const duration = toast.durationMs === undefined ? DEFAULT_DURATION_MS : toast.durationMs;
    if (duration !== null && duration > 0) {
      setTimeout(() => {
        setToasts((current) => current.filter((entry) => entry.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-toast flex justify-center px-4 motion-reduce:animate-none"
      >
        <ul className="flex w-full max-w-sm flex-col gap-2">
          {toasts.map((toast) => {
            const tone = toast.tone ?? "default";
            return (
              <li
                key={toast.id}
                className={cn(
                  "pointer-events-auto border bg-paper p-4 text-sm shadow-sm motion-reduce:animate-none",
                  TONE_BORDER[tone],
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                      TONE_DOT[tone],
                    )}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-ink">{toast.title}</p>
                    {toast.description ? (
                      <p className="mt-1 text-ink-muted">{toast.description}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(toast.id)}
                    className="text-eyebrow uppercase text-ink-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    aria-label="Dismiss notification"
                  >
                    ×
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      push: () => "",
      dismiss: () => undefined,
    };
  }
  return context;
}
