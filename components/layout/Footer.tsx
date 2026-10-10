import Link from "next/link";
import { Logo } from "@/components/ui";
import { brand } from "@/config/brand";
import { footerNav } from "@/config/navigation";
import { NewsletterForm } from "@/components/newsletter";
import { CookieSettingsEntry } from "@/components/consent";

/**
 * Editorial site footer. Five columns of links + a newsletter
 * form + a legal strip with country / currency label and
 * copyright. Social links are rendered only when their `href`
 * is configured.
 */
export function Footer() {
  const year = new Date().getFullYear();
  const socialLinks = brand.social.filter((entry) => Boolean(entry.href));

  return (
    <footer className="mt-section border-t border-line bg-paper-warm">
      <div className="container-bleed py-section">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo />
            <p className="mt-4 max-w-prose text-sm text-ink-muted">
              {brand.description}
            </p>
            {socialLinks.length > 0 ? (
              <ul className="mt-6 flex flex-wrap gap-3" aria-label="Social links">
                {socialLinks.map((entry) => (
                  <li key={entry.label}>
                    <a
                      href={entry.href}
                      rel="noopener noreferrer"
                      target="_blank"
                      className="text-eyebrow uppercase text-ink-muted transition-colors hover:text-ink"
                    >
                      {entry.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <FooterColumn
            className="lg:col-span-2"
            title={footerNav.shop.title}
            links={footerNav.shop.links}
          />
          <FooterColumn
            className="lg:col-span-2"
            title={footerNav.customerService.title}
            links={footerNav.customerService.links}
          />
          <FooterColumn
            className="lg:col-span-2"
            title={footerNav.about.title}
            links={footerNav.about.links}
          />
          <div className="lg:col-span-2">
            <h3 className="text-eyebrow uppercase text-ink">
              {footerNav.newsletter.title}
            </h3>
            <p className="mt-4 text-sm text-ink-muted">
              Stay in the loop. Updates on new arrivals and the latest from
              MONOFORM.
            </p>
            <div className="mt-4">
              <NewsletterForm
                heading="Newsletter"
                source="footer"
                variant="stacked"
                submitLabel="Subscribe"
                className="text-left"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-bleed flex flex-col items-start justify-between gap-3 py-6 text-xs text-ink-muted sm:flex-row sm:items-center">
          <p>
            © {year} {brand.name}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <span>
              {brand.market.label} · {brand.market.currency} ({brand.market.currencySymbol})
            </span>
            <Link
              href="/privacy"
              className="link-underline text-ink-muted hover:text-ink"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="link-underline text-ink-muted hover:text-ink"
            >
              Terms
            </Link>
            <Link
              href="/contact"
              className="link-underline text-ink-muted hover:text-ink"
            >
              Contact
            </Link>
            <Link
              href="/help"
              className="link-underline text-ink-muted hover:text-ink"
            >
              Help
            </Link>
            <CookieSettingsEntry />
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
  className,
}: {
  title: string;
  links: { label: string; href: string }[];
  className?: string;
}) {
  return (
    <div className={className}>
      <h3 className="text-eyebrow uppercase text-ink">{title}</h3>
      <ul className="mt-4 space-y-2 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="link-underline text-ink-muted transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
