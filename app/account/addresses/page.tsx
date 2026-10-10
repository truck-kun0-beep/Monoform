import {
  AccountShell,
  AccountNotConfiguredNotice,
  AddressList,
} from "@/components/account";
import { ErrorMessage } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listAddresses } from "@/lib/account/address";

export const metadata = {
  title: "Delivery Addresses",
  description: "Manage your saved delivery addresses.",
};

/**
 * `/account/addresses` — the customer's saved-address manager.
 *
 * The list is owner-scoped through RLS, so a customer can never
 * see another customer's addresses even if they tamper with the
 * URL. Each address supports edit / delete / set-default through
 * the `AddressList` client island.
 */
export default async function AddressesPage() {
  await requireUser("/account/addresses");
  const result = await listAddresses();

  if (result.kind === "not_configured") {
    return (
      <AccountShell
        current="/account/addresses"
        title="Delivery addresses"
        description="Add delivery addresses to make checkout faster."
      >
        <AccountNotConfiguredNotice />
      </AccountShell>
    );
  }

  if (result.kind === "error") {
    return (
      <AccountShell
        current="/account/addresses"
        title="Delivery addresses"
        description="Add delivery addresses to make checkout faster."
      >
        <ErrorMessage title="Could not load your addresses">
          {result.message}
        </ErrorMessage>
      </AccountShell>
    );
  }

  return (
    <AccountShell
      current="/account/addresses"
      title="Delivery addresses"
      description="Add, edit and choose a default delivery address. The default address is pre-selected at checkout."
    >
      <AddressList
        addresses={result.addresses}
        forceFirstDefault={result.addresses.length === 0}
      />
    </AccountShell>
  );
}
