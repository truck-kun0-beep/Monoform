import { Container, Section } from "@/components/ui";
import { ContinueShoppingLink } from "./ContinueShoppingLink";

type QuickLink = {
  label: string;
  href: string;
};

type Props = {
  /** Optional list of category quick-links rendered beneath the CTA. */
  quickLinks?: QuickLink[];
  className?: string;
};

const DEFAULT_QUICK_LINKS: QuickLink[] = [
  { label: "Women", href: "/women" },
  { label: "Men", href: "/men" },
  { label: "Underwear", href: "/underwear" },
  { label: "New Arrivals", href: "/new-arrivals" },
];

/**
 * Empty cart state. Renders the page-level chrome (Section / Container)
 * and a polished editorial empty state. No delivery fee is shown
 * because the cart is empty.
 */
export function EmptyCartState({
  quickLinks = DEFAULT_QUICK_LINKS,
  className,
}: Props) {
  return (
    <Section spacing="lg" tone="paper" className={className}>
      <Container>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="eyebrow">Your Bag</p>
            <h1 className="mt-2 text-display-xl text-ink">Your bag is empty.</h1>
            <p className="mt-4 max-w-prose text-sm text-ink-muted">
              Nothing here yet. Discover the latest arrivals and curated edits
              to begin.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ContinueShoppingLink variant="button" href="/new-arrivals" />
              <ContinueShoppingLink href="/women" label="Shop Women" />
              <ContinueShoppingLink href="/men" label="Shop Men" />
            </div>

            {quickLinks.length > 0 ? (
              <nav
                aria-label="Shop categories"
                className="mt-12 border-t border-line pt-6"
              >
                <p className="eyebrow">Explore the catalogue</p>
                <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                  {quickLinks.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="link-underline text-sm text-ink"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
          </div>
          <div aria-hidden="true" />
        </div>
      </Container>
    </Section>
  );
}
