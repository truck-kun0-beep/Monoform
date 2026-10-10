import type { CustomerAddress } from "@/lib/account";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { AddressActionButtons } from "./AddressActionButtons";

type Props = {
  address: CustomerAddress;
  onEdit: (address: CustomerAddress) => void;
};

/**
 * Read-only card displaying one of the customer's saved addresses.
 * The default address is marked with a "Default" pill so the
 * customer can see which address will be pre-selected at checkout.
 *
 * The card renders the action buttons (set default, edit, delete)
 * through a small client component so the buttons can call the
 * server actions without the whole card becoming a client island.
 */
export function AddressCard({ address, onEdit }: Props) {
  return (
    <article
      className={cn(
        "flex flex-col gap-3 border border-line bg-paper p-6",
        address.isDefault && "border-ink",
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-eyebrow uppercase text-ink">
          {address.recipientName}
        </h3>
        {address.isDefault ? (
          <span className="border border-ink bg-ink px-2.5 py-1 text-eyebrow uppercase text-paper">
            Default
          </span>
        ) : null}
      </header>
      <address className="not-italic text-sm text-ink-muted">
        <p>{address.addressLine}</p>
        {address.additionalDetails ? (
          <p>{address.additionalDetails}</p>
        ) : null}
        <p>
          {address.locality ? `${address.locality}, ` : ""}
          {address.district}
          {address.postalCode ? ` ${address.postalCode}` : ""}
        </p>
        <p className="mt-1">
          {address.phone} · {deliveryZoneLabel(address.deliveryZone)}
        </p>
        {address.deliveryInstructions ? (
          <p className="mt-2 text-xs text-ink-subtle">
            Note: {address.deliveryInstructions}
          </p>
        ) : null}
      </address>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onEdit(address)}
        >
          Edit
        </Button>
        <AddressActionButtons address={address} />
      </div>
    </article>
  );
}

function deliveryZoneLabel(zone: CustomerAddress["deliveryZone"]): string {
  return zone === "inside_dhaka" ? "Inside Dhaka" : "Outside Dhaka";
}
