import Link from "next/link";
import { HelpArticle } from "@/components/layout";
import { shippingPage } from "@/config/content";
import { ORDER_CURRENCY } from "@/lib/orders/config";

export const metadata = {
  title: "Shipping",
  description: "Delivery zones, fees and timing for MONOFORM orders.",
};

const crumbs = [
  { label: "Home", href: "/" },
  { label: "Help", href: "/help" },
  { label: "Shipping" },
];

/**
 * `/help/shipping` — public shipping information.
 *
 * The delivery-fee table is rendered from the centralised
 * `shippingPage.zones` list, which itself is generated from
 * `lib/orders/config.ts` so this page can never drift from the
 * authoritative checkout calculation.
 *
 * No delivery timeframes, courier partnerships, free-shipping
 * thresholds or same-day services are advertised — the prompt
 * does not supply verified policies for them and the store
 * owner must set them in `config/content.ts` before they can be
 * displayed.
 */
export default function ShippingPage() {
  return (
    <HelpArticle
      eyebrow="Help · Shipping"
      title="Shipping"
      description={shippingPage.summary}
      crumbs={crumbs}
    >
      <h2 className="text-display-sm text-ink">Delivery fees</h2>
      <p className="mt-3">
        The delivery fee is calculated from the destination zone you select
        at checkout and is shown before you place the order. The table below
        reflects the current configured rates.
      </p>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full border border-line text-left text-sm">
          <thead>
            <tr className="bg-paper-warm text-eyebrow uppercase text-ink-muted">
              <th scope="col" className="px-4 py-3 font-normal">
                Destination zone
              </th>
              <th scope="col" className="px-4 py-3 font-normal">
                Delivery fee
              </th>
            </tr>
          </thead>
          <tbody>
            {shippingPage.zones.map((zone) => (
              <tr key={zone.zone} className="border-t border-line">
                <th scope="row" className="px-4 py-3 text-left font-medium text-ink">
                  {zone.label}
                </th>
                <td className="px-4 py-3 text-ink">
                  {zone.fee} {ORDER_CURRENCY}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-ink-muted">
        The currency is {ORDER_CURRENCY}. Charges are calculated in the same
        currency as the order.
      </p>

      <div className="mt-12 space-y-8">
        {shippingPage.notes.map((note) => (
          <section key={note.title}>
            <h2 className="text-display-sm text-ink">{note.title}</h2>
            <p className="mt-3">{note.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-12 border-t border-line pt-8">
        <h2 className="text-display-sm text-ink">Need help with a delivery?</h2>
        <p className="mt-3">
          For delivery questions please{" "}
          <Link href="/contact" className="link-underline text-ink">
            contact our support team
          </Link>{" "}
          or, if you have an order, use the{" "}
          <Link href="/track-order" className="link-underline text-ink">
            track order
          </Link>{" "}
          page.
        </p>
      </div>
    </HelpArticle>
  );
}
