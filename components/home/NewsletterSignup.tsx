"use client";

import { Container, Section } from "@/components/ui";
import { NewsletterForm } from "@/components/newsletter";
import type { HomeNewsletter as Config } from "@/config/homepage";

type Props = {
  config: Config;
};

/**
 * Newsletter sign-up section on the homepage. Delegates the
 * actual form, consent capture, server submission and honest
 * status states to the shared `NewsletterForm` component so the
 * homepage, footer and any other public-facing surface use the
 * same submission path.
 */
export function NewsletterSignup({ config }: Props) {
  return (
    <Section spacing="lg" tone="warm" id={config.id}>
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <NewsletterForm
            eyebrow={config.eyebrow}
            heading={config.title}
            description={config.description ?? undefined}
            source="homepage"
            variant="stacked"
            className="text-left"
          />
          {config.legalNote ? (
            <p className="mt-6 text-xs text-ink-muted">{config.legalNote}</p>
          ) : null}
        </div>
      </Container>
    </Section>
  );
}
