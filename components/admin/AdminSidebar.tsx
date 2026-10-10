import Link from "next/link";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_ITEMS } from "./AdminShell";

type Props = {
  /** Current pathname so the active item is highlighted. */
  current: string;
  className?: string;
};

/**
 * Vertical sidebar used on every `/admin/*` page on desktop. The
 * current-page state is driven by the URL on the server so the
 * sidebar renders correctly without any client-side state. A
 * "Back to storefront" link sits at the bottom so the operator can
 * quickly return to the public site.
 */
export function AdminSidebar({ current, className }: Props) {
  return (
    <nav
      aria-label="Admin"
      className={cn("border border-line bg-paper p-6", className)}
    >
      <h2 className="text-eyebrow uppercase text-ink-muted">Admin</h2>
      <ul className="mt-4 space-y-1">
        {ADMIN_NAV_ITEMS.map((item) => {
          const isCurrent = item.match
            ? item.match(current)
            : item.href === current;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "block py-2 text-sm transition-colors",
                  isCurrent
                    ? "text-ink"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 border-t border-line pt-6">
        <Link
          href="/"
          className="block py-2 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          Back to storefront
        </Link>
      </div>
    </nav>
  );
}
