"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { Button, FilterIcon } from "@/components/ui";
import { EmptyState } from "@/components/ui";
import { useCatalogueState } from "@/lib/catalogue";
import {
  applyFilters,
  computeFacets,
  DEFAULT_FILTER_STATE,
  sortProducts,
  type Facets,
  type FilterState,
  type SortKey,
} from "@/lib/catalogue";
import type { CatalogueConfig, CatalogueFeature } from "@/config/catalogue";
import type { ProductSummary } from "@/types";
import { cn } from "@/lib/utils";
import { brand } from "@/config/brand";
import { FilterPanel } from "./FilterPanel";
import { SortSelect } from "./SortSelect";
import { MobileFilterDrawer, useDisclosure } from "./MobileFilterDrawer";
import { Pagination } from "./Pagination";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { listActiveFilters } from "@/lib/catalogue";

type Props = {
  config: CatalogueConfig;
  /** Unfiltered product list (already category-scoped by the server). */
  products: ProductSummary[];
  /** Optional pre-computed facets. Defaults to the local `products`. */
  facets?: Facets;
  /** How many products to show per page. Defaults to 12. */
  pageSize?: number;
  /**
   * Optional mode override. `"pagination"` renders classic page
   * numbers; `"load-more"` appends the next page on demand. The
   * default is pagination which is the more accessible pattern.
   */
  navigation?: "pagination" | "load-more";
};

/**
 * Full client-side catalogue experience.
 *
 * Filters, sort and page state live in the URL through
 * `useCatalogueState`. The component renders a desktop sidebar
 * with the filter panel and a mobile drawer triggered by a sticky
 * filter button. The product grid is paged and updates count
 * announcements for assistive technology.
 */
