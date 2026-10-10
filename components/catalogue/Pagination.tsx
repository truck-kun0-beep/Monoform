"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui";

type Props = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
};

/**
 * Compact numbered pagination control. Collapses to a smaller window
 * on mobile while keeping the previous / next controls always
 * available. Hidden entirely when there is only one page.
 */
export function Pagination({ page, totalPages, onChange, className }: Props) {
  const items = useMemo(() => buildPageItems(page, totalPages), [page, totalPages]);

  if (totalPages <= 1) return null;

  const goTo = (next: number) => {
    if (next < 1 || next > totalPages || next === page) return;
    onChange(next);
  };

  return (
    <nav
      aria-label="Catalogue pagination"
      className={cn("flex flex-wrap items-center justify-center gap-2", className)}
    >
      <button
        type="button"
        onClick={() => goTo(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={cn(
          "inline-flex h-9 items-center gap-1 border border-line px-3 text-eyebrow uppercase text-ink",
          "transition-colors duration-base ease-out-soft",
          "hover:border-ink hover:bg-ink hover:text-paper",
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-paper disabled:hover:text-ink",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        )}
      >
        <ChevronLeftIcon aria-hidden="true" className="h-3.5 w-3.5" />
        Previous
      </button>
      <ol className="flex items-center gap-1" role="list">
        {items.map((item, index) => {
          if (item === "…") {
            return (
              <li
                key={`gap-${index}`}
                aria-hidden="true"
                className="px-2 text-eyebrow text-ink-muted"
              >
                …
              </li>
            );
          }
          const value = item;
          const isActive = value === page;
          return (
            <li key={value}>
              <button
                type="button"
                onClick={() => goTo(value)}
                aria-current={isActive ? "page" : undefined}
                aria-label={`Page ${value}`}
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center text-eyebrow uppercase tabular-nums",
                  "transition-colors duration-base ease-out-soft",
                  isActive
                    ? "border border-ink bg-ink text-paper"
                    : "border border-line text-ink hover:border-ink hover:bg-ink hover:text-paper",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                )}
              >
                {value}
              </button>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        onClick={() => goTo(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className={cn(
          "inline-flex h-9 items-center gap-1 border border-line px-3 text-eyebrow uppercase text-ink",
          "transition-colors duration-base ease-out-soft",
          "hover:border-ink hover:bg-ink hover:text-paper",
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-paper disabled:hover:text-ink",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        )}
      >
        Next
        <ChevronRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </nav>
  );
}

function buildPageItems(page: number, totalPages: number): Array<number | "…"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const items: Array<number | "…"> = [];
  const windowStart = Math.max(2, page - 1);
  const windowEnd = Math.min(totalPages - 1, page + 1);

  items.push(1);
  if (windowStart > 2) items.push("…");
  for (let i = windowStart; i <= windowEnd; i += 1) items.push(i);
  if (windowEnd < totalPages - 1) items.push("…");
  items.push(totalPages);
  return items;
}
