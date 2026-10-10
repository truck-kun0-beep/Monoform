"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Divider, Drawer, EmptyState } from "@/components/ui";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/utils";
import { CartItemRow } from "./CartItemRow";
import { CheckoutCta } from "./CheckoutCta";

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Right-side shopping-bag drawer. Reads directly from the cart store
 * so the count, contents and totals always agree with the cart page
 * and any product that mutates the bag.
 */
export function ShoppingBagDrawer({ open, onClose }: Props) {
  const { lines, subtotal, itemCount } = useCart();
  const isEmpty = lines.length === 0;
  const [mounted, setMounted] = useState(false);

  // Defer the cart snapshot until the component is mounted to avoid
  // hydration mismatches between SSR (always empty) and the persisted
  // localStorage state.
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Drawer open={open} onClose={onClose} side="right" title="Your Bag">
      {isEmpty ? (
        <div className="flex h-full flex-col">
          <EmptyState
            title="Your bag is empty"
            body="Discover the latest arrivals and curated edits to begin."
            action={{ label: "Continue Shopping", href: "/new-arrivals" }}
          />
          <div className="mt-auto">
            <Button
              href="/new-arrivals"
              variant="secondary"
              fullWidth
              onClick={onClose}
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between text-eyebrow uppercase text-ink-muted">
            <span>
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
            <span>{mounted ? "Updated just now" : null}</span>
          </div>
          <Divider className="my-4" weight="thin" />
          <ul className="flex-1 divide-y divide-line overflow-y-auto">
            {lines.map((line) => (
              <li key={line.id}>
                <CartItemRow
                  line={line}
                  variant="drawer"
                  onClose={onClose}
                />
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-line pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-eyebrow uppercase text-ink-muted">
                Subtotal
              </span>
              <span className="text-base text-ink">
                {formatPrice(subtotal.amount, subtotal.currency)}
              </span>
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              Shipping and taxes are calculated at checkout.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <div onClick={onClose}>
                <CheckoutCta redirectTo="/checkout" label="Checkout" />
              </div>
              <Button href="/cart" variant="secondary" fullWidth onClick={onClose}>
                View Bag
              </Button>
              <Link
                href="/new-arrivals"
                onClick={onClose}
                className="link-underline mt-1 self-center text-eyebrow uppercase text-ink-muted"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
