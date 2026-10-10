import type { ProductSummary } from "@/types";

/**
 * Pure filter and sort helpers for the product catalogue.
 *
 * The catalogue UI is driven by URL query parameters, but the
 * underlying product records are passed in directly. Keeping this
 * logic pure (no React, no router) makes the rules reusable from a
 * future server-side implementation, easier to reason about, and
 * trivial to test.
 */

export type FilterState = {
  /** Sub-categories included in the result set (e.g. "men-shirts"). */
  categories: string[];
  /** Selected size codes (e.g. "M", "32"). */
  sizes: string[];
  /** Selected colour names (e.g. "Camel"). */
  colors: string[];
  /** Lower price bound, inclusive. `null` means unbounded. */
  minPrice: number | null;
  /** Upper price bound, inclusive. `null` means unbounded. */
  maxPrice: number | null;
  /** When true only products that are currently in stock are kept. */
  inStockOnly: boolean;
};

export type SortKey =
  | "recommended"
  | "newest"
  | "price-asc"
  | "price-desc"
  | "name-asc";

export const DEFAULT_FILTER_STATE: FilterState = {
  categories: [],
  sizes: [],
  colors: [],
  minPrice: null,
  maxPrice: null,
  inStockOnly: false,
};

export const SORT_OPTIONS: ReadonlyArray<{
  value: SortKey;
  label: string;
  requiresNewestDate?: boolean;
}> = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A to Z" },
];

export const DEFAULT_SORT: SortKey = "recommended";

/* ------------------------------------------------------------------ *
 * Active-filter detection
 * ------------------------------------------------------------------ */

export function hasActiveFilters(state: FilterState): boolean {
  return (
    state.categories.length > 0 ||
    state.sizes.length > 0 ||
    state.colors.length > 0 ||
    state.minPrice !== null ||
    state.maxPrice !== null ||
    state.inStockOnly
  );
}

export function activeFilterCount(state: FilterState): number {
  let count = 0;
  if (state.categories.length > 0) count += 1;
  if (state.sizes.length > 0) count += 1;
  if (state.colors.length > 0) count += 1;
  if (state.minPrice !== null || state.maxPrice !== null) count += 1;
  if (state.inStockOnly) count += 1;
  return count;
}

/* ------------------------------------------------------------------ *
 * Filter application
 * ------------------------------------------------------------------ */

export type AppliedFilter = {
  group:
    | "category"
    | "size"
    | "color"
    | "price"
    | "availability";
  value: string;
  label: string;
};

export function listActiveFilters(state: FilterState): AppliedFilter[] {
  const filters: AppliedFilter[] = [];
  for (const slug of state.categories) {
    filters.push({
      group: "category",
      value: slug,
      label: `Category: ${slug.replace(/-/g, " ")}`,
    });
  }
  for (const size of state.sizes) {
    filters.push({ group: "size", value: size, label: `Size: ${size}` });
  }
  for (const color of state.colors) {
    filters.push({ group: "color", value: color, label: `Colour: ${color}` });
  }
  if (state.minPrice !== null || state.maxPrice !== null) {
    const lo = state.minPrice ?? 0;
    const hi = state.maxPrice ?? "∞";
    filters.push({
      group: "price",
      value: "range",
      label: `Price: ৳${lo.toLocaleString()} – ৳${hi === "∞" ? hi : hi.toLocaleString()}`,
    });
  }
  if (state.inStockOnly) {
    filters.push({
      group: "availability",
      value: "in-stock",
      label: "In stock only",
    });
  }
  return filters;
}

function getSizes(product: ProductSummary): string[] {
  if (!product.sizes || product.sizes.length === 0) return [];
  return product.sizes.map((entry) => entry.code);
}

function getColors(product: ProductSummary): string[] {
  if (!product.colors || product.colors.length === 0) return [];
  return product.colors.map((entry) => entry.name);
}

function isInStock(product: ProductSummary): boolean {
  if (product.isUnavailable) return false;
  if (product.availability === "out-of-stock") return false;
  if (product.availability === "in-stock" || product.availability === "low-stock") {
    return true;
  }
  // No explicit availability flag: assume in stock unless a configured
  // size marks itself as out of stock. Empty size lists = one-size.
  const sizes = product.sizes ?? [];
  if (sizes.length === 0) return true;
  return sizes.some((entry) => entry.available !== false);
}

