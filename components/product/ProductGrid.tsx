import { ProductCard } from "./ProductCard";
import type { ProductSummary } from "@/types";

type Props = {
  products: ProductSummary[];
  columns?: 2 | 3 | 4;
};

const columnStyles: Record<NonNullable<Props["columns"]>, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
};

/**
 * Product grid for catalogue and listing pages. Uses a consistent
 * gutter that scales with the viewport.
 */
export function ProductGrid({ products, columns = 3 }: Props) {
  if (products.length === 0) {
    return null;
  }
  return (
    <div className={`grid gap-x-6 gap-y-12 ${columnStyles[columns]}`}>
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < 2} />
      ))}
    </div>
  );
}
