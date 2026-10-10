import { Divider } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import type { Money } from "@/types";

type Props = {
  subtotal: Money;
  shipping?: Money;
  tax?: Money;
  total: Money;
  ctaLabel?: string;
  ctaHref?: string;
  className?: string;
};

/**
 * Cart summary panel. Used on the cart page and at the checkout review
 * step. Numbers are placeholders until the cart store is implemented.
 */
export function CartSummary({
  subtotal,
  shipping,
  tax,
  total,
  ctaLabel,
  ctaHref,
  className,
}: Props) {
  return (
    <aside
      className={
        "border border-line bg-paper p-6 sm:p-8 " + (className ?? "")
      }
      aria-label="Order summary"
    >
      <h2 className="text-eyebrow uppercase text-ink-muted">Order Summary</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <Row label="Subtotal" value={subtotal} />
        {shipping ? <Row label="Shipping" value={shipping} /> : null}
        {tax ? <Row label="Tax" value={tax} /> : null}
      </dl>
      <Divider className="my-6" weight="thin" />
      <div className="flex items-center justify-between text-sm">
        <span className="text-eyebrow uppercase text-ink-muted">Total</span>
        <span className="text-base text-ink">
          {formatPrice(total.amount, total.currency)}
        </span>
      </div>
      {ctaLabel && ctaHref ? (
        <a
          href={ctaHref}
          className="mt-6 inline-flex w-full items-center justify-center bg-ink px-6 py-3 text-xs uppercase tracking-[0.2em] text-paper transition-colors hover:bg-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {ctaLabel}
        </a>
      ) : null}
    </aside>
  );
}

function Row({ label, value }: { label: string; value: Money }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink">
        {formatPrice(value.amount, value.currency)}
      </dd>
    </div>
  );
}
