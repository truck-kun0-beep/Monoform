import Link from "next/link";
import { CampaignMediaPlaceholder, VideoPlaceholder } from "@/components/media";
import { Button, Container } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { HomeHero as HomeHeroConfig } from "@/config/homepage";

type Props = {
  config: HomeHeroConfig;
};

/**
 * Editorial homepage hero. Two layouts:
 *
 * - `full` — a single full-width media region with the copy overlaid
 *   at the bottom. Renders a video placeholder so an autoplay muted
 *   loop can be slotted in later.
 * - `split` — the media panel sits on one side of the page with the
 *   copy rendered alongside it.
 *
 * The component is rendered as a server component so the copy and
 * CTAs are part of the static page.
 */
export function HomeHero({ config }: Props) {
  if (config.layout === "split") {
    return <SplitHero config={config} />;
  }
  return <FullHero config={config} />;
}

function FullHero({ config }: Props) {
  // The 16:9 aspect ratio gives a hero that's only ~200px tall on a
  // 360px viewport, which is shorter than the text overlay itself
  // (eyebrow + 2-line display heading + description + buttons). With
  // the absolute overlay using `justify-end`, the overflowing text
  // paints above the hero section and bleeds into the announcement
  // bar / sticky header behind it. A mobile-only minimum height
  // ensures the overlay always fits inside the hero without
  // changing the desktop composition.
  return (
    <section
      aria-labelledby="home-hero-title"
      className="relative isolate w-full bg-ink min-h-[22rem] sm:min-h-0"
    >
      <VideoPlaceholder
        video={config.media}
        aspectRatio={config.mediaAspectRatio ?? config.media.aspectRatio ?? 16 / 9}
        className="w-full"
      />
      <div className="absolute inset-0 flex flex-col items-start justify-end">
        <Container className="pb-8 sm:pb-16 lg:pb-20">
          <div className="max-w-xl text-paper">
            {config.eyebrow ? (
              <p className="text-eyebrow uppercase text-paper/80">
                {config.eyebrow}
              </p>
            ) : null}
            <h1
              id="home-hero-title"
              className="mt-3 text-display-2xl text-paper"
            >
              {config.title}
            </h1>
            {config.description ? (
              <p className="mt-4 max-w-md text-sm text-paper/80 sm:text-base">
                {config.description}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <HeroCta cta={config.primaryCta} tone="inverse" />
              {config.secondaryCta ? (
                <HeroCta cta={config.secondaryCta} tone="inverse-outline" />
              ) : null}
            </div>
          </div>
        </Container>
      </div>
    </section>
  );
}

function SplitHero({ config }: Props) {
  return (
    <section
      aria-labelledby="home-hero-title"
      className="w-full bg-paper"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <CampaignMediaPlaceholder
          image={config.media}
          aspectRatio={config.mediaAspectRatio ?? 4 / 5}
          className="lg:aspect-auto lg:h-full"
        />
        <div className="flex items-center bg-paper-warm">
          <Container className="py-16 lg:py-24">
            <div className="max-w-md">
              {config.eyebrow ? (
                <p className="eyebrow">{config.eyebrow}</p>
              ) : null}
              <h1
                id="home-hero-title"
                className="mt-3 text-display-2xl text-ink"
              >
                {config.title}
              </h1>
              {config.description ? (
                <p className="mt-4 text-sm text-ink-muted sm:text-base">
                  {config.description}
                </p>
              ) : null}
              <div className="mt-6 flex flex-wrap gap-3">
                <HeroCta cta={config.primaryCta} tone="default" />
                {config.secondaryCta ? (
                  <HeroCta cta={config.secondaryCta} tone="outline" />
                ) : null}
              </div>
            </div>
          </Container>
        </div>
      </div>
    </section>
  );
}

type Tone = "default" | "outline" | "inverse" | "inverse-outline";

function HeroCta({
  cta,
  tone,
}: {
  cta: { label: string; href: string; variant?: "primary" | "secondary" };
  tone: Tone;
}) {
  if (tone === "inverse" || tone === "inverse-outline") {
    const styles =
      tone === "inverse"
        ? "bg-paper text-ink hover:bg-paper-warm border border-paper"
        : "bg-transparent text-paper border border-paper hover:bg-paper hover:text-ink";
    return (
      <Link
        href={cta.href}
        className={cn(
          "inline-flex h-12 items-center justify-center px-8 text-sm uppercase tracking-[0.2em] transition-colors duration-base ease-out-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper",
          styles,
        )}
      >
        {cta.label}
      </Link>
    );
  }
  const variant = cta.variant ?? tone === "outline" ? "secondary" : "primary";
  return (
    <Button href={cta.href} variant={variant} size="lg">
      {cta.label}
    </Button>
  );
}
