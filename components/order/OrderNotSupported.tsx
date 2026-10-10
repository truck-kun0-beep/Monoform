import Link from "next/link";
import { ErrorMessage } from "@/components/ui";

type Props = {
  /**
   * Optional title override. Defaults to a message tailored to
   * the order service being unavailable.
   */
  title?: string;
  /**
   * Optional body copy. When omitted, a generic explanation is
   * rendered. Pages can pass a more specific explanation (e.g.
   * "We couldn't find this order").
   */
  body?: React.ReactNode;
  /** Display the "back" link. */
  showBackLink?: boolean;
  /** Where the back link points. */
  backHref?: string;
  className?: string;
};

/**
 * Honest "order service is being prepared" placeholder. Renders
 * an `ErrorMessage` with consistent copy and a back link to
 * keep the customer oriented. Pages use this for any
 * `not_supported` state coming out of the order service.
 */
export function OrderNotSupported({
  title = "Order details aren't available yet",
  body,
  showBackLink = true,
  backHref = "/account/orders",
  className,
}: Props) {
  return (
    <div className={className}>
      <ErrorMessage title={title}>
        {body ?? (
          <>
            <p>
              The order service is being prepared. Real orders, status
              updates and tracking information will appear here as soon as
              the order backend is in place.
            </p>
            <p className="mt-3">
              Until then, no order data is loaded — this page intentionally
              shows an empty state rather than fabricated information.
            </p>
          </>
        )}
      </ErrorMessage>
      {showBackLink ? (
        <p className="mt-6 text-sm text-ink-muted">
          <Link
            href={backHref}
            className="link-underline text-ink"
          >
            ← Back to orders
          </Link>
        </p>
      ) : null}
    </div>
  );
}