export function applyFilters(
  products: ProductSummary[],
  state: FilterState,
): ProductSummary[] {
  return products.filter((product) => {
    if (state.categories.length > 0) {
      const slug = product.categorySlug ?? product.category;
      if (!state.categories.includes(slug)) return false;
    }

    if (state.sizes.length > 0) {
      const productSizes = getSizes(product);
      if (productSizes.length === 0) return false;
      const overlap = state.sizes.some((size) => productSizes.includes(size));
      if (!overlap) return false;
    }

    if (state.colors.length > 0) {
      const productColors = getColors(product);
      if (productColors.length === 0) return false;
      const overlap = state.colors.some((color) => productColors.includes(color));
      if (!overlap) return false;
    }

    if (state.minPrice !== null && product.price.amount < state.minPrice) {
      return false;
    }
    if (state.maxPrice !== null && product.price.amount > state.maxPrice) {
      return false;
    }

    if (state.inStockOnly && !isInStock(product)) {
      return false;
    }

    return true;
  });
}

/* ------------------------------------------------------------------ *
 * Sort application
 * ------------------------------------------------------------------ */

/**
 * Compare products in a deterministic way. The "featured rank" is
 * computed from the product's own flags: featured (sale) products
 * bubble up, then new arrivals, then alphabetical. When two records
 * have the same rank we fall back to slug to keep ordering stable
 * between renders.
 */
function recommendedRank(product: ProductSummary): number {
  if (product.isOnSale) return 0;
  if (product.isNew) return 1;
  return 2;
}

export function sortProducts(
  products: ProductSummary[],
  sort: SortKey,
): ProductSummary[] {
  const copy = [...products];
  switch (sort) {
    case "price-asc":
      copy.sort((a, b) => {
        if (a.price.amount !== b.price.amount) {
          return a.price.amount - b.price.amount;
        }
        return a.slug.localeCompare(b.slug);
      });
      return copy;
    case "price-desc":
      copy.sort((a, b) => {
        if (a.price.amount !== b.price.amount) {
          return b.price.amount - a.price.amount;
        }
        return a.slug.localeCompare(b.slug);
      });
      return copy;
    case "name-asc":
      copy.sort((a, b) => a.name.localeCompare(b.name));
      return copy;
    case "newest":
      copy.sort((a, b) => {
        const aNew = a.isNew ? 1 : 0;
        const bNew = b.isNew ? 1 : 0;
        if (aNew !== bNew) return bNew - aNew;
        return a.slug.localeCompare(b.slug);
      });
      return copy;
    case "recommended":
    default:
      copy.sort((a, b) => {
        const aRank = recommendedRank(a);
        const bRank = recommendedRank(b);
        if (aRank !== bRank) return aRank - bRank;
        return a.slug.localeCompare(b.slug);
      });
      return copy;
  }
}

/* ------------------------------------------------------------------ *
 * Facet extraction — drives the filter UI
 * ------------------------------------------------------------------ */

export type FacetEntry = {
  value: string;
  label: string;
  count: number;
};

export type Facets = {
  categories: FacetEntry[];
  sizes: FacetEntry[];
  colors: FacetEntry[];
  /** Available price bounds based on the unfiltered result set. */
  priceBounds: { min: number; max: number };
};

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function entriesToFacets(
  counts: Map<string, number>,
  format: (value: string) => string,
): FacetEntry[] {
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: format(value), count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    });
}

export function computeFacets(products: ProductSummary[]): Facets {
  const categoryMap = new Map<string, number>();
  const sizeMap = new Map<string, number>();
  const colorMap = new Map<string, number>();
  let minPrice = Number.POSITIVE_INFINITY;
  let maxPrice = 0;

  for (const product of products) {
    const slug = product.categorySlug ?? product.category;
    if (slug) increment(categoryMap, slug);

    for (const size of getSizes(product)) {
      increment(sizeMap, size);
    }
    for (const color of getColors(product)) {
      increment(colorMap, color);
    }

    if (Number.isFinite(product.price.amount)) {
      if (product.price.amount < minPrice) minPrice = product.price.amount;
      if (product.price.amount > maxPrice) maxPrice = product.price.amount;
    }
  }

  if (!Number.isFinite(minPrice)) minPrice = 0;

  return {
    categories: entriesToFacets(categoryMap, (value) =>
      value
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
    ),
    sizes: entriesToFacets(sizeMap, (value) => value),
    colors: entriesToFacets(colorMap, (value) => value),
    priceBounds: { min: Math.floor(minPrice), max: Math.ceil(maxPrice) },
  };
}
