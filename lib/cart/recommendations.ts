import { listAllProducts, getRelatedProducts } from "@/lib/products";
import type { ProductSummary } from "@/types";

/**
 * Build a deterministic "you may also like" list for the cart page.
 *
 * Strategy:
 *  1. For each line, append the product's configured `relatedProductIds`
 *     (deduplicated, order preserved).
 *  2. If we still don't have enough, top up with a deterministic slice
 *     of the global product list (excludes anything already chosen
 *     and anything already in the cart).
 *  3. Exclude any product currently in the bag so we don't recommend
 *     something the customer has already added.
 *
 * Returns an empty array when the catalogue is empty or all the
 * products are already in the cart.
 */
export function recommendForCart(
  lines: ReadonlyArray<{ productId: string }>,
  limit = 8,
): ProductSummary[] {
  const inCart = new Set(lines.map((line) => line.productId));
  const all = listAllProducts();
  const seen = new Set<string>(inCart);
  const recommended: ProductSummary[] = [];

  for (const line of lines) {
    const product = all.find((entry) => entry.id === line.productId);
    if (!product) continue;
    const related = getRelatedProducts(product, limit);
    for (const entry of related) {
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);
      recommended.push(entry);
      if (recommended.length >= limit) return recommended;
    }
  }

  // Deterministic fallback: walk the catalogue and pick the first
  // few products that are neither in the cart nor already chosen.
  for (const entry of all) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    recommended.push(entry);
    if (recommended.length >= limit) break;
  }

  return recommended.slice(0, limit);
}
