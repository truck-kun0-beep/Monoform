"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui";
import { FilterPanel } from "./FilterPanel";
import {
  activeFilterCount,
  type FilterState,
  type Facets,
} from "@/lib/catalogue";
import type { ProductSummary } from "@/types";

type Props = {
  open: boolean;
  onClose: () => void;
  products: ProductSummary[];
  filters: FilterState;
  facets?: Facets;
  enabled: ReadonlyArray<"category" | "size" | "color" | "price" | "availability">;
  onFilterChange: <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => void;
  onRemoveFilter: (group: string, value: string) => void;
  onReset: () => void;
  onApply: () => void;
};

/**
 * Mobile-friendly filter drawer. The drawer hosts the same
 * `FilterPanel` as the desktop sidebar — state changes are applied
 * immediately so the visitor sees counts update in the URL bar; the
 * footer offers a separate `Reset` and `Apply` action where the
 * `Apply` simply closes the drawer.
 */
export function MobileFilterDrawer({
  open,
  onClose,
  products,
  filters,
  facets,
  enabled,
  onFilterChange,
  onRemoveFilter,
  onReset,
  onApply,
}: Props) {
  const count = activeFilterCount(filters);
  return (
    <Drawer open={open} onClose={onClose} side="left" title="Filters">
      <div className="flex h-full flex-col">
        <FilterPanel
          products={products}
          filters={filters}
          facets={facets}
          enabled={enabled}
          onFilterChange={onFilterChange}
          onClearAll={onReset}
          onRemoveFilter={onRemoveFilter}
          className="flex-1 overflow-y-auto"
        />
        <div className="sticky bottom-0 -mx-6 mt-4 flex items-center gap-3 border-t border-line bg-paper px-6 py-4">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-11 flex-1 items-center justify-center border border-line-strong text-eyebrow uppercase text-ink transition-colors duration-base ease-out-soft hover:border-ink hover:bg-ink hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => {
              onApply();
              onClose();
            }}
            className="inline-flex h-11 flex-1 items-center justify-center border border-ink bg-ink text-eyebrow uppercase text-paper transition-colors duration-base ease-out-soft hover:bg-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {count > 0 ? `Apply (${count})` : "Apply"}
          </button>
        </div>
      </div>
    </Drawer>
  );
}

/**
 * Convenience hook that toggles a single boolean. Used by the
 * catalogue view to control the mobile drawer.
 */
export function useDisclosure(initial = false): {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
} {
  const [open, setOpen] = useState(initial);
  return {
    open,
    onOpen: () => setOpen(true),
    onClose: () => setOpen(false),
    onToggle: () => setOpen((value) => !value),
  };
}
