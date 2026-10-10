"use client";

import { useState, useEffect, useRef } from "react";
import { ProductGallery } from "./ProductGallery";
import { ProductInfoPanel } from "./ProductInfoPanel";
import type { ProductMedia, ProductSummary } from "@/types";
import type { SizeChart } from "@/types";

type Props = {
  product: ProductSummary;
  sizeChart: SizeChart | null;
};

/**
 * Coordinates the gallery media with the active colour selection.
 *
 * The product data may carry `media` slots that apply to every
 * colour, plus optional per-colour `media` arrays. When the user
 * changes colour we swap the gallery to the colour's media list;
 * if the colour has no media, the default product media is shown.
 *
 * The state lives here so the gallery and the info panel share
 * the active colour without lifting the rest of the purchase logic
 * into this component.
 */
export function ProductMediaController({ product, sizeChart }: Props) {
  const defaultColor = product.colors?.[0]?.name ?? null;
  const [color, setColor] = useState<string | null>(defaultColor);
  const lastColorRef = useRef<string | null>(defaultColor);

  useEffect(() => {
    // When the product changes (e.g. via client navigation) reset
    // the colour to the first one in the list.
    if (lastColorRef.current !== defaultColor) {
      setColor(defaultColor);
      lastColorRef.current = defaultColor;
    }
  }, [defaultColor]);

  const media = resolveMedia(product, color);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-12 xl:gap-16">
      <ProductGallery
        media={media}
        productName={product.name}
      />
      <ProductInfoPanel
        product={product}
        sizeChart={sizeChart}
        onColorChange={setColor}
      />
    </div>
  );
}

function resolveMedia(
  product: ProductSummary,
  color: string | null,
): ProductMedia[] {
  const fallback = product.media ?? [];
  if (!color) return fallback;
  const entry = product.colors?.find((entry) => entry.name === color);
  if (entry?.media && entry.media.length > 0) return entry.media;
  return fallback;
}
