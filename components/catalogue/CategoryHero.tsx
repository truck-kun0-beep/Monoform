import Link from "next/link";
import { CampaignMediaPlaceholder } from "@/components/media";
import { Container, Section } from "@/components/ui";
import type { CatalogueHero as CatalogueHeroConfig } from "@/config/catalogue";
import { cn } from "@/lib/utils";

type Props = {
  hero: CatalogueHeroConfig;
  className?: string;
};

/**
 * Optional editorial banner above the product grid.
 *
 * The media area is intentionally empty until the studio supplies
 * imagery — `CampaignMediaPlaceholder` reserves the correct aspect
 * ratio without inserting placeholder photographs.
 */
export function CategoryHero({ hero, className }: Props) {
  const aspect = hero.mediaAspectRatio ?? hero.media.aspectRatio ?? 16 / 9;
  return (
    <Section
      spacing="md"
      tone={hero.tone ?? "paper"}
      className={cn("border-b border-line", className)}
      as="section"
      aria-label={`${hero.title} introduction`}
    >
      <Container>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div className="flex flex-col gap-4">
            {hero.eyebrow ? (
              <p className="text-eyebrow uppercase text-ink-muted">{hero.eyebrow}</p>
            ) : null}
            <h2 className="text-display-lg text-ink">{hero.title}</h2>
            {hero.description ? (
              <p className="max-w-prose text-sm text-ink-muted">{hero.description}</p>
            ) : null}
            {hero.cta ? (
              <div className="pt-2">
                <Link
                  href={hero.cta.href}
                  className={cn(
                    "inline-flex h-11 items-center justify-center border border-line-strong px-6 text-eyebrow uppercase",
                    "transition-colors duration-base ease-out-soft",
                    hero.tone === "ink"
                      ? "border-paper text-paper hover:bg-paper hover:text-ink"
                      : "border-ink text-ink hover:bg-ink hover:text-paper",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                  )}
                >
                  {hero.cta.label}
                </Link>
              </div>
            ) : null}
          </div>
          <div className="order-first lg:order-none">
            <CampaignMediaPlaceholder
              image={hero.media}
              aspectRatio={aspect}
              tone={hero.tone === "ink" ? "ink" : "warm"}
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
