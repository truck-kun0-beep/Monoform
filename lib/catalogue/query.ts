import {
  DEFAULT_FILTER_STATE,
  DEFAULT_SORT,
  type FilterState,
  type SortKey,
} from "./filters";

/**
 * URL query parameter <-> filter state helpers.
 *
 * Encoding rules:
 * - Repeated keys become comma-separated values (`?size=M&size=L` and
 *   `?size=M,L` are both accepted, both produce the same URL).
 * - Numeric values are validated before being applied.
 * - Unknown sort values fall back to the default.
 * - The `page` parameter is 1-based.
 */

const SORT_VALUES: ReadonlySet<SortKey> = new Set<SortKey>([
  "recommended",
  "newest",
  "price-asc",
  "price-desc",
  "name-asc",
]);

function splitList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => entry.split(","))
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const next = Number(value);
  if (!Number.isFinite(next) || next < 0) return null;
  return next;
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

export type ParsedQuery = {
  filters: FilterState;
  sort: SortKey;
  page: number;
};

export function parseCatalogueQuery(
  params: Record<string, string | string[] | undefined>,
): ParsedQuery {
  const sortRaw = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  const sort: SortKey = SORT_VALUES.has(sortRaw as SortKey)
    ? (sortRaw as SortKey)
    : DEFAULT_SORT;

  const minPrice = parseNumber(Array.isArray(params.minPrice) ? params.minPrice[0] : params.minPrice);
  const maxPrice = parseNumber(Array.isArray(params.maxPrice) ? params.maxPrice[0] : params.maxPrice);

  const inStockRaw = Array.isArray(params.inStock) ? params.inStock[0] : params.inStock;
  const inStockOnly = inStockRaw === "1" || inStockRaw === "true";

  const pageRaw = parseNumber(Array.isArray(params.page) ? params.page[0] : params.page);
  const page = pageRaw && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  return {
    filters: {
      categories: dedupe(splitList(params.category ?? params.subcategory)),
      sizes: dedupe(splitList(params.size)),
      colors: dedupe(splitList(params.color)),
      minPrice,
      maxPrice,
      inStockOnly,
    },
    sort,
    page,
  };
}

export type SearchParamRecord = Record<string, string | string[] | undefined>;

/**
 * Build a query-string patch from a partial state update. Keys whose
 * value matches the default state are omitted so the URL stays clean.
 * When the same parameter is repeated we collapse to a single key with
 * a comma-joined value, matching the `parseCatalogueQuery` contract.
 */
export function buildSearchParams(
  current: SearchParamRecord,
  patch: {
    filters?: Partial<FilterState>;
    sort?: SortKey;
    page?: number;
  },
): URLSearchParams {
  const next = new URLSearchParams();

  // Copy through any other params we don't manage.
  for (const [key, value] of Object.entries(current)) {
    if (MANAGED_KEYS.has(key)) continue;
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const entry of value) next.append(key, entry);
    } else {
      next.set(key, value);
    }
  }

  const parsed = parseCatalogueQuery(current);
  const filters: FilterState = {
    ...parsed.filters,
    ...(patch.filters ?? {}),
  };
  const sort = patch.sort ?? parsed.sort;
  const page = patch.page ?? 1;

  if (filters.categories.length > 0) {
    next.set("category", filters.categories.join(","));
  }
  if (filters.sizes.length > 0) {
    next.set("size", filters.sizes.join(","));
  }
  if (filters.colors.length > 0) {
    next.set("color", filters.colors.join(","));
  }
  if (filters.minPrice !== null) {
    next.set("minPrice", String(filters.minPrice));
  }
  if (filters.maxPrice !== null) {
    next.set("maxPrice", String(filters.maxPrice));
  }
  if (filters.inStockOnly) {
    next.set("inStock", "1");
  }
  if (sort !== DEFAULT_SORT) {
    next.set("sort", sort);
  }
  if (page > 1) {
    next.set("page", String(page));
  }
  return next;
}

const MANAGED_KEYS = new Set<string>([
  "category",
  "subcategory",
  "size",
  "color",
  "minPrice",
  "maxPrice",
  "inStock",
  "sort",
  "page",
]);

export function isFilterStateDefault(state: FilterState): boolean {
  return (
    state.categories.length === 0 &&
    state.sizes.length === 0 &&
    state.colors.length === 0 &&
    state.minPrice === null &&
    state.maxPrice === null &&
    !state.inStockOnly
  );
}

export function resetFilterDefaults(): FilterState {
  return { ...DEFAULT_FILTER_STATE };
}
