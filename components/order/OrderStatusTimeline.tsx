import {
  ORDER_STATUS_LABEL,
  ORDER_TIMELINE_STAGES,
  type OrderStatus,
  type OrderTimelineEvent,
} from "@/lib/account";
import { cn } from "@/lib/utils";

type Props = {
  status: OrderStatus;
  timeline: OrderTimelineEvent[];
  className?: string;
};

/**
 * Reusable status timeline. The component is driven by the
 * authoritative `timeline` array returned by the order service —
 * future steps are *not* marked as completed unless a recorded
 * transition exists for them.
 *
 * When the order is cancelled, the happy-path stages are
 * rendered as skipped and the "Cancelled" event takes the
 * foreground so the customer does not mistake a cancelled order
 * for a successful delivery.
 */
export function OrderStatusTimeline({ status, timeline, className }: Props) {
  const eventByStatus = new Map<OrderStatus, OrderTimelineEvent>();
  for (const event of timeline) {
    // Keep the earliest recorded event for each status so the
    // timeline remains stable across re-renders.
    if (!eventByStatus.has(event.status)) {
      eventByStatus.set(event.status, event);
    }
  }

  if (status === "cancelled") {
    return (
      <ol
        className={cn(
          "flex flex-col gap-3 border border-line bg-paper p-6",
          className,
        )}
        aria-label="Order timeline"
      >
        <CancelledTimeline event={eventByStatus.get("cancelled")} />
      </ol>
    );
  }

  return (
    <ol
      className={cn(
        "flex flex-col gap-0 border border-line bg-paper p-6",
        className,
      )}
      aria-label="Order timeline"
    >
      {ORDER_TIMELINE_STAGES.map((stage, index) => {
        const event = eventByStatus.get(stage);
        const isCurrent = stage === status;
        const isCompleted = Boolean(event);
        const isLast = index === ORDER_TIMELINE_STAGES.length - 1;
        return (
          <li key={stage} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                aria-hidden="true"
                className={cn(
                  "mt-1 h-2.5 w-2.5 rounded-full border",
                  isCompleted
                    ? "border-ink bg-ink"
                    : isCurrent
                      ? "border-ink bg-paper"
                      : "border-line bg-paper",
                )}
              />
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-full w-px flex-1",
                    isCompleted ? "bg-ink" : "bg-line",
                  )}
                />
              ) : null}
            </div>
            <div
              className={cn(
                "flex flex-1 flex-col pb-6",
                isLast && "pb-0",
              )}
            >
              <p
                className={cn(
                  "text-sm",
                  isCompleted || isCurrent ? "text-ink" : "text-ink-muted",
                )}
              >
                {ORDER_STATUS_LABEL[stage]}
                {isCurrent ? (
                  <span className="ml-2 text-eyebrow uppercase text-ink-muted">
                    Current
                  </span>
                ) : null}
              </p>
              {event ? (
                <p className="mt-0.5 text-xs text-ink-subtle">
                  {formatTimestamp(event.at)}
                  {event.note ? ` · ${event.note}` : ""}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function CancelledTimeline({
  event,
}: {
  event: OrderTimelineEvent | undefined;
}) {
  return (
    <li className="flex gap-4">
      <div className="flex flex-col items-center">
        <span
          aria-hidden="true"
          className="mt-1 h-2.5 w-2.5 rounded-full border border-danger bg-danger"
        />
      </div>
      <div className="flex flex-1 flex-col">
        <p className="text-sm text-ink">
          {ORDER_STATUS_LABEL.cancelled}
          <span className="ml-2 text-eyebrow uppercase text-ink-muted">
            Current
          </span>
        </p>
        {event ? (
          <p className="mt-0.5 text-xs text-ink-subtle">
            {formatTimestamp(event.at)}
            {event.note ? ` · ${event.note}` : ""}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-ink-subtle">
            The order-management service recorded the cancellation.
          </p>
        )}
      </div>
    </li>
  );
}

function formatTimestamp(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
