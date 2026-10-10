import Link from "next/link";
import { CampaignMediaPlaceholder } from "@/components/media";
import { Container, PageHeader, Section } from "@/components/ui";
import { aboutPage } from "@/config/content";
import { brand } from "@/config/brand";

export const metadata = {
  title: "About",
  description: `About ${brand.name}.`,
};

/**
 * `/about` — brand story page. The copy is editable draft
 * content sourced from `config/content.ts`; nothing here is
 * presented as verified business history, manufacturing
 * information, sustainability claims or third-party
 * certifications.
 */
export default function AboutPage() {
  return (
    <>
      <Section spacing="md" tone="paper" className="border-b border-line">
        <Container>
          <PageHeader
            eyebrow={`${brand.name} · ${brand.tagline.toUpperCase()}`}
            title={aboutPage.heading}
            description={aboutPage.introduction}
          />
        </Container>
      </Section>

      <Section spacing="lg" tone="paper">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div className="space-y-10">
              {aboutPage.sections.map((section) => (
                <section key={section.title}>
                  <h2 className="text-display-sm text-ink">{section.title}</h2>
                  <p className="mt-3 text-sm text-ink-muted">{section.body}</p>
                </section>
              ))}
            </div>
            <CampaignMediaPlaceholder
              image={{ alt: `${brand.name} — studio`, aspectRatio: 4 / 5 }}
              aspectRatio={4 / 5}
            />
          </div>

          <div className="mt-16 border-t border-line pt-10">
            <p className="text-sm text-ink-muted">
              Browse the latest arrivals to see the current collection.
            </p>
            <Link
              href={aboutPage.shopCta.href}
              className="link-underline mt-3 inline-block text-sm text-ink"
            >
              {aboutPage.shopCta.label} →
            </Link>
          </div>
        </Container>
      </Section>
    </>
  );
}
