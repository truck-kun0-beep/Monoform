import Link from "next/link";
import {
  AccountShell,
  AccountNotConfiguredNotice,
  AddressSummaryCard,
  RecentOrdersCard,
} from "@/components/account";
import { Button, ErrorMessage } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getCustomerProfile } from "@/lib/account/profile";
import { isSupabaseConfigured } from "@/lib/auth";
import { listAddresses } from "@/lib/account/address";
import { listOrders } from "@/lib/account/orders";

export const metadata = {
  title: "Account",
  description: "Your MONOFORM account overview.",
};

/**
 * Account dashboard.
 *
 * The page always requires an authenticated session (via
 * `requireUser`). The summary cards only show data that belongs
 * to the signed-in customer — addresses are owner-scoped through
 * RLS and the orders call will short-circuit to a "no orders"
 * state until the real order service is wired in.
 */
export default async function AccountPage() {
  const user = await requireUser("/account");
  const configured = isSupabaseConfigured();

  const [profile, addressesResult, ordersResult] = await Promise.all([
    getCustomerProfile(),
    listAddresses(),
    listOrders(),
  ]);

  const displayName =
    profile?.fullName?.trim() ||
    firstName(user.user_metadata?.full_name as string | undefined) ||
    user.email?.split("@")[0] ||
    "back";

  const addresses =
    addressesResult.kind === "ok" ? addressesResult.addresses : [];
  const orders =
    ordersResult.kind === "ok" ? ordersResult.orders : [];

  return (
    <AccountShell
      current="/account"
      title={`Welcome, ${displayName}.`}
      description="Manage your personal information, saved delivery addresses and order history."
    >
      {!configured ? <AccountNotConfiguredNotice /> : null}

      {addressesResult.kind === "error" ? (
        <ErrorMessage title="Could not load your addresses">
          {addressesResult.message}
        </ErrorMessage>
      ) : null}
      {ordersResult.kind === "error" ? (
        <ErrorMessage title="Could not load your orders">
          {ordersResult.message}
        </ErrorMessage>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <AddressSummaryCard addresses={addresses} />
        <RecentOrdersCard orders={orders} />
      </div>

      <section className="flex flex-col gap-4 border border-line bg-paper p-6">
        <p className="text-eyebrow uppercase text-ink-muted">Quick links</p>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <li>
            <Link
              href="/account/profile"
              className="link-underline block py-1.5 text-sm text-ink"
            >
              Edit personal information
            </Link>
          </li>
          <li>
            <Link
              href="/account/addresses"
              className="link-underline block py-1.5 text-sm text-ink"
            >
              Manage delivery addresses
            </Link>
          </li>
          <li>
            <Link
              href="/account/orders"
              className="link-underline block py-1.5 text-sm text-ink"
            >
              View order history
            </Link>
          </li>
        </ul>
        <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <p className="text-sm text-ink-muted">
            Looking for inspiration?
          </p>
          <Button href="/new-arrivals" variant="secondary" size="sm">
            Continue Shopping
          </Button>
        </div>
      </section>
    </AccountShell>
  );
}

function firstName(fullName: string | undefined): string {
  if (!fullName) return "";
  return fullName.trim().split(/\s+/)[0] ?? "";
}
