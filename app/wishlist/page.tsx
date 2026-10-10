import { Container, EmptyState, PageHeader, Section } from "@/components/ui";
import { ProductGrid as Grid } from "@/components/product";
import { messages } from "@/config/messages";
import { listNewArrivals } from "@/lib/products";

export const metadata = {
  title: "Wishlist",
  description: "Saved products.",
};

export default function WishlistPage() {
  // Empty by default — once a wishlist store is introduced this page
  // will list the saved products. The new arrivals are shown as a
  // discovery fallback.
  const discovery = listNewArrivals(4);

  return (
    <Section spacing="lg" tone="paper">
      <Container>
        <PageHeader
          eyebrow="Saved"
          title="Wishlist"
          description="Pieces you have saved to revisit."
        />
        <div className="mt-12">
          <EmptyState
            title={messages.emptyWishlist.title}
            body={messages.emptyWishlist.body}
            action={messages.emptyWishlist.action}
          />
        </div>
        <div className="mt-16 border-t border-line pt-12">
          <h2 className="text-display-md text-ink">You might like</h2>
          <div className="mt-8">
            <Grid products={discovery} columns={4} />
          </div>
        </div>
      </Container>
    </Section>
  );
}
