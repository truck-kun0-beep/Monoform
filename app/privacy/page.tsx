import Link from "next/link";
import { Container, DraftBanner, PageHeader, Section } from "@/components/ui";
import { privacyPage } from "@/config/content";

export const metadata = {
  title: "Privacy policy",
  description:
    "How MONOFORM collects, uses and protects personal information.",
};

/**
 * `/privacy` — privacy policy. The body is rendered from
 * `config/content.ts`; the page shows a clear draft banner while
 * the document is unapproved. The effective date and version are
 * also read from the config so the store owner can update them
 * in one place.
 */
export default function PrivacyPage() {
  const meta = {
    status: privacyPage.status,
    lastUpdated: privacyPage.lastUpdated,
    version: privacyPage.version,
    effectiveDate: privacyPage.effectiveDate,
  };
  return (
    <>
      <Section spacing="md" tone="paper" className="border-b border-line">
        <Container>
          <PageHeader
            eyebrow="Legal"
            title="Privacy policy"
            description={privacyPage.summary}
          />
        </Container>
      </Section>
      <Section spacing="lg" tone="paper">
        <Container className="max-w-prose">
          <DraftBanner meta={meta} />
          <article className="mt-10 space-y-6 text-sm text-ink-muted">
            {privacyPage.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-display-sm text-ink">{section.title}</h2>
                <p className="mt-3 leading-relaxed">{section.body}</p>
              </section>
            ))}
          </article>
          <div className="mt-10 border-t border-line pt-6 text-sm text-ink-muted">
            <p>
              Privacy questions?{" "}
              <Link
                href={privacyPage.contactCta.href}
                className="link-underline text-ink"
              >
                {privacyPage.contactCta.label}
              </Link>
              .
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
