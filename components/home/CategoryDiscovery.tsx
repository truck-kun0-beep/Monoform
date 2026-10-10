import Link from "next/link";
import { CampaignMediaPlaceholder } from "@/components/media";
import { Container, Section } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { HomeCategoryGroup } from "@/config/homepage";

type Props = {
  config: HomeCategoryGroup;
};

/**
 * Category discovery grid. Renders the four primary entry points
 * (Women / Men / Underwear / New Arrivals) as full-bleed editorial
 * tiles. On mobile the layout collapses to a 2-column grid; on wide
 * screens it becomes a 4-column row of equal tiles.
 */
export function CategoryDiscovery({ config }: Props) {
  return (
    <Section spacing="lg" tone="paper" id={config.id}>
      <Container>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            {config.eyebrow ? <p className="eyebrow">{config.eyebrow}</p> : null}
            <h2 className="mt-2 text-display-lg text-ink">{config.title}</h2>
            {config.description ? (
              <p className="mt-3 text-sm text-ink-muted">
                {config.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {config.categories.map((category) => (
            <CategoryTile key={category.href} config={category} />
          ))}
        </div>
      </Container>
    </Section>
  );
}

function CategoryTile({
  config,
}: {
  config: HomeCategoryGroup["categories"][number];
}) {
  return (
    <Link
      href={config.href}
      className={cn(
        "group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink",
      )}
      aria-label={`Shop ${config.label}`}
    >
      <CampaignMediaPlaceholder
        image={config.image}
        aspectRatio={config.aspectRatio ?? 4 / 5}
      />
      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          {config.eyebrow ? (
            <p className="text-eyebrow uppercase text-ink-subtle">
              {config.eyebrow}
            </p>
          ) : null}
          <h3 className="mt-1 text-sm uppercase tracking-[0.18em] text-ink">
            {config.label}
          </h3>
        </div>
        <span
          aria-hidden="true"
          className="translate-x-0 text-eyebrow uppercase text-ink-muted transition-transform group-hover:translate-x-1"
        >
          &rarr;
        </span>
      </div>
    </Link>
  );
}
