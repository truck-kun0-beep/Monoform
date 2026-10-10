import Link from "next/link";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

type Crumb = {
  label: string;
  href?: string;
};

type Props = {
  items: Crumb[];
  className?: string;
};

/**
 * Lightweight breadcrumb used in product and category pages. Renders
 * an ordered list with a chevron-style separator. The final item is
 * rendered as plain text rather than a link.
 */
export function Breadcrumbs({ items, className }: Props) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-xs text-ink-muted", className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              <li>
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="link-underline uppercase tracking-[0.18em]"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? "page" : undefined}
                    className="uppercase tracking-[0.18em] text-ink"
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast ? (
                <li aria-hidden="true" className="px-1 text-ink-subtle">
                  /
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
