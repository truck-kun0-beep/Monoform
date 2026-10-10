import { Button, Container, PageHeader, Section } from "@/components/ui";
import {
  OrderDetailView,
  OrderNotSupported,
} from "@/components/order";
import { getOrderConfirmation } from "@/lib/account/orders";
import { isSupabaseConfigured } from "@/lib/auth";

export const metadata = {
  title: "Order Confirmation",
  description: "Thank you for your order.",
};

type Params = Promise<{ id: string }>;

/**
 * `/order-confirmation/[id]` — confirmation of a successfully
 * created order.
 *
 * The success state is only displayed after the order service
 * confirms the order was genuinely created. The page derives
 * the customer identity from the validated Supabase session and
 * never trusts the URL `id` alone: the order service refuses to
 * return another customer's order, so a forged id surfaces a
 * "not found" / "not supported" state rather than leaked data.
 *
 * The page is also accessible to anonymous visitors; in that case
 * the lookup is allowed to fall back to a "not found" / "not
 * supported" state. Anonymous visitors who just placed an order
 * are signed in by the order service in a future prompt, at which
 * point the confirmation id will be tied to the session.
 */
export default async function OrderConfirmationPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const configured = isSupabaseConfigured();
  const result = await getOrderConfirmation(id);

  if (result.kind === "ok") {
    return (
      <ConfirmationLayout>
        <PageHeader
          eyebrow="Thank you for your order"
          title={`Order #${result.order.number}`}
          description="Your order details are below. Keep your order number for future reference."
        />
        <div className="mt-10">
          <OrderDetailView
            order={result.order}
            showCustomerIdentity
            backHref="/account/orders"
          />
        </div>
        <ConfirmationActions />
      </ConfirmationLayout>
    );
  }

  if (result.kind === "not_configured" || !configured) {
    return (
      <ConfirmationLayout>
        <PageHeader
          eyebrow="Thank you for your order"
          title="We can't display your order yet"
          description="The order service is not connected to a Supabase project. Add your credentials to .env.local and run the migrations in /supabase to view your order here."
        />
        <div className="mt-10">
          <OrderNotSupported
            title="Order details aren't available yet"
            body={
              <>
                <p>
                  We received your order number but cannot load the order
                  details because the order service is not yet connected to a
                  real backend.
                </p>
                <p className="mt-3">
                  Once the order backend is in place, the confirmation page
                  will show your items, address, payment summary and tracking
                  timeline. For now, no data is loaded.
                </p>
              </>
            }
            showBackLink={false}
          />
        </div>
        <ConfirmationActions />
      </ConfirmationLayout>
    );
  }

  if (result.kind === "not_found") {
    return (
      <ConfirmationLayout>
        <PageHeader
          eyebrow="Order confirmation"
          title="We couldn't find that order"
          description="Either the order id is incorrect, the order belongs to a different account, or the order service is not yet ready."
        />
        <div className="mt-10">
          <OrderNotSupported
            title="Order not found"
            body={
              <>
                <p>
                  We could not find an order with that id belonging to your
                  account. If you placed the order as a guest, sign in to
                  view it from your order history.
                </p>
              </>
            }
            showBackLink={false}
          />
        </div>
        <ConfirmationActions />
      </ConfirmationLayout>
    );
  }

  if (result.kind === "not_supported") {
    return (
      <ConfirmationLayout>
        <PageHeader
          eyebrow="Thank you for your order"
          title="Order details aren't available yet"
          description="Your order details are below once the order service is connected. Keep your order number for future reference."
        />
        <div className="mt-10">
          <OrderNotSupported showBackLink={false} />
        </div>
        <ConfirmationActions />
      </ConfirmationLayout>
    );
  }

  return (
    <ConfirmationLayout>
      <PageHeader
        eyebrow="Order confirmation"
        title="Something went wrong"
        description="We couldn't load your order. Please try again, or visit your account for the full list."
      />
      <div className="mt-10">
        <OrderNotSupported
          title="Could not load this order"
          body={<p>{result.message}</p>}
          showBackLink={false}
        />
      </div>
      <ConfirmationActions />
    </ConfirmationLayout>
  );
}

function ConfirmationLayout({ children }: { children: React.ReactNode }) {
  return (
    <Section spacing="lg" tone="paper">
      <Container className="max-w-3xl">{children}</Container>
    </Section>
  );
}

function ConfirmationActions() {
  return (
    <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6">
      <Button href="/account/orders" variant="secondary">
        View My Orders
      </Button>
      <Button href="/account/orders" variant="secondary">
        View Order Details
      </Button>
      <Button href="/track-order" variant="secondary">
        Track Order
      </Button>
      <Button href="/new-arrivals">Continue Shopping</Button>
    </div>
  );
}
