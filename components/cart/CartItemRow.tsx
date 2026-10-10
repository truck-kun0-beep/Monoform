"use client";

import Link from "next/link";
import { ProductImagePlaceholder } from "@/components/media";
import { useCart } from "@/lib/cart";
import { cn, formatPrice } from "@/lib/utils";
import type { CartLine } from "@/types";
import { CartQuantityControl } from "./CartQuantityControl";
import { CartVariantSelector } from "./CartVariantSelector";

type Props = {
  line: CartLine;
  /** Layout mode. `page` is the full /cart row; `drawer` is the
   *  compact summary used by the shopping-bag drawer. */
  variant?: "drawer" | "page";
  /** Optional callback fired when a row link is clicked (used to
   *  close the shopping-bag drawer). */
  onClose?: () => void;
};

/**
 * Single line in the shopping bag. Reads the cart store directly so
 * the quantity steppers, variant editor and remove control are
 * always in sync with the cart page and any other surface that
 * observes the bag.
 */
export function CartItemRow({ line, variant = "page", onClose }: Props) {
  const { update, remove, changeSize, changeColor } = useCart();
  const isDrawer = variant === "drawer";

  return (
    <article
      className={cn(
        "grid items-start gap-4",
        isDrawer
          ? "grid-cols-[80px_1fr] gap-3 py-4"
          : "grid-cols-[96px_1fr] gap-4 py-6 sm:grid-cols-[120px_1fr] sm:gap-6",
      )}
    >
      <Link
        href={`/product/${line.slug}`}
        onClick={() => onClose?.()}
        className={cn(
          "block overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        )}
        aria-label={`View ${line.name}`}
      >
        <ProductImagePlaceholder image={line.image} hideLabel />
      </Link>
      <div className="flex min-w-0 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/product/${line.slug}`}
              onClick={() => onClose?.()}
              className="link-underline text-sm text-ink"
            >
              {line.name}
            </Link>
            <VariantLine line={line} />
          </div>
          <p
            className="shrink-0 text-sm tabular-nums text-ink"
            aria-label={`Line subtotal for ${line.name}`}
          >
            {formatPrice(line.lineTotal.amount, line.lineTotal.currency)}
          </p>
        </div>
        <p
          className={cn(
            "mt-1 text-xs text-ink-muted tabular-nums",
            isDrawer ? "hidden" : "block",
          )}
        >
          {formatPrice(line.unitPrice.amount, line.unitPrice.currency)} each
        </p>
        <div
          className={cn(
            "mt-4 flex flex-wrap items-center justify-between gap-3",
          )}
        >
          <CartQuantityControl
            quantity={line.quantity}
            onChange={(next) => {
              if (next <= 0) {
                remove(line.id);
                return;
              }
              update(line.id, next);
            }}
            productName={line.name}
            size={isDrawer ? "sm" : "md"}
          />
          <button
            type="button"
            onClick={() => remove(line.id)}
            className={cn(
              "text-eyebrow uppercase text-ink-muted transition-colors hover:text-ink",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
            )}
            aria-label={`Remove ${line.name} from bag`}
          >
            Remove
          </button>
        </div>
        {!isDrawer ? (
          <CartVariantSelector
            line={line}
            onChangeSize={(next) => changeSize(line.id, next)}
            onChangeColor={(next) => changeColor(line.id, next)}
          />
        ) : null}
      </div>
    </article>
  );
}

/**
 * Compact variant line shown next to the product name. Colour is
 * shown as a coloured swatch plus its label; size is rendered as
 * a text pill. The combination keeps the variant information
 * accessible without relying on colour alone.
 */
function VariantLine({ line }: { line: CartLine }) {
  if (!line.color && !line.size) return null;
  return (
    <dl className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
      {line.color ? (
        <div className="flex items-center gap-1.5">
          <dt className="uppercase tracking-[0.18em]">Colour</dt>
          <dd className="text-ink">{line.color}</dd>
        </div>
      ) : null}
      {line.size ? (
        <div className="flex items-center gap-1.5">
          <dt className="uppercase tracking-[0.18em]">Size</dt>
          <dd className="text-ink">{line.size}</dd>
        </div>
      ) : null}
    </dl>
  );
}
