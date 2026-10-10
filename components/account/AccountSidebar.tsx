import Link from "next/link";
import { cn } from "@/lib/utils";
import { renderAccountNavList } from "./nav";
import { AccountSignOutForm } from "./AccountSignOutForm";

type Props = {
  /** Current pathname so the active item is highlighted. */
  current: string;
  className?: string;
};

/**
 * Vertical sidebar used on every `/account/*` page on desktop.
 * The current-page state is driven by the URL on the server so
 * the sidebar renders correctly without any client-side state.
 *
 * The sign-out form lives at the bottom of the sidebar so the
 * customer can sign out from any account page.
 */
export function AccountSidebar({ current, className }: Props) {
  return (
    <nav
      aria-label="Account"
      className={cn("border border-line bg-paper p-6", className)}
    >
      <h2 className="text-eyebrow uppercase text-ink-muted">My Account</h2>
      <ul className="mt-4 space-y-1">
        {renderAccountNavList(
          current,
          (item, isCurrent) => (
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
          ),
        )}
      </ul>
      <div className="mt-6 border-t border-line pt-6">
        <Link
          href="/"
          className="block py-2 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          Back to Shopping
        </Link>
        <div className="mt-4">
          <AccountSignOutForm />
        </div>
      </div>
    </nav>
  );
}
