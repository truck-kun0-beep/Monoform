import type { ReactNode } from "react";
import { Container, Section } from "@/components/ui";
import { AccountSidebar } from "./AccountSidebar";
import { AccountMobileNav } from "./AccountMobileNav";

type Props = {
  /**
   * Current pathname (e.g. `/account/profile`). Used to highlight
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
 * Layout wrapper for every `/account/*` route.
 *
 * Provides a consistent editorial frame:
 *   - Page-level section spacing and background.
 *   - A desktop sidebar on the left, a mobile nav row on top.
 *   - The "My Account" heading and optional description.
 *
 * The sidebar and mobile nav are server components so they render
 * without hydration cost. The actual page data lives in the child
 * route.
 */
export function AccountShell({
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
          <p className="eyebrow">My Account</p>
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
          <AccountMobileNav current={current} />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[260px_1fr]">
          <div className="hidden lg:block">
            <AccountSidebar current={current} />
          </div>
          <div className="flex flex-col gap-8">{children}</div>
        </div>
      </Container>
    </Section>
  );
}
