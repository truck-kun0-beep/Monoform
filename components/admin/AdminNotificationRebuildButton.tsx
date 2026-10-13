"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, useToast } from "@/components/ui";
import { rebuildNotificationAction } from "@/lib/orders/actions";

type Props = {
  orderId: string;
  /**
   * The operator-facing reason the previous attempt produced no
   * row. When provided, the toast text and the button label use it
   * to set the operator's expectation (e.g. they will see a row
   * in `pending` with a "Recipient not configured" error until
   * the env var is set and they click Rebuild again).
   */
  hint?: string;
};

/**
 * Protected "Rebuild notification" action. Used by the admin
 * order detail page when an order committed without an outbox row
 * (for example because the deployment was missing
 * `STORE_ORDER_NOTIFICATION_EMAIL` when the order was placed).
 *
 * Wraps the `rebuildNotificationAction` server action in a
 * transition so the button can show a pending state and the admin
 * dashboard can be refreshed after the request completes.
 */
export function AdminNotificationRebuildButton({ orderId, hint }: Props) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() => {
        const form = new FormData();
        form.set("orderId", orderId);
        startTransition(async () => {
          const result = await rebuildNotificationAction(form);
          if (result.ok) {
            push({
              title: hint
                ? "Notification rebuilt. Review the new state below."
                : "Notification rebuilt.",
              tone: "success",
            });
            router.refresh();
          } else {
            push({ title: result.error, tone: "danger" });
          }
        });
      }}
    >
      {pending ? "Rebuilding…" : "Rebuild notification"}
    </Button>
  );
}
