import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  body?: string;
  action?: { label: string; href: string };
  children?: ReactNode;
  className?: string;
  align?: "left" | "center";
};

/**
 * Empty state used for empty carts, wishlists, search results, etc.
 * Stays text-first to match the editorial tone of the site.
 */
export function EmptyState({
  title,
  body,
  action,
  children,
  className,
  align = "left",
}: Props) {
  return (
    <section
      className={cn(
        "py-16 sm:py-20",
        align === "center" && "text-center",
        className,
      )}
    >
      <h2 className="text-display-md text-ink">{title}</h2>
      {body ? (
        <p className="mt-3 max-w-prose text-sm text-ink-muted">
          {body}
        </p>
      ) : null}
      {action ? (
        <a
          href={action.href}
          className="link-underline mt-6 inline-block text-xs uppercase tracking-[0.2em]"
        >
          {action.label}
        </a>
      ) : null}
      {children}
    </section>
  );
}
