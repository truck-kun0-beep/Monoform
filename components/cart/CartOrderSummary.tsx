import { brand } from "@/config/brand";
import { formatPrice } from "@/lib/utils";
import type { Money } from "@/types";
import { CheckoutCta } from "./CheckoutCta";

type Props = {
  subtotal: Money;
  itemCount: number;
  ctaHref: string;
  ctaLabel?: string;
  className?: string;
};

/**
 * Order summary panel rendered on the right of the cart page.
 *
 * Shows the merchandise subtotal, the item count and a delivery
 * reminder. The destination is not known at this stage so we do
 * not commit a shipping or total value — the spec is explicit that
 * any ৳70 / ৳120 figure must be calculated at checkout only.
 *
 * The CTA is rendered by `CheckoutCta` so unauthenticated visitors
 * are routed through `/login` with a validated return destination
 * while authenticated visitors go straight to checkout.
 */
export function CartOrderSummary({
  subtotal,
  itemCount,
  ctaHref,
  ctaLabel = "Proceed to Checkout",
  className,
}: Props) {
  return (
    <aside
      className={className}
      aria-label="Order summary"
    >
      <div className="border border-line bg-paper p-6 sm:p-8">
        <h2 className="text-eyebrow uppercase text-ink-muted">Order Summary</h2>
        <dl className="mt-6 flex flex-col gap-3 text-sm">
          <SummaryRow
            label={`Subtotal (${itemCount} ${itemCount === 1 ? "item" : "items"})`}
            value={subtotal}
          />
          <div className="flex items-center justify-between text-ink-muted">
            <dt>Delivery</dt>
            <dd>Calculated at checkout</dd>
          </div>
        </dl>
        <p className="mt-6 text-xs text-ink-muted">
          Delivery inside Dhaka is {formatPrice(brand.shipping.insideDhaka.amount, brand.shipping.insideDhaka.currency)} and
          outside Dhaka {formatPrice(brand.shipping.outsideDhaka.amount, brand.shipping.outsideDhaka.currency)} — the
          correct charge is calculated once you confirm your delivery area at
          checkout.
        </p>
        <div className="mt-8 flex flex-col gap-2">
          <CheckoutCta redirectTo={ctaHref} label={ctaLabel} />
        </div>
        <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-ink-subtle">
          Taxes and any applicable duties are calculated at checkout.
        </p>
      </div>
    </aside>
  );
}

function SummaryRow({ label, value }: { label: string; value: Money }) {
  return (
    <div className="flex items-baseline justify-between text-ink">
      <dt className="text-eyebrow uppercase text-ink-muted">{label}</dt>
      <dd className="text-base tabular-nums">
        {formatPrice(value.amount, value.currency)}
      </dd>
    </div>
  );
}
