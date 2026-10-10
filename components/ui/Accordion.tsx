"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Keyboard-friendly disclosure / accordion. Built on the native
 * `<details>` / `<summary>` element so it gets the right ARIA
 * semantics, focus behaviour and reduced-motion handling for free.
 *
 * Each item manages its own open state when the parent needs to
 * coordinate multiple panels (e.g. an "expand all" / "collapse all"
 * action) — in that case the parent can pass a `key` plus
 * `open` and `onToggle` props.
 */
export type AccordionItem = {
  id?: string;
  title: string;
  content: ReactNode;
};

type Props = {
  items: ReadonlyArray<AccordionItem>;
  /** Optional label for the surrounding region. */
  ariaLabel?: string;
  /** Optional className for the container. */
  className?: string;
};

export function Accordion({ items, ariaLabel, className }: Props) {
  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className={cn("divide-y divide-line border-y border-line", className)}
    >
      {items.map((item, index) => (
        <AccordionRow
          key={item.id ?? `${index}-${item.title}`}
          item={item}
        />
      ))}
    </div>
  );
}

function AccordionRow({ item }: { item: AccordionItem }) {
  const [open, setOpen] = useState(false);
  const headingId = useId();
  const panelId = useId();
  return (
    <div>
      <h3 id={headingId} className="text-base">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-4 py-5 text-left text-ink transition-colors hover:text-ink-soft"
        >
          <span className="font-medium">{item.title}</span>
          <span
            aria-hidden="true"
            className={cn(
              "inline-block h-2 w-2 border-r border-b border-ink transition-transform",
              open ? "rotate-[-135deg]" : "rotate-45",
            )}
          />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headingId}
        hidden={!open}
        className="pb-5 text-sm text-ink-muted"
      >
        {item.content}
      </div>
    </div>
  );
}
