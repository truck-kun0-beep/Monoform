"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_FILTER_STATE,
  DEFAULT_SORT,
  type FilterState,
  type SortKey,
} from "./filters";
import { buildSearchParams, parseCatalogueQuery } from "./query";

/**
 * Hook that synchronises the catalogue filter / sort / page state
 * with the browser URL. Updates are pushed through `useRouter().replace`
 * so the back / forward buttons and shared URLs stay in sync.
 *
 * The hook intentionally returns both the parsed state and a small
 * set of setter helpers so the consumer doesn't have to worry about
 * URL serialization.
 */
export type CatalogueStateApi = {
  filters: FilterState;
  sort: SortKey;
  page: number;
  hasActiveFilters: boolean;
  setFilter: <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => void;
  setFilters: (next: FilterState) => void;
  clearFilters: () => void;
  removeFilter: (group: string, value: string) => void;
  setSort: (sort: SortKey) => void;
  setPage: (page: number) => void;
};

export function useCatalogueState(): CatalogueStateApi {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Snapshot the search params as a plain object so the helpers
  // (which expect string | string[] | undefined) can read it.
  const paramsRecord = useMemo(() => {
    const record: Record<string, string | string[] | undefined> = {};
    const entries = searchParams?.entries();
    if (!entries) return record;
    for (const [key, value] of entries) {
      const existing = record[key];
      if (existing === undefined) {
        record[key] = value;
      } else if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        record[key] = [existing, value];
      }
    }
    return record;
  }, [searchParams]);

  const parsed = useMemo(
    () => parseCatalogueQuery(paramsRecord),
    [paramsRecord],
  );

  const push = useCallback(
    (
      patch: {
        filters?: Partial<FilterState>;
        sort?: SortKey;
        page?: number;
      },
    ) => {
      const next = buildSearchParams(paramsRecord, patch);
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [paramsRecord, pathname, router],
  );

  const setFilter: CatalogueStateApi["setFilter"] = useCallback(
    (key, value) => {
      push({ filters: { [key]: value }, page: 1 });
    },
    [push],
  );

  const setFilters: CatalogueStateApi["setFilters"] = useCallback(
    (next) => {
      push({ filters: next, page: 1 });
    },
    [push],
  );

  const clearFilters = useCallback(() => {
    push({ filters: DEFAULT_FILTER_STATE, page: 1 });
  }, [push]);

  const removeFilter = useCallback(
    (group: string, value: string) => {
      const next: FilterState = {
        ...parsed.filters,
      };
      switch (group) {
        case "category":
          next.categories = next.categories.filter((entry) => entry !== value);
          break;
        case "size":
          next.sizes = next.sizes.filter((entry) => entry !== value);
          break;
        case "color":
          next.colors = next.colors.filter((entry) => entry !== value);
          break;
        case "price":
          next.minPrice = null;
          next.maxPrice = null;
          break;
        case "availability":
          next.inStockOnly = false;
          break;
        default:
          return;
      }
      push({ filters: next, page: 1 });
    },
    [parsed.filters, push],
  );

  const setSort = useCallback(
    (sort: SortKey) => {
      push({ sort, page: 1 });
    },
    [push],
  );

  const setPage = useCallback(
    (page: number) => {
      push({ page: Math.max(1, page) });
    },
    [push],
  );

  return {
    filters: parsed.filters,
    sort: parsed.sort,
    page: parsed.page,
    hasActiveFilters:
      parsed.sort !== DEFAULT_SORT ||
      JSON.stringify(parsed.filters) !== JSON.stringify(DEFAULT_FILTER_STATE),
    setFilter,
    setFilters,
    clearFilters,
    removeFilter,
    setSort,
    setPage,
  };
}
