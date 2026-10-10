import Link from "next/link";
import { CampaignMediaPlaceholder } from "@/components/media";
import { Container, Section } from "@/components/ui";
import { ArrowRightIcon } from "@/components/ui/Icon";
import type { HomeBrandStory as Config } from "@/config/homepage";

type Props = {
  config: Config;
};

/**
 * Brand introduction block. Editorial split between a media panel
 * and a short paragraph + CTA. The text intentionally avoids any
 * unverifiable manufacturing or sustainability claims.
 */
export function BrandStory({ config }: Props) {
  return (
    <Section spacing="lg" tone="paper" id={config.id}>
      <Container>
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <CampaignMediaPlaceholder
              image={config.media}
              aspectRatio={config.mediaAspectRatio ?? 3 / 4}
            />
          </div>
          <div className="lg:col-span-5">
            {config.eyebrow ? (
              <p className="eyebrow">{config.eyebrow}</p>
            ) : null}
            <h2 className="mt-2 text-display-xl text-ink">{config.title}</h2>
            <p className="mt-4 text-sm text-ink-muted sm:text-base">
              {config.description}
            </p>
            <div className="mt-6">
              <Link
                href={config.cta.href}
                className="link-underline inline-flex items-center gap-2 text-eyebrow uppercase text-ink"
              >
                {config.cta.label}
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
