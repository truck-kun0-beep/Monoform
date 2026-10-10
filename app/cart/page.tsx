import { CartPageClient } from "@/components/cart";

export const metadata = {
  title: "Your Bag",
  description:
    "Review the items in your bag, adjust quantities and continue to checkout. Delivery charges are calculated at checkout based on your delivery area.",
};

/**
 * /cart — the full shopping bag.
 *
 * The metadata lives in this server component so the page can declare
 * its own title and description. The actual UI is rendered by
 * `CartPageClient`, a client component that subscribes to the shared
 * cart store and renders the empty state, item list, order summary
 * and recommendations.
 */
export default function CartPage() {
  return <CartPageClient />;
}
