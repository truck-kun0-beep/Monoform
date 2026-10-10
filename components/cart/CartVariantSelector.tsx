"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { findProductBySlug } from "@/lib/products";
import type { CartLine } from "@/types";

type Props = {
  line: CartLine;
  onChangeSize: (next: string) => void;
  onChangeColor: (next: string) => void;
  size?: "sm" | "md";
};

/**
 * Inline size / colour selector rendered inside a cart row.
 *
 * The selector only opens the controls that are safe to edit on the
 * cart page — sizes and colours with real options defined in the
 * product data. If a product cannot be resolved from the line we
 * render a "View product" link instead of a selector.
 */
export function CartVariantSelector({
  line,
  onChangeSize,
  onChangeColor,
  size: _size = "md",
}: Props) {
  const product = findProductBySlug(line.slug);
  const [open, setOpen] = useState(false);

  if (!product) {
    return (
      <a
        href={`/product/${line.slug}`}
        className="link-underline text-eyebrow uppercase text-ink-muted"
      >
        View product
      </a>
    );
  }

  const sizes = product.sizes ?? [];
  const colors = product.colors ?? [];
  const hasSizes = sizes.length > 0;
  const hasColors = colors.length > 0;

  if (!hasSizes && !hasColors) {
    return (
      <a
        href={`/product/${line.slug}`}
        className="link-underline text-eyebrow uppercase text-ink-muted"
      >
        View product
      </a>
    );
  }

  const buttonClass = cn(
    "link-underline text-eyebrow uppercase text-ink-muted",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClass}
        aria-expanded={false}
        aria-controls={`variant-selector-${line.id}`}
      >
        Edit {hasSizes ? "size" : "colour"}
      </button>
    );
  }

  return (
    <div
      id={`variant-selector-${line.id}`}
      className="mt-3 flex flex-col gap-3 border-t border-line pt-3"
    >
      {hasSizes ? (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-eyebrow uppercase text-ink-muted">Size</legend>
          <div className="flex flex-wrap gap-1.5">
            {sizes.map((entry) => {
              const isSelected = entry.code === line.size;
              const isAvailable = entry.available !== false;
              return (
                <button
                  key={entry.code}
                  type="button"
                  onClick={() => isAvailable && onChangeSize(entry.code)}
                  disabled={!isAvailable}
                  aria-pressed={isSelected}
                  aria-label={`Size ${entry.code}${!isAvailable ? " — unavailable" : ""}`}
                  className={cn(
                    "inline-flex h-9 min-w-10 items-center justify-center border px-2 text-[11px] uppercase tracking-[0.18em] tabular-nums",
                    "transition-colors duration-base ease-out-soft",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                    isSelected
                      ? "border-ink bg-ink text-paper"
                      : isAvailable
                      ? "border-line text-ink hover:border-ink"
                      : "cursor-not-allowed border-line/60 text-ink-subtle line-through",
                  )}
                >
                  {entry.code}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}
      {hasColors ? (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-eyebrow uppercase text-ink-muted">Colour</legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((entry) => {
              const isSelected = entry.name === line.color;
              return (
                <button
                  key={entry.name}
                  type="button"
                  onClick={() => onChangeColor(entry.name)}
                  aria-pressed={isSelected}
                  aria-label={`Colour — ${entry.name}`}
                  title={entry.name}
                  className={cn(
                    "h-8 w-8 rounded-full border transition-transform hover:scale-105",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                    isSelected
                      ? "border-ink ring-2 ring-ink ring-offset-2"
                      : "border-line",
                  )}
                  style={{ backgroundColor: entry.value }}
                />
              );
            })}
          </div>
        </fieldset>
      ) : null}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={cn(
            "inline-flex h-9 items-center justify-center border border-line px-3 text-eyebrow uppercase text-ink",
            "transition-colors duration-base ease-out-soft",
            "hover:border-ink hover:bg-ink hover:text-paper",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          )}
        >
          Done
        </button>
        <a
          href={`/product/${line.slug}`}
          className="link-underline text-eyebrow uppercase text-ink-muted"
        >
          View product
        </a>
      </div>
    </div>
  );
}
