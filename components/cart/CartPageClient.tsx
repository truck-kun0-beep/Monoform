"use client";

import { useEffect, useMemo, useState } from "react";
import { Breadcrumbs, ProductCarousel } from "@/components/product";
import {
  CartItemRow,
  CartOrderSummary,
  CartUndoToast,
  ContinueShoppingLink,
  EmptyCartState,
} from "@/components/cart";
import { Container, Divider, Section, Spinner } from "@/components/ui";
import { useCart } from "@/lib/cart";
import { recommendForCart } from "@/lib/cart/recommendations";
import { formatPrice } from "@/lib/utils";
import type { ProductSummary } from "@/types";

/**
 * Client-side cart page renderer.
 *
 * Subscribes to the shared cart store and renders the full
 * `/cart` experience. The route file (`app/cart/page.tsx`) is a
 * server component that owns the `metadata` export; this component
 * handles everything that requires the cart hook.
 */
export function CartPageClient() {
  const { lines, subtotal, itemCount } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const recommendations = useMemo<ProductSummary[]>(() => {
    if (lines.length === 0) return [];
    return recommendForCart(lines, 8);
  }, [lines]);

  if (!mounted) {
    return (
      <Section spacing="lg" tone="paper">
        <Container>
          <PageHeading itemCount={0} />
          <div className="mt-12 flex justify-center">
            <Spinner label="Loading your bag" />
          </div>
        </Container>
      </Section>
    );
  }

  if (lines.length === 0) {
    return <EmptyCartState />;
  }

  return (
    <>
      <Section spacing="md" tone="paper" className="border-b border-line">
        <Container>
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Your Bag" },
            ]}
            className="mb-6"
          />
          <PageHeading itemCount={itemCount} />
        </Container>
      </Section>

      <Section spacing="lg" tone="paper">
        <Container>
          <CartUndoToast />
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_360px]">
            <div>
              <ul
                aria-label={`Bag, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
                className="divide-y divide-line"
              >
                {lines.map((line) => (
                  <li key={line.id}>
                    <CartItemRow line={line} variant="page" />
                  </li>
                ))}
              </ul>
              <Divider weight="thin" className="mt-2" />
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
                <ContinueShoppingLink href="/new-arrivals" />
                <p className="text-eyebrow uppercase text-ink-muted">
                  Subtotal {formatPrice(subtotal.amount, subtotal.currency)}
                </p>
              </div>
            </div>
            <CartOrderSummary
              subtotal={subtotal}
              itemCount={itemCount}
              ctaHref="/checkout"
            />
          </div>
        </Container>
      </Section>

      {recommendations.length > 0 ? (
        <Section
          spacing="lg"
          tone="warm"
          className="border-t border-line"
          aria-label="You may also like"
        >
          <Container>
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow">You may also like</p>
                <h2 className="mt-2 text-display-md text-ink">
                  Pieces to round out your bag.
                </h2>
              </div>
              <ContinueShoppingLink href="/new-arrivals" />
            </div>
            <div className="mt-10">
              <ProductCarousel products={recommendations} />
            </div>
          </Container>
        </Section>
      ) : null}
    </>
  );
}

function PageHeading({ itemCount }: { itemCount: number }) {
  return (
    <header>
      <p className="eyebrow">Bag</p>
      <h1 className="mt-2 text-display-xl text-ink">Your Bag</h1>
      <p className="mt-3 max-w-prose text-sm text-ink-muted">
        {itemCount === 0
          ? "Review the items in your bag, update quantities or change a size or colour, then continue to checkout."
          : `${itemCount} ${itemCount === 1 ? "item" : "items"} ready for review. Update quantities, change a size or colour, or remove anything you no longer want.`}
      </p>
    </header>
  );
}
