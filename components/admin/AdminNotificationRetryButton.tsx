"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, useToast } from "@/components/ui";
import { retryNotificationAction } from "@/lib/orders/actions";

type Props = {
  notificationId: string;
  orderId: string;
};

/**
 * Protected "Retry notification" action. Wraps the
 * `retryNotificationAction` server action in a transition so the
 * button can show a pending state and the admin dashboard can be
 * refreshed after the request completes.
 */
export function AdminNotificationRetryButton({
  notificationId,
  orderId,
}: Props) {
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
        form.set("notificationId", notificationId);
        form.set("orderId", orderId);
        startTransition(async () => {
          const result = await retryNotificationAction(form);
          if (result.ok) {
            push({ title: "Notification retry queued.", tone: "success" });
            router.refresh();
          } else {
            push({ title: result.error, tone: "danger" });
          }
        });
      }}
    >
      {pending ? "Retrying…" : "Retry notification"}
    </Button>
  );
}
