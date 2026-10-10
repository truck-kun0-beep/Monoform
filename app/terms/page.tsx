import Link from "next/link";
import { Container, DraftBanner, PageHeader, Section } from "@/components/ui";
import { termsPage } from "@/config/content";

export const metadata = {
  title: "Terms & conditions",
  description: "The terms that govern the use of the MONOFORM website.",
};

/**
 * `/terms` — terms and conditions. The body is rendered from
 * `config/content.ts`; while the document is unapproved the page
 * shows a clear draft banner so the text cannot be mistaken for
 * final legal policy. The effective date and version live in the
 * config so they can be updated without touching the page.
 */
export default function TermsPage() {
  const meta = {
    status: termsPage.status,
    lastUpdated: termsPage.lastUpdated,
    version: termsPage.version,
    effectiveDate: termsPage.effectiveDate,
  };
  return (
    <>
      <Section spacing="md" tone="paper" className="border-b border-line">
        <Container>
          <PageHeader
            eyebrow="Legal"
            title="Terms & conditions"
            description={termsPage.summary}
          />
        </Container>
      </Section>
      <Section spacing="lg" tone="paper">
        <Container className="max-w-prose">
          <DraftBanner meta={meta} />
          <article className="mt-10 space-y-6 text-sm text-ink-muted">
            {termsPage.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-display-sm text-ink">{section.title}</h2>
                <p className="mt-3 leading-relaxed">{section.body}</p>
              </section>
            ))}
          </article>
          <div className="mt-10 border-t border-line pt-6 text-sm text-ink-muted">
            <p>
              Questions about these terms?{" "}
              <Link
                href={termsPage.contactCta.href}
                className="link-underline text-ink"
              >
                {termsPage.contactCta.label}
              </Link>
              .
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
