"use client";

import { useId } from "react";
import { useWishlist } from "@/lib/wishlist";
import { cn } from "@/lib/utils";

type Props = {
  productId: string;
  productName: string;
  variant?: "icon" | "full";
  className?: string;
};

/**
 * Wishlist toggle. Renders either an icon-only heart button (used
 * inside the product info panel) or a full-width labelled control
 * with a "View wishlist" link to /wishlist when active.
 *
 * Persistence uses the local wishlist store; no fake account
 * confirmation is ever shown. The label clearly says "Saved" once
 * a product is added so the visitor can always see the current
 * state.
 */
export function WishlistButton({
  productId,
  productName,
  variant = "icon",
  className,
}: Props) {
  const { has, toggle } = useWishlist();
  const labelId = useId();
  const active = has(productId);

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={() => toggle(productId)}
        aria-pressed={active}
        aria-labelledby={labelId}
        className={cn(
          "inline-flex h-12 w-12 items-center justify-center border border-line text-ink",
          "transition-colors duration-base ease-out-soft",
          "hover:border-ink hover:bg-ink hover:text-paper",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          active && "border-ink bg-ink text-paper",
          className,
        )}
      >
        <HeartIcon filled={active} className="h-5 w-5" />
        <span id={labelId} className="sr-only">
          {active ? "Remove from wishlist" : "Save to wishlist"} — {productName}
        </span>
      </button>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <button
        type="button"
        onClick={() => toggle(productId)}
        aria-pressed={active}
        className={cn(
          "inline-flex h-11 items-center gap-2 border border-line px-4 text-xs uppercase tracking-[0.18em] text-ink",
          "transition-colors duration-base ease-out-soft",
          "hover:border-ink hover:bg-ink hover:text-paper",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          active && "border-ink bg-ink text-paper",
        )}
      >
        <HeartIcon filled={active} className="h-4 w-4" />
        {active ? "Saved" : "Save"}
      </button>
      {active ? (
        <a
          href="/wishlist"
          className="link-underline text-eyebrow uppercase text-ink-muted"
        >
          View wishlist
        </a>
      ) : null}
    </div>
  );
}

function HeartIcon({ filled, className }: { filled: boolean; className?: string }) {
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
