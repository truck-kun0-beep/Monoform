import type { ReactNode } from "react";
import Link from "next/link";
import { Container, Section } from "@/components/ui";
import { AdminSidebar } from "./AdminSidebar";

type Props = {
  /**
   * Current pathname (e.g. `/admin/orders/abc`). Used to highlight
   * the active entry in the navigation.
   */
  current: string;
  /** Optional heading rendered above the main content. */
  title?: string;
  /** Optional supporting copy under the heading. */
  description?: string;
  /** Page content. */
  children: ReactNode;
  className?: string;
};

/**
 * Layout wrapper for every `/admin/*` route.
 *
 * Mirrors `AccountShell` so the operator can switch between the
 * storefront and the dashboard without learning a new visual
 * language. The sidebar carries a "Back to storefront" link so the
 * operator can leave the dashboard at any time.
 */
export function AdminShell({
  current,
  title,
  description,
  children,
  className,
}: Props) {
  return (
    <Section spacing="lg" tone="paper" className={className}>
      <Container>
        <div className="flex flex-col gap-3">
          <p className="eyebrow text-warning">Store owner</p>
          {title ? (
            <h1 className="text-display-xl text-ink">{title}</h1>
          ) : null}
          {description ? (
            <p className="max-w-prose text-sm text-ink-muted">
              {description}
            </p>
          ) : null}
        </div>

        <div className="mt-10 lg:hidden">
          <AdminMobileNav current={current} />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[260px_1fr]">
          <div className="hidden lg:block">
            <AdminSidebar current={current} />
          </div>
          <div className="flex flex-col gap-8">{children}</div>
        </div>
      </Container>
    </Section>
  );
}

function AdminMobileNav({ current }: { current: string }) {
  return (
    <nav
      aria-label="Admin"
      className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6"
    >
      <ul className="flex w-max min-w-full items-center gap-2 border border-line bg-paper p-2">
        {ADMIN_NAV_ITEMS.map((item) => {
          const isCurrent = item.match
            ? item.match(current)
            : item.href === current;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isCurrent ? "page" : undefined}
                className={`inline-flex h-9 items-center px-3 text-eyebrow uppercase transition-colors ${
                  isCurrent
                    ? "bg-ink text-paper"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href="/"
            className="inline-flex h-9 items-center px-3 text-eyebrow uppercase text-ink-muted transition-colors hover:text-ink"
          >
            Storefront
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export const ADMIN_NAV_ITEMS: ReadonlyArray<{
  label: string;
  href: string;
  match?: (pathname: string) => boolean;
}> = [
  {
    label: "Overview",
    href: "/admin",
    match: (pathname) => pathname === "/admin",
  },
  {
    label: "Orders",
    href: "/admin/orders",
    match: (pathname) => pathname.startsWith("/admin/orders"),
  },
];
