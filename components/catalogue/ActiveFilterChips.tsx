"use client";

import { cn } from "@/lib/utils";
import { CloseIcon } from "@/components/ui";
import type { AppliedFilter } from "@/lib/catalogue";

type Props = {
  filters: AppliedFilter[];
  onRemove: (group: string, value: string) => void;
  onClearAll: () => void;
  className?: string;
};

/**
 * Compact list of removable chips representing every active filter.
 * Renders nothing when the filter set is empty so the toolbar stays
 * minimal for unfiltered browsing.
 */
export function ActiveFilterChips({
  filters,
  onRemove,
  onClearAll,
  className,
}: Props) {
  if (filters.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-t border-line pt-4",
        className,
      )}
      role="region"
      aria-label="Active filters"
    >
      <span className="text-eyebrow uppercase text-ink-muted">Active</span>
      <ul className="flex flex-wrap items-center gap-2" role="list">
        {filters.map((filter) => (
          <li key={`${filter.group}-${filter.value}`}>
            <button
              type="button"
              onClick={() => onRemove(filter.group, filter.value)}
              className={cn(
                "group inline-flex items-center gap-1.5 border border-line bg-paper px-2.5 py-1 text-eyebrow uppercase text-ink",
                "transition-colors duration-base ease-out-soft",
                "hover:border-ink hover:bg-ink hover:text-paper",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
              )}
              aria-label={`Remove filter: ${filter.label}`}
            >
              <span>{filter.label}</span>
              <CloseIcon
                aria-hidden="true"
                className="h-3 w-3 text-ink-muted transition-colors group-hover:text-paper"
              />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClearAll}
        className={cn(
          "ml-auto link-underline text-eyebrow uppercase text-ink-muted",
        )}
      >
        Clear all
      </button>
    </div>
  );
}
