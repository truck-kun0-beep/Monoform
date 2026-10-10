"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "@/components/ui";

type Props = {
  title: string;
  /** Optional small label rendered next to the title. */
  summary?: ReactNode;
  /** Default open state. Defaults to `true`. */
  defaultOpen?: boolean;
  /** Force the section into a fixed open / closed state. */
  open?: boolean;
  /** Hide the chevron toggle (used inside drawers). */
  collapsible?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Collapsible section used inside the catalogue filter panel.
 *
 * Renders an accessible `<details>`-like disclosure so the controls
 * remain reachable with the keyboard and announced correctly by
 * screen readers. The toggle is suppressed when `collapsible` is
 * `false`, in which case the body is always visible.
 */
export function FilterSection({
  title,
  summary,
  defaultOpen = true,
  open,
  collapsible = true,
  children,
  className,
}: Props) {
  const reactId = useId();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const contentId = `filter-section-${reactId}`;

  if (!collapsible) {
    return (
      <section className={cn("border-t border-line py-5 first:border-t-0", className)}>
        <header className="mb-3 flex items-baseline justify-between gap-3">
          <h3 className="text-eyebrow uppercase text-ink">{title}</h3>
          {summary ? (
            <span className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">
              {summary}
            </span>
          ) : null}
        </header>
        {children}
      </section>
    );
  }

  return (
    <section className={cn("border-t border-line py-5 first:border-t-0", className)}>
      <h3>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={() => {
            if (!isControlled) setInternalOpen((value) => !value);
          }}
          className={cn(
            "flex w-full items-center justify-between gap-3 py-1 text-left",
            "text-eyebrow uppercase text-ink",
            "transition-colors hover:text-ink-soft",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          )}
        >
          <span className="flex items-baseline gap-2">
            {title}
            {summary ? (
              <span className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                {summary}
              </span>
            ) : null}
          </span>
          <ChevronDownIcon
            className={cn(
              "h-4 w-4 transition-transform duration-base ease-out-soft",
              isOpen ? "rotate-0" : "-rotate-90",
            )}
          />
        </button>
      </h3>
      <div
        id={contentId}
        hidden={!isOpen}
        className={cn("pt-3", isOpen ? "block" : "hidden")}
      >
        {children}
      </div>
    </section>
  );
}
