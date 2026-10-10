"use client";

import { ProductCarousel } from "./ProductCarousel";
import { Container, Section } from "@/components/ui";
import type { ProductSummary } from "@/types";

type Props = {
  products: ProductSummary[];
  eyebrow?: string;
  title?: string;
  /** When true, product cards expose a quick-add action. */
  showQuickAdd?: boolean;
};

/**
 * "You may also like" — a horizontal product carousel rendered
 * below the main PDP sections. The list is filtered by the caller
 * (e.g. `getYouMayAlsoLike`); this component only handles layout.
 */
export function YouMayAlsoLike({
  products,
  eyebrow = "You may also like",
  title = "More from the studio",
  showQuickAdd = false,
}: Props) {
  if (products.length === 0) return null;
  return (
    <Section spacing="lg" tone="warm" id="you-may-also-like">
      <Container>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="mt-2 text-display-md text-ink">{title}</h2>
          </div>
        </div>
        <div className="mt-10">
          <ProductCarousel
            products={products}
            showQuickAdd={showQuickAdd}
          />
        </div>
      </Container>
    </Section>
  );
}
