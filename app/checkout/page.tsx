import Link from "next/link";
import {
  Button,
  Container,
  ErrorMessage,
  PageHeader,
  Section,
} from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { CheckoutForm } from "@/components/checkout";
import { isOrderBackendConfigured } from "@/lib/orders/server";

export const metadata = {
  title: "Checkout",
  description: "Complete your order.",
};

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  const backendReady = isOrderBackendConfigured();

  return (
    <Section spacing="lg" tone="paper">
      <Container>
        <PageHeader
          eyebrow="Checkout"
          title="Complete your order"
          description="Review your bag, confirm the delivery details and choose a payment method. The order service calculates the delivery charge and persists the order atomically."
        />

        {!user ? (
          <div className="mt-10">
            <ErrorMessage title="Sign in required">
              <p>
                Please{" "}
                <Link
                  href={`/login?redirect=${encodeURIComponent("/checkout")}`}
                  className="link-underline text-ink"
                >
                  sign in
                </Link>{" "}
                or{" "}
                <Link
                  href={`/register?redirect=${encodeURIComponent("/checkout")}`}
                  className="link-underline text-ink"
                >
                  create an account
                </Link>{" "}
                to continue to checkout. Your bag is preserved.
              </p>
            </ErrorMessage>
          </div>
        ) : null}

        {!backendReady ? (
          <div className="mt-10">
            <ErrorMessage title="Order placement is not available">
              The order backend is not connected. Add the
              <code className="mx-1 border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px]">
                SUPABASE_SERVICE_ROLE_KEY
              </code>
              to your environment and run the
              <code className="mx-1 border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px]">
                0003_orders_and_admin.sql
              </code>
              migration. See
              <Link href="/docs/ORDERS" className="link-underline text-ink">
                the orders guide
              </Link>{" "}
              for the full setup steps.
            </ErrorMessage>
          </div>
        ) : null}

        {user ? (
          <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_360px]">
            <div className="flex flex-col gap-8">
              <CheckoutForm />
            </div>
            <aside className="flex flex-col gap-6">
              <div className="border border-line bg-paper p-6">
                <h2 className="text-eyebrow uppercase text-ink-muted">
                  Delivery
                </h2>
                <p className="mt-3 text-sm text-ink">
                  Inside Dhaka: <strong>৳70</strong>
                </p>
                <p className="text-sm text-ink">
                  Outside Dhaka: <strong>৳120</strong>
                </p>
                <p className="mt-3 text-xs text-ink-muted">
                  The exact charge is calculated by the order service once
                  you confirm your delivery area. Saved addresses can be
                  managed from your
                  <Link
                    href="/account/addresses"
                    className="link-underline ml-1 text-ink"
                  >
                    account
                  </Link>
                  .
                </p>
              </div>
              <Button href="/cart" variant="secondary" size="md">
                Back to your bag
              </Button>
            </aside>
          </div>
        ) : null}
      </Container>
    </Section>
  );
}
