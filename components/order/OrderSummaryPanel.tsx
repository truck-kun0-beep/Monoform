import { Divider } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import type { Money } from "@/types";

type Props = {
  subtotal: Money;
  deliveryFee: Money;
  total: Money;
  className?: string;
};

/**
 * Order totals panel. Renders the merchandise subtotal, the
 * delivery charge and the final order total. Used on the
 * confirmation page and the authenticated order detail page.
 */
export function OrderSummaryPanel({
  subtotal,
  deliveryFee,
  total,
  className,
}: Props) {
  return (
    <section
      className={className}
      aria-label="Order totals"
    >
      <div className="border border-line bg-paper p-6">
        <h2 className="text-eyebrow uppercase text-ink-muted">Order totals</h2>
        <dl className="mt-4 flex flex-col gap-3 text-sm">
          <Row label="Subtotal" value={subtotal} />
          <Row
            label="Delivery"
            value={deliveryFee}
            valueNote={deliveryFee.amount === 0 ? "Free" : undefined}
          />
        </dl>
        <Divider weight="thin" className="my-6" />
        <div className="flex items-baseline justify-between">
          <dt className="text-eyebrow uppercase text-ink-muted">Total</dt>
          <dd className="text-base tabular-nums text-ink">
            {formatPrice(total.amount, total.currency)}
          </dd>
        </div>
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  valueNote,
}: {
  label: string;
  value: Money;
  valueNote?: string;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="tabular-nums text-ink">
        {formatPrice(value.amount, value.currency)}
        {valueNote ? (
          <span className="ml-2 text-xs text-ink-subtle">{valueNote}</span>
        ) : null}
      </dd>
    </div>
  );
}
