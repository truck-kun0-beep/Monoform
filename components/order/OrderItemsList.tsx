import Link from "next/link";
import { ProductImagePlaceholder } from "@/components/media";
import { cn, formatPrice } from "@/lib/utils";
import type { OrderItem } from "@/lib/account";

type Props = {
  items: OrderItem[];
  className?: string;
};

/**
 * Renders the line items in an order. Product names, variants,
 * unit prices and line subtotals are rendered from the order
 * snapshot — never from the live catalogue — so historical
 * orders remain stable even when the catalogue changes.
 */
export function OrderItemsList({ items, className }: Props) {
  if (items.length === 0) {
    return (
      <p className={cn("text-sm text-ink-muted", className)}>
        No items in this order.
      </p>
    );
  }

  return (
    <ul
      className={cn("divide-y divide-line border border-line bg-paper", className)}
      aria-label="Order items"
    >
      {items.map((item, index) => (
        <li
          key={`${item.productId}-${item.size ?? ""}-${item.color ?? ""}-${index}`}
          className="grid grid-cols-[72px_1fr] gap-3 p-4 sm:grid-cols-[96px_1fr] sm:gap-4 sm:p-6"
        >
          <div className="block overflow-hidden">
            <ProductImagePlaceholder
              image={{
                alt: item.image?.alt ?? item.name,
                aspectRatio: item.image?.aspectRatio ?? 3 / 4,
              }}
              hideLabel
            />
          </div>
          <div className="flex min-w-0 flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {item.slug ? (
                  <Link
                    href={`/product/${item.slug}`}
                    className="link-underline text-sm text-ink"
                  >
                    {item.name}
                  </Link>
                ) : (
                  <p className="text-sm text-ink">{item.name}</p>
                )}
                <VariantLine item={item} />
              </div>
              <p
                className="shrink-0 text-sm tabular-nums text-ink"
                aria-label={`Line subtotal for ${item.name}`}
              >
                {formatPrice(item.lineTotal.amount, item.lineTotal.currency)}
              </p>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {formatPrice(item.unitPrice.amount, item.unitPrice.currency)} ·{" "}
              Qty {item.quantity}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function VariantLine({ item }: { item: OrderItem }) {
  if (!item.size && !item.color && !item.variant) return null;
  return (
    <dl className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
      {item.color ? (
        <div className="flex items-center gap-1.5">
          <dt className="uppercase tracking-[0.18em]">Colour</dt>
          <dd className="text-ink">{item.color}</dd>
        </div>
      ) : null}
      {item.size ? (
        <div className="flex items-center gap-1.5">
          <dt className="uppercase tracking-[0.18em]">Size</dt>
          <dd className="text-ink">{item.size}</dd>
        </div>
      ) : null}
      {!item.size && !item.color && item.variant ? (
        <div className="flex items-center gap-1.5">
          <dt className="uppercase tracking-[0.18em]">Variant</dt>
          <dd className="text-ink">{item.variant}</dd>
        </div>
      ) : null}
    </dl>
  );
}
