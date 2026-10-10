import Link from "next/link";
import { ProductImagePlaceholder } from "@/components/media";
import { Container, Section } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import type { ProductSummary } from "@/types";

type Props = {
  products: ProductSummary[];
  eyebrow?: string;
  title?: string;
};

/**
 * "Complete the Look" — a compact row of 2 — 4 complementary
 * products. Renders nothing when there are fewer than two products
 * so the layout never feels sparse.
 */
export function CompleteTheLook({
  products,
  eyebrow = "Complete the look",
  title = "Pair it with",
}: Props) {
  if (products.length < 2) return null;
  return (
    <Section spacing="lg" tone="paper" id="complete-the-look">
      <Container>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="mt-2 text-display-md text-ink">{title}</h2>
          </div>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {products.slice(0, 4).map((product) => (
            <CompleteTheLookTile key={product.id} product={product} />
          ))}
        </div>
      </Container>
    </Section>
  );
}

function CompleteTheLookTile({ product }: { product: ProductSummary }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
    >
      <ProductImagePlaceholder image={product.image} />
      <div className="mt-4 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm text-ink">{product.name}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-ink-muted">
            {product.subCategory ?? product.category}
          </p>
        </div>
        <p className="shrink-0 text-sm text-ink">
          {formatPrice(product.price.amount, product.price.currency)}
        </p>
      </div>
    </Link>
  );
}
