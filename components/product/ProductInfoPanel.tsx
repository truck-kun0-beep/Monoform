"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Divider, useToast } from "@/components/ui";
import { MinusIcon, PlusIcon } from "@/components/ui/Icon";
import { useCart } from "@/lib/cart";
import { cn, formatPrice } from "@/lib/utils";
import type { ProductMedia, ProductSummary } from "@/types";
import { SizeGuideModal } from "./SizeGuideModal";
import type { SizeChart } from "@/types";
import { WishlistButton } from "./WishlistButton";

type Props = {
  product: ProductSummary;
  /** Size chart for this product, or null if no chart applies. */
  sizeChart: SizeChart | null;
  /** Notify the parent of the selected colour so it can update
   *  the gallery when a colour has its own media configuration. */
  onColorChange?: (colorName: string, media: ProductMedia[] | undefined) => void;
};

/**
 * Product information and purchase panel.
 *
 * Holds the local colour / size / quantity state. Validates the
 * selection before dispatching `addItem` into the shared cart store.
 * The Add to Bag button is locked while a submission is in flight
 * to prevent double submissions.
 */
export function ProductInfoPanel({
  product,
  sizeChart,
  onColorChange,
}: Props) {
  const { add, itemCount } = useCart();
  const { push } = useToast();

  const initialColor = product.colors?.[0]?.name ?? null;
  const [color, setColor] = useState<string | null>(initialColor);
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  // Reset transient selection when the product changes (e.g. after
  // a soft navigation in dev).
  useEffect(() => {
    setColor(initialColor);
    setSize(null);
    setQuantity(1);
  }, [product.id, initialColor]);

  // Notify the parent of the active colour so the gallery can swap
  // media when the colour provides its own slots.
  useEffect(() => {
    if (!onColorChange) return;
    const entry = product.colors?.find((entry) => entry.name === color);
    onColorChange(color ?? "", entry?.media);
  }, [color, onColorChange, product.colors]);

  const isOnSale = Boolean(product.compareAtPrice);
  const sizes = product.sizes ?? [];
  const isSizeRequired = sizes.length > 0;
  const isColorRequired = Boolean(product.colors && product.colors.length > 0);
  const inCart = useMemo(
    () => itemCount, // Used only to gate duplicate-submission feedback.
    [itemCount],
  );

  const isUnavailable = Boolean(product.isUnavailable);
  const availabilityLabel = useMemo(() => {
    if (product.isUnavailable) return "Unavailable";
    switch (product.availability) {
      case "in-stock":
        return "In stock";
      case "low-stock":
        return "Low stock — order soon";
      case "out-of-stock":
        return "Out of stock";
      case "backorder":
        return "Available on backorder";
      case "unknown":
      default:
        return null;
    }
  }, [product.availability, product.isUnavailable]);

  const handleAdd = () => {
    if (isUnavailable) {
      setValidation("This product is currently unavailable.");
      return;
    }
    if (isColorRequired && !color) {
      setValidation("Please choose a colour before adding to bag.");
      return;
    }
    if (isSizeRequired && !size) {
      setValidation("Please choose a size before adding to bag.");
      return;
    }
    setValidation(null);
    setSubmitting(true);
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      size: size ?? undefined,
      color: color ?? undefined,
      quantity,
      unitPrice: product.price,
    });
    push({
      title: "Added to bag",
      description: `${product.name}${size ? ` — Size ${size}` : ""}${
        color ? `, ${color}` : ""
      } · Quantity ${quantity}`,
    });
    // Briefly lock the button to prevent duplicate submissions.
    window.setTimeout(() => setSubmitting(false), 600);
  };

  const selectedColor = useMemo(
    () => product.colors?.find((entry) => entry.name === color) ?? null,
    [product.colors, color],
  );

  return (
    <div className="flex flex-col gap-6 lg:sticky lg:top-[calc(var(--header-height)+1rem)]">
      {/* Badges + availability */}
      <div className="flex flex-wrap items-center gap-2">
        {product.badges?.map((badge) => (
          <BadgePill
            key={badge.label}
            tone={badge.tone ?? "neutral"}
          >
            {badge.label}
          </BadgePill>
        ))}
        {availabilityLabel ? (
          <BadgePill tone={availabilityTone(product.availability)}>
            {availabilityLabel}
          </BadgePill>
        ) : null}
      </div>

      <header>
        <h1 className="text-display-lg text-ink">{product.name}</h1>
        {product.subtitle ? (
          <p className="mt-2 text-sm text-ink-muted">{product.subtitle}</p>
        ) : null}
      </header>

      {/* Price */}
      <div className="flex items-baseline gap-3">
        <span
          className={cn(
            "text-lg",
            isOnSale ? "text-danger" : "text-ink",
          )}
        >
          {formatPrice(product.price.amount, product.price.currency)}
        </span>
        {product.compareAtPrice ? (
          <>
            <span className="text-sm text-ink-subtle line-through">
              {formatPrice(
                product.compareAtPrice.amount,
                product.compareAtPrice.currency,
              )}
            </span>
            {savingsPercent(product.price.amount, product.compareAtPrice.amount) ? (
              <span className="text-eyebrow uppercase text-danger">
                Save{" "}
                {savingsPercent(product.price.amount, product.compareAtPrice.amount)}%
              </span>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Short description */}
      <p className="max-w-prose text-sm text-ink-muted">{product.description}</p>

      <Divider />

      {/* Colour selector */}
      {product.colors && product.colors.length > 0 ? (
        <div>
          <div className="flex items-center justify-between">
            <p className="field-label">
              Colour
              {selectedColor ? (
                <span className="ml-2 text-eyebrow uppercase text-ink">
                  {selectedColor.name}
                </span>
              ) : null}
            </p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.colors.map((entry) => {
              const isSelected = entry.name === color;
              return (
                <button
                  key={entry.name}
                  type="button"
                  onClick={() => setColor(entry.name)}
                  aria-pressed={isSelected}
                  aria-label={`Colour — ${entry.name}`}
                  className={cn(
                    "h-10 w-10 rounded-full border transition-transform hover:scale-105",
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
        </div>
      ) : null}

      {/* Size selector */}
      {sizes.length > 0 ? (
        <div>
          <div className="flex items-center justify-between">
            <p className="field-label">Size</p>
            {sizeChart ? (
              <button
                type="button"
                onClick={() => setSizeGuideOpen(true)}
                className="link-underline text-eyebrow uppercase text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Size guide
              </button>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {sizes.map((entry) => {
              const isSelected = entry.code === size;
              const isAvailable = entry.available !== false;
              return (
                <button
                  key={entry.code}
                  type="button"
                  onClick={() => isAvailable && setSize(entry.code)}
                  disabled={!isAvailable}
                  aria-pressed={isSelected}
                  aria-label={`Size ${entry.code}${
                    !isAvailable ? " — unavailable" : ""
                  }`}
                  className={cn(
                    "relative h-11 min-w-12 border px-3 text-xs uppercase tracking-[0.18em]",
                    "transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
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
        </div>
      ) : null}

      {/* Quantity */}
      <div>
        <p className="field-label">Quantity</p>
        <div className="mt-2 inline-flex items-center border border-line">
          <button
            type="button"
            onClick={() => setQuantity((current) => Math.max(1, current - 1))}
            className="h-11 w-11 text-sm text-ink transition-colors hover:bg-paper-warm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            aria-label="Decrease quantity"
          >
            <MinusIcon className="mx-auto h-3 w-3" />
          </button>
          <span
            className="min-w-10 px-4 text-center text-sm tabular-nums"
            aria-live="polite"
          >
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((current) => Math.min(10, current + 1))}
            className="h-11 w-11 text-sm text-ink transition-colors hover:bg-paper-warm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            aria-label="Increase quantity"
          >
            <PlusIcon className="mx-auto h-3 w-3" />
          </button>
        </div>
        {validation ? (
          <p role="alert" className="field-error">
            {validation}
          </p>
        ) : null}
      </div>

      {/* Add to Bag + Wishlist */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          fullWidth
          onClick={handleAdd}
          disabled={submitting || isUnavailable}
          aria-busy={submitting || undefined}
        >
          {isUnavailable
            ? "Unavailable"
            : submitting
            ? "Adding…"
            : inCart > 0
            ? "Add to Bag"
            : "Add to Bag"}
        </Button>
        <WishlistButton
          productId={product.id}
          productName={product.name}
        />
      </div>

      <Divider />

      {/* Accordion sections */}
      <div className="border-t border-line">
        {product.details && product.details.length > 0 ? (
          <Disclosure
            id="product-details"
            title="Product Details"
            defaultOpen
          >
            <ul className="list-disc space-y-1.5 pl-5">
              {product.details.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Disclosure>
        ) : null}
        {product.fitInformation ? (
          <Disclosure id="product-fit" title="Fit & Sizing">
            <p>{product.fitInformation}</p>
          </Disclosure>
        ) : null}
        {product.fabricAndCare && product.fabricAndCare.length > 0 ? (
          <Disclosure id="product-fabric" title="Fabric & Care">
            <ul className="list-disc space-y-1.5 pl-5">
              {product.fabricAndCare.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Disclosure>
        ) : null}
        <Disclosure id="product-delivery" title="Delivery & Returns">
          <p>
            Complimentary shipping on orders over ৳5,000. We currently
            deliver across Bangladesh.
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>
              Inside Dhaka: ৳70 — see{" "}
              <a href="/help/shipping" className="link-underline text-ink">
                shipping
              </a>{" "}
              for delivery times.
            </li>
            <li>
              Outside Dhaka: ৳120 — see{" "}
              <a href="/help/shipping" className="link-underline text-ink">
                shipping
              </a>{" "}
              for delivery times.
            </li>
            <li>
              Free returns within 30 days — see{" "}
              <a href="/help/returns" className="link-underline text-ink">
                returns
              </a>{" "}
              for the process.
            </li>
          </ul>
        </Disclosure>
      </div>

      <SizeGuideModal
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        chart={sizeChart}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function Disclosure({
  title,
  id,
  defaultOpen = false,
  children,
}: {
  title: string;
  id: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className="group border-b border-line py-4 [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer items-center justify-between text-eyebrow uppercase text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
        <span>{title}</span>
        <span
          aria-hidden="true"
          className="text-ink-muted transition-transform group-open:rotate-180"
        >
          +
        </span>
      </summary>
      <div className="mt-3 text-sm text-ink-muted">{children}</div>
    </details>
  );
}

function BadgePill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "neutral" | "sale" | "new" | "low-stock" | "success" | "warning" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 text-eyebrow uppercase",
        tone === "sale" && "border border-danger text-danger",
        tone === "new" && "border border-ink bg-ink text-paper",
        tone === "low-stock" && "border border-warning text-warning",
        tone === "success" && "border border-success text-success",
        tone === "warning" && "border border-warning text-warning",
        tone === "danger" && "border border-danger text-danger",
        tone === "neutral" && "border border-line text-ink-muted",
      )}
    >
      {children}
    </span>
  );
}

function availabilityTone(
  availability: ProductSummary["availability"],
): "success" | "warning" | "danger" | "neutral" {
  switch (availability) {
    case "in-stock":
      return "success";
    case "low-stock":
      return "warning";
    case "out-of-stock":
      return "danger";
    case "backorder":
    case "unknown":
    default:
      return "neutral";
  }
}

function savingsPercent(price: number, compareAt: number): number {
  if (compareAt <= 0 || price >= compareAt) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
