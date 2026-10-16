import Link from "next/link";
import { ProductCarousel, ProductGrid } from "@/components/product";
import { Button, Container, Section } from "@/components/ui";
import type { HomeCollection } from "@/config/homepage";
import { listAllProducts, listNewArrivals, listSaleProducts } from "@/lib/products";
import type { ProductSummary } from "@/types";

type Props = {
  config: HomeCollection;
  /** Override the products to display. When omitted the section
   *  resolves products from the configured source. */
  products?: ProductSummary[];
  /** Show the quick-add action on each card. Defaults to true. */
  showQuickAdd?: boolean;
};

const DEFAULT_LIMIT = 4;

/**
 * Featured products block. Renders either a responsive grid or a
 * horizontally scrolling carousel based on the configuration. When
 * `productSlugs` is supplied those products are resolved in order;
 * otherwise the section pulls from `source`.
 */
export function FeaturedCollection({
  config,
  products,
  showQuickAdd = true,
}: Props) {
  const items = products ?? resolveProducts(config);

  if (items.length === 0) {
    return null;
  }

  return (
    <Section spacing="lg" tone={config.tone ?? "paper"} id={config.id}>
      <Container>
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            {config.eyebrow ? (
              <p className="eyebrow">{config.eyebrow}</p>
            ) : null}
            <h2 className="mt-2 text-display-lg text-ink">{config.title}</h2>
            {config.description ? (
              <p className="mt-3 text-sm text-ink-muted">
                {config.description}
              </p>
            ) : null}
          </div>
          
            {config.cta ? (
              <Button href={config.cta.href} variant="link" size="sm">
                {config.cta.label}
              </Button>
            ) : null}

          </div>

        <div className="mt-10">
          {config.layout === "carousel" ? (
            <ProductCarousel
              products={items}
              showQuickAdd={showQuickAdd}
              cta={config.cta}
            />
          ) : (
            <ProductGrid products={items} columns={4} />
          )}
        </div>
      </Container>
    </Section>
  );
}

function resolveProducts(config: HomeCollection): ProductSummary[] {
  if (config.productSlugs?.length) {
    const byId = new Map(listAllProducts().map((p) => [p.slug, p]));
    const ordered = config.productSlugs
      .map((slug) => byId.get(slug))
      .filter((p): p is ProductSummary => Boolean(p));
    if (ordered.length > 0) return ordered;
  }

  switch (config.source) {
    case "new-arrivals":
      return listNewArrivals(DEFAULT_LIMIT);
    case "sale":
      return listSaleProducts(DEFAULT_LIMIT);
    case "all":
    default:
      return listAllProducts().slice(0, DEFAULT_LIMIT);
  }
}
