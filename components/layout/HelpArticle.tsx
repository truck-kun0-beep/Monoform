import Link from "next/link";
import { Breadcrumbs } from "@/components/product";
import { Container, PageHeader, Section } from "@/components/ui";
import { footerNav } from "@/config/navigation";

type Crumb = { label: string; href?: string };

type Props = {
  title: string;
  description?: string;
  eyebrow?: string;
  crumbs?: Crumb[];
  children: React.ReactNode;
};

/**
 * Shared shell for the `/help/*` pages. Mirrors the original
 * `HelpIndex` layout (left-side nav on desktop, topic chips on
 * mobile) so the help centre has a single visual treatment. Pages
 * that need a wider article (e.g. the privacy policy) can opt
 * out of the left rail by passing a different layout via
 * `children`.
 */
export function HelpArticle({ title, description, eyebrow, crumbs, children }: Props) {
  const helpLinks = footerNav.customerService.links;
  return (
    <>
      <Section spacing="md" tone="paper" className="border-b border-line">
        <Container>
          {crumbs && crumbs.length > 0 ? (
            <Breadcrumbs items={crumbs} className="mb-6" />
          ) : null}
          <PageHeader
            eyebrow={eyebrow ?? "Help"}
            title={title}
            description={description}
          />
        </Container>
      </Section>
      <Section spacing="lg" tone="paper">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[240px_1fr]">
            <nav
              aria-label="Help topics"
              className="border border-line bg-paper-warm p-6"
            >
              <h2 className="text-eyebrow uppercase text-ink-muted">Topics</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {helpLinks.map((link) => (
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
            </nav>
            <article className="max-w-prose text-sm text-ink-muted">
              {children}
            </article>
          </div>
        </Container>
      </Section>
    </>
  );
}
