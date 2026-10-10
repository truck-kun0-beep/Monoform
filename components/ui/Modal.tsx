"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeStyles: Record<NonNullable<Props["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

/**
 * Foundation modal. The full cart drawer, size guide, and quick view
 * will build on top of this primitive. Behaviour:
 *  - Locks body scroll while open.
 *  - Closes on Escape.
 *  - Closes when the user clicks the backdrop.
 *  - Restores focus to the previously focused element on close.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size = "md",
}: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);

    // Move focus to the dialog so screen readers announce it.
    dialogRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center px-4"
      role="presentation"
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 animate-fade-in"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? "modal-description" : undefined}
        tabIndex={-1}
        className={cn(
          "relative z-modal w-full bg-paper p-8 shadow-sm animate-slide-up",
          sizeStyles[size],
          className,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="modal-title" className="text-display-md text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-eyebrow uppercase text-ink-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            aria-label="Close dialog"
          >
            Close
          </button>
        </div>
        {description ? (
          <p id="modal-description" className="mb-6 text-sm text-ink-muted">
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
