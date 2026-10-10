import type { OrderCourierTracking } from "@/lib/account";

type Props = {
  courier: OrderCourierTracking | null;
  className?: string;
};

/**
 * Courier / fulfilment card. Only rendered when the order has an
 * authoritative courier entry. The component never invents a
 * courier, tracking number, or tracking link — those values must
 * come from the order service.
 */
export function OrderCourierCard({ courier, className }: Props) {
  if (!courier) {
    return (
      <section className={className} aria-label="Delivery">
        <div className="border border-line bg-paper p-6">
          <h2 className="text-eyebrow uppercase text-ink-muted">Delivery</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Tracking details will appear here once your order is dispatched
            and a courier is assigned.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={className} aria-label="Delivery">
      <div className="border border-line bg-paper p-6">
        <h2 className="text-eyebrow uppercase text-ink-muted">Delivery</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Field label="Courier" value={courier.courier} />
          <Field
            label="Tracking number"
            value={
              courier.trackingUrl ? (
                <a
                  href={courier.trackingUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="link-underline text-ink"
                >
                  {courier.trackingNumber}
                </a>
              ) : (
                <span className="text-ink">{courier.trackingNumber}</span>
              )
            }
          />
          <Field
            label="Dispatched"
            value={formatDate(courier.dispatchedAt)}
          />
          <Field
            label="Estimated delivery"
            value={formatDate(courier.estimatedDeliveryAt)}
            placeholder="Not available yet"
          />
        </dl>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  placeholder,
}: {
  label: string;
  value: React.ReactNode;
  placeholder?: string;
}) {
  return (
    <div>
      <dt className="text-eyebrow uppercase text-ink-subtle">{label}</dt>
      <dd className="mt-1 text-sm">
        {value && value !== "" ? value : (
          <span className="text-ink-muted">{placeholder ?? "—"}</span>
        )}
      </dd>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
