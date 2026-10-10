"use client";

import { ProductCarousel } from "./ProductCarousel";
import { Container, Section } from "@/components/ui";
import type { ProductSummary } from "@/types";

type Props = {
  products: ProductSummary[];
  eyebrow?: string;
  title?: string;
};

/**
 * "More like this" — secondary recommendation section that uses
 * the same carousel infrastructure as `YouMayAlsoLike` but with a
 * different title and (by convention) a different product list.
 */
export function MoreLikeThis({
  products,
  eyebrow = "More like this",
  title = "You might also consider",
}: Props) {
  if (products.length === 0) return null;
  return (
    <Section spacing="lg" tone="paper" id="more-like-this">
      <Container>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="mt-2 text-display-md text-ink">{title}</h2>
          </div>
        </div>
        <div className="mt-10">
          <ProductCarousel products={products} />
        </div>
      </Container>
    </Section>
  );
}
