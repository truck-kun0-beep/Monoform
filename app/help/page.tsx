import Link from "next/link";
import { Button, Container, PageHeader, Section } from "@/components/ui";
import { helpLanding } from "@/config/content";
import { getCurrentUser } from "@/lib/auth/require";
import { support } from "@/config/support";

export const metadata = {
  title: "Help Centre",
  description: helpLanding.description,
};

type HelpLink = { label: string; description: string; href: string };

const HELP_LINKS: HelpLink[] = [
  {
    label: "Shipping information",
    description: "Delivery zones, fees and the order-to-delivery journey.",
    href: "/help/shipping",
  },
  {
    label: "Returns and exchanges",
    description: "Eligibility, condition and how to request a return.",
    href: "/help/returns",
  },
  {
    label: "Size guide",
    description: "Measurements and fit notes for each clothing category.",
    href: "/help/size-guide",
  },
  {
    label: "Frequently asked questions",
    description: "Quick answers about orders, delivery, payment and returns.",
    href: "/help/faq",
  },
  {
    label: "Track an order",
    description:
      "Look up the status of an order with your order number and phone.",
    href: "/track-order",
  },
  {
    label: "Contact support",
    description: "Send the support team a message using the contact form.",
    href: "/contact",
  },
];

export default async function HelpPage() {
  const user = await getCurrentUser();
  const showSignedInOrderAction = Boolean(user);

  return (
    <>
      <Section spacing="md" tone="paper" className="border-b border-line">
        <Container>
          <PageHeader
            eyebrow="Help"
            title={helpLanding.heading}
            description={helpLanding.description}
          />
        </Container>
      </Section>

      <Section spacing="lg" tone="paper">
        <Container>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {HELP_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex h-full flex-col border border-line bg-paper-warm p-6 transition-colors hover:border-ink"
              >
                <span className="text-eyebrow uppercase text-ink-muted">
                  {link.label}
                </span>
                <span className="mt-3 text-sm text-ink">{link.description}</span>
                <span className="mt-auto pt-6 text-xs uppercase tracking-[0.18em] text-ink-muted group-hover:text-ink">
                  Read more →
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-16 border-t border-line pt-10">
            <h2 className="text-display-sm text-ink">
              {helpLanding.orderHelp.title}
            </h2>
            <p className="mt-3 max-w-prose text-sm text-ink-muted">
              {helpLanding.orderHelp.body}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {showSignedInOrderAction ? (
                <Button
                  href={helpLanding.orderHelp.signedInAction.href}
                  variant="primary"
                  size="md"
                >
                  {helpLanding.orderHelp.signedInAction.label}
                </Button>
              ) : null}
              <Button
                href={helpLanding.orderHelp.guestAction.href}
                variant="secondary"
                size="md"
              >
                {helpLanding.orderHelp.guestAction.label}
              </Button>
              {support.publicEmail ? (
                <Button href="/contact" variant="ghost" size="md">
                  Contact support
                </Button>
              ) : null}
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
