"use client";

import { BagIcon } from "@/components/ui/Icon";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

type Props = {
  onClick: () => void;
  /** Optional class for spacing variants. */
  className?: string;
};

/**
 * Header button that opens the shopping-bag drawer. Shows the live
 * item count badge when the bag is non-empty.
 */
export function ShoppingBagButton({ onClick, className }: Props) {
  const { itemCount } = useCart();
  const hasItems = itemCount > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open shopping bag, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
      className={cn(
        "relative hidden items-center gap-2 px-2 py-1 text-eyebrow uppercase text-ink lg:inline-flex",
        "transition-colors hover:text-ink-soft",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        className,
      )}
    >
      <BagIcon className="h-5 w-5" />
      <span>Bag{itemCount > 0 ? ` (${itemCount})` : ""}</span>
      {hasItems ? (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-medium text-paper"
        >
          {itemCount}
        </span>
      ) : null}
    </button>
  );
}
