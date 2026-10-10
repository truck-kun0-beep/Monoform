import Link from "next/link";
import { cn } from "@/lib/utils";
import { renderAccountNavList } from "./nav";

type Props = {
  /** Current pathname used to mark the active item. */
  current: string;
  className?: string;
};

/**
 * Horizontal pill row used on small screens as the primary account
 * navigation. Each link is a real `<a>` so the navigation works
 * without JavaScript. The active link is marked with
 * `aria-current="page"` for assistive tech.
 */
export function AccountMobileNav({ current, className }: Props) {
  return (
    <nav
      aria-label="Account"
      className={cn(
        "-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6",
        className,
      )}
    >
      <ul className="flex w-max min-w-full items-center gap-2 border border-line bg-paper p-2">
        {renderAccountNavList(
          current,
          (item, isCurrent) => (
            <Link
              href={item.href}
              aria-current={isCurrent ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center px-3 text-eyebrow uppercase transition-colors",
                isCurrent
                  ? "bg-ink text-paper"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ),
        )}
        <li>
          <Link
            href="/"
            className="inline-flex h-9 items-center px-3 text-eyebrow uppercase text-ink-muted transition-colors hover:text-ink"
          >
            Shop
          </Link>
        </li>
      </ul>
    </nav>
  );
}
