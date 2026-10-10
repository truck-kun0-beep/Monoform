import Link from "next/link";
import { CampaignMediaPlaceholder } from "@/components/media";
import { Button, Container, Section } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { HomeCampaign } from "@/config/homepage";

type Props = {
  config: HomeCampaign;
};

/**
 * Editorial campaign block. Five layouts are supported so the
 * homepage can alternate compositions without repeating the hero:
 *
 * - `full`        — full-bleed image with overlaid copy.
 * - `split-left`  — media on the left, copy on the right.
 * - `split-right` — copy on the left, media on the right.
 * - `stacked`     — media above, copy below.
 * - `wide`        — full-bleed but a 16/9 landscape instead of 4/5.
 */
export function CampaignSection({ config }: Props) {
  switch (config.layout) {
    case "split-left":
      return <SplitCampaign config={config} side="left" />;
    case "split-right":
      return <SplitCampaign config={config} side="right" />;
    case "stacked":
      return <StackedCampaign config={config} />;
    case "wide":
      return <WideCampaign config={config} />;
    case "full":
    default:
      return <FullCampaign config={config} />;
  }
}

function FullCampaign({ config }: Props) {
  return (
    <Section spacing="lg" tone={config.tone ?? "paper"} id={config.id}>
      <div className="relative">
        <CampaignMediaPlaceholder
          image={config.media}
          aspectRatio={config.mediaAspectRatio ?? 16 / 9}
        />
        <div className="absolute inset-0 flex items-end">
          <Container className="pb-10 sm:pb-16">
            <Copy config={config} tone="inverse" className="max-w-md text-paper" />
          </Container>
        </div>
      </div>
    </Section>
  );
}

function WideCampaign({ config }: Props) {
  return (
    <Section spacing="lg" tone={config.tone ?? "paper"} id={config.id}>
      <Container>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <CampaignMediaPlaceholder
              image={config.media}
              aspectRatio={config.mediaAspectRatio ?? 16 / 9}
            />
          </div>
          <div className="lg:col-span-5">
            <Copy config={config} />
          </div>
        </div>
      </Container>
    </Section>
  );
}

function StackedCampaign({ config }: Props) {
  return (
    <Section spacing="lg" tone={config.tone ?? "paper"} id={config.id}>
      <Container>
        <div className="grid grid-cols-1 gap-10">
          <CampaignMediaPlaceholder
            image={config.media}
            aspectRatio={config.mediaAspectRatio ?? 4 / 5}
          />
          <div className="mx-auto max-w-xl text-center">
            <Copy config={config} align="center" />
          </div>
        </div>
      </Container>
    </Section>
  );
}

function SplitCampaign({
  config,
  side,
}: Props & { side: "left" | "right" }) {
  return (
    <Section spacing="lg" tone={config.tone ?? "paper"} id={config.id}>
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {side === "left" ? (
          <CampaignMediaPlaceholder
            image={config.media}
            aspectRatio={config.mediaAspectRatio ?? 4 / 5}
            className="lg:aspect-auto lg:h-full"
          />
        ) : null}
        <div className="flex items-center bg-paper-warm">
          <Container className="py-16 lg:py-24">
            <div className="mx-auto max-w-md">
              <Copy config={config} />
            </div>
          </Container>
        </div>
        {side === "right" ? (
          <CampaignMediaPlaceholder
            image={config.media}
            aspectRatio={config.mediaAspectRatio ?? 4 / 5}
            className="lg:aspect-auto lg:h-full"
          />
        ) : null}
      </div>
    </Section>
  );
}

function Copy({
  config,
  tone = "default",
  align = "left",
  className,
}: {
  config: HomeCampaign;
  tone?: "default" | "inverse";
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        align === "center" && "text-center",
        tone === "inverse" ? "text-paper" : "text-ink",
        className,
      )}
    >
      {config.eyebrow ? (
        <p
          className={cn(
            "text-eyebrow uppercase",
            tone === "inverse" ? "text-paper/80" : "text-ink-muted",
          )}
        >
          {config.eyebrow}
        </p>
      ) : null}
      <h2
        className={cn(
          "mt-3",
          tone === "inverse" ? "text-display-xl text-paper" : "text-display-lg text-ink",
        )}
      >
        {config.title}
      </h2>
      {config.description ? (
        <p
          className={cn(
            "mt-4 text-sm sm:text-base",
            tone === "inverse" ? "text-paper/80" : "text-ink-muted",
          )}
        >
          {config.description}
        </p>
      ) : null}
      {config.cta ? (
        <div
          className={cn(
            "mt-6",
            align === "center" && "flex justify-center",
          )}
        >
          {tone === "inverse" ? (
            <Link
              href={config.cta.href}
              className={cn(
                "inline-flex h-12 items-center justify-center border border-paper bg-paper px-8 text-sm uppercase tracking-[0.2em] text-ink transition-colors duration-base ease-out-soft hover:bg-transparent hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper",
              )}
            >
              {config.cta.label}
            </Link>
          ) : (
            <Button href={config.cta.href} size="lg">
              {config.cta.label}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
