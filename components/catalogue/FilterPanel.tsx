"use client";

import { useMemo } from "react";
import { FilterSection } from "./FilterSection";
import { CheckboxList, ColorSwatch } from "./CheckboxList";
import { PriceRange } from "./PriceRange";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { Button } from "@/components/ui";
import {
  computeFacets,
  listActiveFilters,
  type Facets,
  type FilterState,
} from "@/lib/catalogue";
import type { ProductSummary } from "@/types";

type Props = {
  products: ProductSummary[];
  filters: FilterState;
  facets?: Facets;
  enabled: ReadonlyArray<"category" | "size" | "color" | "price" | "availability">;
  onFilterChange: <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => void;
  onClearAll: () => void;
  onRemoveFilter: (group: string, value: string) => void;
  /**
   * Hide the "Clear all" button in the panel footer. The mobile
   * drawer renders its own footer with a Reset action.
   */
  hideFooter?: boolean;
  className?: string;
};

/**
 * Desktop / shared filter panel. Renders only the filter groups
 * enabled by the active catalogue config; categories that don't
 * carry sizes, etc. simply omit that group.
 */
export function FilterPanel({
  products,
  filters,
  facets: facetsProp,
  enabled,
  onFilterChange,
  onClearAll,
  onRemoveFilter,
  hideFooter = false,
  className,
}: Props) {
  const facets = useMemo<Facets>(
    () => facetsProp ?? computeFacets(products),
    [facetsProp, products],
  );
  const activeFilters = useMemo(
    () => listActiveFilters(filters),
    [filters],
  );

  const toggleArray = (key: "categories" | "sizes" | "colors", value: string) => {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value];
    onFilterChange(key, next);
  };

  const showCategory =
    enabled.includes("category") && facets.categories.length > 1;
  const showSize = enabled.includes("size") && facets.sizes.length > 0;
  const showColor = enabled.includes("color") && facets.colors.length > 0;
  const showPrice = enabled.includes("price");
  const showAvailability = enabled.includes("availability");

  const hasAnySection = showCategory || showSize || showColor || showPrice || showAvailability;

  if (!hasAnySection) {
    return (
      <aside
        className={className}
        aria-label="Catalogue filters"
      >
        <div className="border border-line bg-paper-warm p-6">
          <h2 className="text-eyebrow uppercase text-ink-muted">Refine</h2>
          <p className="mt-3 text-sm text-ink-muted">
            No filters are available for this catalogue yet.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={className}
      aria-label="Catalogue filters"
    >
      <div className="flex flex-col">
        <header className="flex items-center justify-between pb-4">
          <h2 className="text-eyebrow uppercase text-ink">Refine</h2>
          {activeFilters.length > 0 ? (
            <button
              type="button"
              onClick={onClearAll}
              className="link-underline text-eyebrow uppercase text-ink-muted"
            >
              Clear
            </button>
          ) : null}
        </header>
        {showCategory ? (
          <FilterSection title="Category" defaultOpen>
            <CheckboxList
              name="category"
              legend="Filter by category"
              values={filters.categories}
              options={facets.categories}
              onToggle={(value) => toggleArray("categories", value)}
            />
          </FilterSection>
        ) : null}
        {showSize ? (
          <FilterSection title="Size" defaultOpen>
            <CheckboxList
              name="size"
              legend="Filter by size"
              values={filters.sizes}
              options={facets.sizes}
              onToggle={(value) => toggleArray("sizes", value)}
            />
          </FilterSection>
        ) : null}
        {showColor ? (
          <FilterSection
            title="Colour"
            defaultOpen
            summary={
              filters.colors.length > 0
                ? `${filters.colors.length} selected`
                : undefined
            }
          >
            <CheckboxList
              name="color"
              legend="Filter by colour"
              values={filters.colors}
              options={facets.colors}
              onToggle={(value) => toggleArray("colors", value)}
              renderSwatch={(option) => (
                <ColorSwatch value={swatchHex(option.label, facets)} label={option.label} />
              )}
            />
          </FilterSection>
        ) : null}
        {showPrice ? (
          <FilterSection title="Price" defaultOpen>
            <PriceRange
              min={facets.priceBounds.min}
              max={facets.priceBounds.max}
              value={{ min: filters.minPrice, max: filters.maxPrice }}
              onApply={({ min, max }) => {
                onFilterChange("minPrice", min);
                onFilterChange("maxPrice", max);
              }}
            />
          </FilterSection>
        ) : null}
        {showAvailability ? (
          <FilterSection title="Availability" defaultOpen>
            <label
              className="flex cursor-pointer items-center gap-3 text-sm text-ink"
            >
              <input
                type="checkbox"
                className="sr-only peer"
                checked={filters.inStockOnly}
                onChange={(event) => onFilterChange("inStockOnly", event.target.checked)}
              />
              <span
                aria-hidden="true"
                className={
                  "inline-flex h-4 w-4 shrink-0 items-center justify-center border border-line-strong bg-paper " +
                  "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink " +
                  (filters.inStockOnly ? "bg-ink" : "")
                }
              >
                {filters.inStockOnly ? (
                  <svg viewBox="0 0 12 12" className="h-3 w-3 text-paper" aria-hidden="true">
                    <path
                      d="M2.5 6.4 4.8 8.7 9.5 3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </span>
              <span>In stock only</span>
            </label>
          </FilterSection>
        ) : null}
        <ActiveFilterChips
          className="mt-2"
          filters={activeFilters}
          onRemove={onRemoveFilter}
          onClearAll={onClearAll}
        />
        {!hideFooter && activeFilters.length > 0 ? (
          <div className="mt-6">
            <Button variant="secondary" size="sm" onClick={onClearAll}>
              Reset filters
            </Button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

/**
 * Approximate hex for the swatch button. The facet list only carries
 * the human label (e.g. "Camel") so we map a small, brand-friendly
 * palette. Unknown colours fall back to a neutral stone.
 */
const COLOUR_HEX: Record<string, string> = {
  ivory: "#efe6d6",
  camel: "#b08458",
  cream: "#f3eada",
  black: "#0a0a0a",
  white: "#f5f5f4",
  stone: "#c8bca8",
  sand: "#d6c2a0",
  charcoal: "#2b2b2b",
  indigo: "#2c3a5a",
  navy: "#1a2440",
  mixed: "#a3a3a3",
};

function swatchHex(label: string, facets: Facets): string {
  const key = label.trim().toLowerCase();
  if (COLOUR_HEX[key]) return COLOUR_HEX[key];
  // Try matching against the facet entries themselves so any
  // additional colours inherit a sensible default.
  const entry = facets.colors.find(
    (entry) => entry.label.toLowerCase() === key,
  );
  if (entry) return "#a3a3a3";
  return "#a3a3a3";
}
