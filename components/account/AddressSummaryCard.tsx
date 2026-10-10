import Link from "next/link";
import type { CustomerAddress } from "@/lib/account";

type Props = {
  /** The customer's saved addresses. */
  addresses: CustomerAddress[];
  /** Maximum number of addresses to render in the preview. */
  maxItems?: number;
};

/**
 * Compact summary used on the account dashboard. Shows up to
 * `maxItems` addresses and a link to the addresses page for
 * the full list. When the customer has no saved addresses, a
 * prompt to add one is shown instead.
 */
export function AddressSummaryCard({ addresses, maxItems = 2 }: Props) {
  const visible = addresses.slice(0, maxItems);
  const more = addresses.length - visible.length;

  return (
    <section className="flex flex-col gap-4 border border-line bg-paper p-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-eyebrow uppercase text-ink-muted">Delivery Addresses</p>
          <p className="mt-1 text-sm text-ink">
            {addresses.length === 0
              ? "No saved addresses yet."
              : `${addresses.length} ${addresses.length === 1 ? "address" : "addresses"} saved.`}
          </p>
        </div>
        <Link
          href="/account/addresses"
          className="text-eyebrow uppercase text-ink-muted transition-colors hover:text-ink"
        >
          Manage
        </Link>
      </header>

      {addresses.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Add a delivery address to make checkout faster. You can add one
          from the{" "}
          <Link href="/account/addresses" className="link-underline text-ink">
            addresses page
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-3 text-sm text-ink-muted">
          {visible.map((address) => (
            <li key={address.id} className="border-t border-line pt-3">
              <p className="text-ink">{address.recipientName}</p>
              <p>
                {address.addressLine}
                {address.additionalDetails ? `, ${address.additionalDetails}` : ""}
              </p>
              <p>
                {address.locality ? `${address.locality}, ` : ""}
                {address.district}
              </p>
              <p className="mt-1 text-xs text-ink-subtle">
                {address.phone} ·{" "}
                {address.deliveryZone === "inside_dhaka"
                  ? "Inside Dhaka"
                  : "Outside Dhaka"}
                {address.isDefault ? " · Default" : ""}
              </p>
            </li>
          ))}
          {more > 0 ? (
            <li className="text-xs text-ink-subtle">
              +{more} more — see the{" "}
              <Link
                href="/account/addresses"
                className="link-underline text-ink"
              >
                addresses page
              </Link>
              .
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}
