import type { OrderAddressSnapshot } from "@/lib/account";

type Props = {
  address: OrderAddressSnapshot;
  /** Optional heading shown above the address. */
  title?: string;
  /**
   * When `true`, only the district / delivery area is shown.
   * The public tracking result uses this to avoid leaking the
   * full street address to an unauthenticated visitor.
   */
  limited?: boolean;
  className?: string;
};

/**
 * Renders the delivery address snapshot stored on the order.
 * The address is the one used at the time of the order, not the
 * customer's currently saved address.
 */
export function OrderAddressCard({
  address,
  title = "Delivery address",
  limited = false,
  className,
}: Props) {
  return (
    <section
      className={className}
      aria-label={title}
    >
      <div className="border border-line bg-paper p-6">
        <h2 className="text-eyebrow uppercase text-ink-muted">{title}</h2>
        <address className="mt-3 not-italic text-sm text-ink">
          <p className="text-ink">{address.recipientName}</p>
          <p>{address.phone}</p>
          {limited ? (
            <p className="mt-1 text-ink-muted">
              {address.locality ? `${address.locality}, ` : ""}
              {address.district}
              {" · "}
              {address.deliveryZone === "inside_dhaka"
                ? "Inside Dhaka"
                : "Outside Dhaka"}
            </p>
          ) : (
            <>
              <p>{address.addressLine}</p>
              {address.additionalDetails ? (
                <p>{address.additionalDetails}</p>
              ) : null}
              <p>
                {address.locality ? `${address.locality}, ` : ""}
                {address.district}
                {address.postalCode ? ` ${address.postalCode}` : ""}
              </p>
              <p className="mt-1 text-ink-muted">
                {address.deliveryZone === "inside_dhaka"
                  ? "Inside Dhaka"
                  : "Outside Dhaka"}
              </p>
              {address.deliveryInstructions ? (
                <p className="mt-2 text-xs text-ink-subtle">
                  Note: {address.deliveryInstructions}
                </p>
              ) : null}
            </>
          )}
        </address>
      </div>
    </section>
  );
}
