import { Container, ErrorMessage, PageHeader, Section } from "@/components/ui";
import { TrackOrderForm } from "@/components/order";
import { isSupabaseConfigured } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Track Order",
  description: "Track the status of an order you placed with MONOFORM.",
};

type SearchParams = Promise<{ number?: string | string[] }>;

/**
 * `/track-order` — public order tracking lookup.
 *
 * The page renders the form by default. When the URL contains a
 * `?number=…` query string, the field is pre-filled so the
 * customer only has to type the phone. The lookup is only
 * performed through the `trackOrderAction` server action, never
 * from the URL alone — the phone is always part of the
 * verification pair.
 *
 * Anonymous visitors can use this page. When the visitor is
 * signed in we also offer a quick "view in your account" path
 * so they don't have to re-enter the order number.
 */
export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const rawNumber = pickFirst(params.number)?.trim();
  const configured = isSupabaseConfigured();
  const user = await getCurrentUser();

  return (
    <Section spacing="lg" tone="paper">
      <Container className="max-w-2xl">
        <PageHeader
          eyebrow="Support"
          title="Track an order"
          description="Enter your order number and the contact phone used at checkout. We will only return results that match both values."
        />

        {!configured ? (
          <div className="mt-10">
            <ErrorMessage title="Tracking isn't available yet">
              <p>
                Order tracking is part of the order service that is being
                prepared. Once the order backend is in place this page will
                accept order numbers and the matching contact phone to return
                a current status. Until then, no lookups are performed.
              </p>
            </ErrorMessage>
          </div>
        ) : null}

        <div className="mt-10 border border-line bg-paper p-6">
          <TrackOrderForm defaultNumber={rawNumber} />
          <p className="mt-4 text-xs text-ink-muted">
            For your security, the public tracking endpoint does not return
            order details when the order number and phone do not match the
            same order. We also throttle repeated lookups to prevent abuse.
          </p>
        </div>

        {user ? (
          <p className="mt-8 text-sm text-ink-muted">
            Already have an account?{" "}
            <a href="/account/orders" className="link-underline text-ink">
              View your order history
            </a>{" "}
            for the full details of every order you've placed.
          </p>
        ) : (
          <p className="mt-8 text-sm text-ink-muted">
            Looking for an order in your account?{" "}
            <a
              href={`/login?redirect=${encodeURIComponent("/account/orders")}`}
              className="link-underline text-ink"
            >
              Sign in to view your order history
            </a>
            .
          </p>
        )}
      </Container>
    </Section>
  );
}

function pickFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
