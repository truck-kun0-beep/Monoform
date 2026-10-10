import { seedCategories } from "@/lib/seed/categories";
import { seedProducts } from "@/lib/seed/products";
import type { ProductSummary } from "@/types";

/**
 * Read-only product service.
 *
 * Centralises every read against the catalogue. The current
 * implementation serves the seed list, but consumers should only
 * import from `@/lib/products` so the data source can be swapped
 * (CMS, API, etc.) without touching the rest of the codebase.
 */

export function listAllProducts(): ProductSummary[] {
  return seedProducts;
}

export function findProductBySlug(slug: string): ProductSummary | undefined {
  return seedProducts.find((product) => product.slug === slug);
}

export function findProductById(id: string): ProductSummary | undefined {
  return seedProducts.find((product) => product.id === id);
}

export function listProductsByCategory(category: string): ProductSummary[] {
  return seedProducts.filter(
    (product) =>
      product.category === category || product.subCategory === category,
  );
}

export function listNewArrivals(limit?: number): ProductSummary[] {
  const products = seedProducts.filter((product) => product.isNew);
  return typeof limit === "number" ? products.slice(0, limit) : products;
}

export function listSaleProducts(limit?: number): ProductSummary[] {
  const products = seedProducts.filter((product) => product.isOnSale);
  return typeof limit === "number" ? products.slice(0, limit) : products;
}

/**
 * Resolve a category summary by slug. Falls back to a synthetic
 * record derived from the parent category when the slug does not
 * exist in the seed data.
 */
export function findCategoryBySlug(slug: string) {
  const explicit = seedCategories.find((entry) => entry.slug === slug);
  if (explicit) return explicit;
  // Derive from the seed products themselves so unknown categories
  // still produce a usable label.
  const product = seedProducts.find(
    (entry) => entry.categorySlug === slug || entry.category === slug,
  );
  if (product) {
    return {
      slug,
      name: product.category
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
      parent: product.subCategory,
    };
  }
  return null;
}

/**
 * Look up related products by configured `relatedProductIds`. The
 * current product is never included in the result. Items are
 * returned in the order they were configured.
 */
export function getRelatedProducts(
  product: ProductSummary,
  limit = 6,
): ProductSummary[] {
  const ids = product.relatedProductIds ?? [];
  const byId = new Map(seedProducts.map((entry) => [entry.id, entry]));
  const items: ProductSummary[] = [];
  for (const id of ids) {
    const candidate = byId.get(id);
    if (candidate && candidate.id !== product.id) {
      items.push(candidate);
    }
  }
  return items.slice(0, limit);
}

/**
 * Deterministic "you may also like" suggestions: products that are
 * not the current product, prioritised by the closest `category`
 * match, then `subCategory`, then the next most recent products.
 */
export function getYouMayAlsoLike(
  product: ProductSummary,
  limit = 8,
): ProductSummary[] {
  const others = seedProducts.filter((entry) => entry.id !== product.id);
  const score = (entry: ProductSummary): number => {
    if (entry.category === product.category) return 4;
    if (entry.subCategory && entry.subCategory === product.subCategory) return 3;
    if (entry.subCategory && product.subCategory && entry.subCategory === product.subCategory) return 2;
    if (entry.categorySlug && product.categorySlug && entry.categorySlug === product.categorySlug) return 1;
    return 0;
  };
  const ranked = others
    .map((entry) => ({ entry, score: score(entry) }))
    .sort((a, b) => b.score - a.score);
  return ranked.slice(0, limit).map((item) => item.entry);
}

/**
 * Sibling products: same `category` (excluding the current product).
 * Falls back to the same `subCategory` if no exact category matches
 * are available.
 */
export function getCategorySiblings(
  product: ProductSummary,
  limit = 6,
): ProductSummary[] {
  const sameCategory = seedProducts.filter(
    (entry) =>
      entry.id !== product.id &&
      (entry.category === product.category ||
        entry.categorySlug === product.categorySlug),
  );
  if (sameCategory.length >= limit) {
    return sameCategory.slice(0, limit);
  }
  const fallback = seedProducts.filter(
    (entry) =>
      entry.id !== product.id &&
      !sameCategory.includes(entry) &&
      (entry.subCategory === product.subCategory ||
        (product.subCategory && entry.subCategory === product.subCategory)),
  );
  return [...sameCategory, ...fallback].slice(0, limit);
}
