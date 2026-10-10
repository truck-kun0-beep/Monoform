"use client";

import Link from "next/link";
import { ProductImagePlaceholder } from "@/components/media";
import { Badge, useToast } from "@/components/ui";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { cn, formatPrice } from "@/lib/utils";
import type { ProductSummary } from "@/types";
import { useState } from "react";

type Props = {
  product: ProductSummary;
  priority?: boolean;
  /** Show a "Quick add" action that adds a default variant to the bag. */
  showQuickAdd?: boolean;
  /** Hide the in-development label on the placeholder image. */
  hideImageLabel?: boolean;
  /** Overlay a wishlist heart toggle on the media area. */
  showWishlist?: boolean;
};

/**
 * Product card used on category, search, new arrivals, sale pages
 * and the homepage. Pricing renders the sale price alongside the
 * comparison price when applicable. Prices are formatted using the
 * shared `formatPrice` utility which uses the brand's BDT ৳ symbol
 * for products priced in Bangladeshi taka.
 */
export function ProductCard({
  product,
  priority: _priority,
  showQuickAdd = false,
  hideImageLabel = true,
  showWishlist = false,
}: Props) {
  const href = `/product/${product.slug}`;
  const isOnSale = Boolean(product.compareAtPrice);
  const primaryBadge = product.badges?.[0];

  return (
    <article className="group flex flex-col">
      <Link
        href={href}
        className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        aria-label={`${product.name}, ${formatPrice(product.price.amount, product.price.currency)}`}
      >
        <div className="relative">
          <ProductImagePlaceholder
            image={product.image}
            hideLabel={hideImageLabel}
          />
          {primaryBadge ? (
            <div className="absolute left-3 top-3">
              <Badge tone={primaryBadge.tone ?? "neutral"}>
                {primaryBadge.label}
              </Badge>
            </div>
          ) : null}
          {showWishlist ? (
            <WishlistToggle
              productId={product.id}
              productName={product.name}
            />
          ) : null}
        </div>
        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm text-ink">{product.name}</h3>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-ink-muted">
              {product.subCategory ?? product.category}
            </p>
          </div>
          <div className="shrink-0 text-right text-sm">
            <p className={cn(isOnSale ? "text-danger" : "text-ink")}>
              {formatPrice(product.price.amount, product.price.currency)}
            </p>
            {product.compareAtPrice ? (
              <p className="text-xs text-ink-subtle line-through">
                {formatPrice(
                  product.compareAtPrice.amount,
                  product.compareAtPrice.currency,
                )}
              </p>
            ) : null}
          </div>
        </div>
        {product.colors && product.colors.length > 0 ? (
          <ul
            aria-label={`Available colours — ${product.name}`}
            className="mt-3 flex items-center gap-1.5"
          >
            {product.colors.slice(0, 5).map((color) => (
              <li
                key={color.name}
                className="h-3 w-3 rounded-full border border-line"
                style={{ backgroundColor: color.value }}
                title={color.name}
                aria-label={color.name}
              />
            ))}
            {product.colors.length > 5 ? (
              <li className="text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                +{product.colors.length - 5}
              </li>
            ) : null}
          </ul>
        ) : null}
      </Link>
      {showQuickAdd ? <QuickAdd product={product} /> : null}
    </article>
  );
}

/**
 * Compact wishlist toggle overlaid on the product media. Renders
 * inside the `<Link>` wrapper but stops propagation so clicking the
 * heart doesn't navigate to the product page.
 */
function WishlistToggle({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const { has, toggle } = useWishlist();
  const active = has(productId);
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(productId);
      }}
      aria-pressed={active}
      aria-label={
        active
          ? `Remove ${productName} from wishlist`
          : `Save ${productName} to wishlist`
      }
      className={cn(
        "absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center border border-line bg-paper/90 backdrop-blur",
        "transition-colors duration-base ease-out-soft",
        "hover:border-ink hover:bg-ink hover:text-paper",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        active && "border-ink bg-ink text-paper",
      )}
    >
      <HeartIcon filled={active} className="h-4 w-4" />
    </button>
  );
}

function HeartIcon({
  filled,
  className,
}: {
  filled: boolean;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 20.7s-7.5-4.5-9.6-9.4C1 8 3 4 6.6 4c2 0 3.5 1.2 4.4 2.5l1 1.4 1-1.4C14 5.2 15.4 4 17.4 4 21 4 23 8 21.6 11.3 19.5 16.2 12 20.7 12 20.7Z" />
    </svg>
  );
}

/**
 * Quick-add control. Adds a default variant of the product (first
 * colour, no size) to the cart and confirms via toast. Used on the
 * homepage where the user has not yet selected a variant.
 */
function QuickAdd({ product }: { product: ProductSummary }) {
  const { add } = useCart();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  const onAdd = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      color: product.colors?.[0]?.name,
      quantity: 1,
      unitPrice: product.price,
    });
    push({
      title: "Added to bag",
      description: product.name,
    });
    // Brief lockout to prevent rapid double-clicks.
    setTimeout(() => setBusy(false), 400);
  };

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={busy}
      aria-label={`Quick add ${product.name} to bag`}
      className={cn(
        "mt-4 inline-flex w-full items-center justify-center border border-ink px-4 py-2.5",
        "text-eyebrow uppercase text-ink",
        "transition-colors duration-base ease-out-soft",
        "hover:bg-ink hover:text-paper",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        "disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      {busy ? "Added" : "Quick Add"}
    </button>
  );
}
