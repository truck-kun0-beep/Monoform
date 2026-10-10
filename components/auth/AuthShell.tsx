import type { ReactNode } from "react";
import Link from "next/link";
import { Container, Section } from "@/components/ui";
import { Logo } from "@/components/ui";

type Props = {
  children: ReactNode;
  /** Optional footer note rendered under the form card. */
  footer?: ReactNode;
  /** Suppress the outer section padding when embedding the form
   *  inside another page (e.g. an account sidebar). */
  contained?: boolean;
  className?: string;
};

/**
 * Shared layout for `/login`, `/register`, `/forgot-password` and
 * `/reset-password`. Renders the MONOFORM wordmark above a single
 * card with editorial padding, then optional secondary links below.
 */
export function AuthShell({ children, footer, className }: Props) {
  return (
    <Section spacing="lg" tone="paper" className={className}>
      <Container className="max-w-md">
        <div className="mb-8 flex justify-center">
          <Link
            href="/"
            aria-label="MONOFORM — home"
            className="inline-flex items-center"
          >
            <Logo />
          </Link>
        </div>
        <div className="border border-line bg-paper p-6 sm:p-8">{children}</div>
        {footer ? <div className="mt-8 text-sm text-ink-muted">{footer}</div> : null}
      </Container>
    </Section>
  );
}
