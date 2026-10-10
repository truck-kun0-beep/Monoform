"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { SORT_OPTIONS, type SortKey } from "@/lib/catalogue";
import { ChevronDownIcon } from "@/components/ui";

type Props = {
  value: SortKey;
  onChange: (value: SortKey) => void;
  /** Optional label override for the trigger. */
  label?: string;
  className?: string;
  /** Optional id used by external labels. */
  id?: string;
};

/**
 * Native `<select>` styled to match the editorial filters. A native
 * control is preferred over a custom popover because it ships with
 * the platform's keyboard, screen reader and mobile behaviours.
 */
export function SortSelect({
  value,
  onChange,
  label = "Sort",
  className,
  id,
}: Props) {
  const reactId = useId();
  const fieldId = id ?? `sort-select-${reactId}`;

  return (
    <label htmlFor={fieldId} className={cn("relative inline-flex items-center gap-2", className)}>
      <span className="text-eyebrow uppercase text-ink-muted">{label}</span>
      <span className="relative inline-flex items-center">
        <select
          id={fieldId}
          value={value}
          onChange={(event) => onChange(event.target.value as SortKey)}
          className={cn(
            "h-9 appearance-none border border-line bg-paper pr-8 pl-3 text-eyebrow uppercase text-ink",
            "transition-colors duration-base ease-out-soft",
            "hover:border-ink focus-visible:border-ink",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          )}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-ink-muted"
        />
      </span>
    </label>
  );
}