export function CatalogueView({
  config,
  products,
  facets: facetsProp,
  pageSize = 12,
  navigation = "pagination",
}: Props) {
  const {
    filters,
    sort,
    page,
    setFilter,
    clearFilters,
    removeFilter,
    setSort,
    setPage,
  } = useCatalogueState();

  // First render must mirror SSR. We keep a flag and only switch to
  // the client view after hydration to avoid flashing the default
  // sort when the URL carries a non-default value.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Facets are computed from the unfiltered result set; doing it on
  // every render is cheap because the catalogue is small.
  const facets = useMemo<Facets>(
    () => facetsProp ?? computeFacets(products),
    [facetsProp, products],
  );

  const filteredProducts = useMemo(
    () => applyFilters(products, filters),
    [products, filters],
  );
  const sortedProducts = useMemo(
    () => sortProducts(filteredProducts, sort),
    [filteredProducts, sort],
  );

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  // When filters change we reset to page 1; useCatalogueState already
  // strips the `page` parameter so we only need to clamp here.
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages, setPage]);

  const start = (page - 1) * pageSize;
  const end = Math.min(sortedProducts.length, start + pageSize);
  const visibleProducts = useMemo(
    () => sortedProducts.slice(start, end),
    [sortedProducts, start, end],
  );

  const [loadMoreCount, setLoadMoreCount] = useState(1);
  useEffect(() => {
    setLoadMoreCount(1);
  }, [filters, sort, pageSize]);

  const loadMoreProducts = useMemo(() => {
    if (navigation !== "load-more") return visibleProducts;
    const limit = loadMoreCount * pageSize;
    return sortedProducts.slice(0, Math.min(sortedProducts.length, limit));
  }, [navigation, loadMoreCount, pageSize, sortedProducts, visibleProducts]);

  const showLoadMore =
    navigation === "load-more" && loadMoreCount * pageSize < sortedProducts.length;

  const drawer = useDisclosure(false);

  // Empty-state messaging. When the unfiltered list is empty the
  // category itself is empty; when filtering yields nothing we blame
  // the active filters and offer a reset action.
  const catalogueIsEmpty = products.length === 0;
  const filtersClearedResult = filteredProducts.length === 0;

  const activeFilters = useMemo(() => listActiveFilters(filters), [filters]);

  return (
    <div className="flex flex-col gap-6">
      <Toolbar
        count={sortedProducts.length}
        sort={sort}
        onSortChange={(next) => setSort(next)}
        onOpenFilters={drawer.onOpen}
        activeFilterCount={activeFilters.length}
        navigation={navigation}
      />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[260px_1fr]">
        <FilterPanel
          className="hidden lg:block"
          products={products}
          filters={filters}
          facets={facets}
          enabled={config.features as CatalogueFeature[]}
          onFilterChange={setFilter as (key: keyof FilterState, value: unknown) => void}
          onClearAll={clearFilters}
          onRemoveFilter={removeFilter}
        />
        <div className="flex flex-col gap-6">
          <ResultCount
            count={sortedProducts.length}
            total={products.length}
            page={page}
            pageSize={pageSize}
            hydrated={hydrated}
          />
          <ActiveFilterChipsInline
            filters={activeFilters}
            onRemove={removeFilter}
            onClearAll={clearFilters}
          />
          {catalogueIsEmpty ? (
            <EmptyState
              title="No products in this category yet."
              body="This catalogue will be populated when its products are added. Check back soon."
            />
          ) : filtersClearedResult ? (
            <NoMatchesEmpty
              onClear={clearFilters}
              filters={filters}
            />
          ) : (
            <ProductGrid
              products={navigation === "load-more" ? loadMoreProducts : visibleProducts}
            />
          )}
          {navigation === "pagination" ? (
            sortedProducts.length > 0 ? (
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={(next) => {
                  setPage(next);
                  if (typeof window !== "undefined") {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
              />
            ) : null
          ) : showLoadMore ? (
            <div className="flex justify-center pt-2">
              <Button
                variant="secondary"
                onClick={() => setLoadMoreCount((count) => count + 1)}
              >
                Load more — {sortedProducts.length - loadMoreProducts.length} remaining
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <MobileFilterDrawer
        open={drawer.open}
        onClose={drawer.onClose}
        products={products}
        filters={filters}
        facets={facets}
        enabled={config.features as CatalogueFeature[]}
        onFilterChange={setFilter as (key: keyof FilterState, value: unknown) => void}
        onRemoveFilter={removeFilter}
        onReset={clearFilters}
        onApply={() => undefined}
      />

      {!hydrated ? (
        <span className="sr-only" aria-live="polite">
          Loading catalogue filters
        </span>
      ) : null}
      {hydrated && filters !== DEFAULT_FILTER_STATE ? (
        <span className="sr-only" aria-live="polite">
          {sortedProducts.length === 0
            ? "No matching products"
            : `${sortedProducts.length} matching product${sortedProducts.length === 1 ? "" : "s"}`}
        </span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Toolbar
 * ------------------------------------------------------------------ */

function Toolbar({
  count,
  sort,
  onSortChange,
  onOpenFilters,
  activeFilterCount,
}: {
  count: number;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  onOpenFilters: () => void;
  activeFilterCount: number;
  navigation: "pagination" | "load-more";
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-3">
      <button
        type="button"
        onClick={onOpenFilters}
        className={cn(
          "inline-flex h-10 items-center gap-2 border border-line-strong bg-paper px-3 text-eyebrow uppercase text-ink lg:hidden",
          "transition-colors duration-base ease-out-soft",
          "hover:border-ink hover:bg-ink hover:text-paper",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        )}
        aria-label={`Open filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ""}`}
      >
        <FilterIcon aria-hidden="true" className="h-4 w-4" />
        <span>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}</span>
      </button>
      <div className="ml-auto flex items-center gap-3">
        <span
          aria-live="polite"
          className="text-eyebrow uppercase text-ink-muted"
        >
          {count} {count === 1 ? "piece" : "pieces"}
        </span>
        <SortSelect value={sort} onChange={onSortChange} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Result count
 * ------------------------------------------------------------------ */

function ResultCount({
  count,
  total,
  page,
  pageSize,
  hydrated,
}: {
  count: number;
  total: number;
  page: number;
  pageSize: number;
  hydrated: boolean;
}) {
  if (count === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(count, page * pageSize);
  return (
    <p
      className="text-eyebrow uppercase text-ink-muted"
      aria-live={hydrated ? "polite" : "off"}
    >
      Showing {start}–{end} of {total}
    </p>
  );
}

function ActiveFilterChipsInline({
  filters,
  onRemove,
  onClearAll,
}: {
  filters: ReturnType<typeof listActiveFilters>;
  onRemove: (group: string, value: string) => void;
  onClearAll: () => void;
}) {
  if (filters.length === 0) return null;
  return (
    <ActiveFilterChips
      filters={filters}
      onRemove={onRemove}
      onClearAll={onClearAll}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Product grid
 * ------------------------------------------------------------------ */

function ProductGrid({ products }: { products: ProductSummary[] }) {
  return (
    <div
      className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4"
      role="list"
    >
      {products.map((product, index) => (
        <div role="listitem" key={product.id}>
          <ProductCard product={product} priority={index < 4} showWishlist />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * No-matches empty state
 * ------------------------------------------------------------------ */

function NoMatchesEmpty({
  onClear,
  filters,
}: {
  onClear: () => void;
  filters: FilterState;
}) {
  const activeSummary = summariseFilters(filters);
  return (
    <EmptyState
      title="No products match these filters."
      body={
        activeSummary
          ? `Try removing the following: ${activeSummary}.`
          : "Try adjusting your filters to see more results."
      }
    >
      <div className="mt-6">
        <Button onClick={onClear} variant="secondary">
          Clear filters
        </Button>
      </div>
    </EmptyState>
  );
}

function summariseFilters(filters: FilterState): string | null {
  const parts: string[] = [];
  if (filters.categories.length > 0) {
    parts.push(filters.categories.join(", "));
  }
  if (filters.sizes.length > 0) {
    parts.push(`size ${filters.sizes.join(", ")}`);
  }
  if (filters.colors.length > 0) {
    parts.push(filters.colors.join(", "));
  }
  if (filters.minPrice !== null || filters.maxPrice !== null) {
    const lo = filters.minPrice ?? "0";
    const hi = filters.maxPrice ?? "∞";
    const symbol = brand.cartCurrencySymbol;
    parts.push(`price ${symbol}${lo} – ${symbol}${hi}`);
  }
  if (filters.inStockOnly) {
    parts.push("in stock only");
  }
  return parts.length > 0 ? parts.join("; ") : null;
}
