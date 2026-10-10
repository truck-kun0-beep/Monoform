"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Select, Textarea, useToast } from "@/components/ui";
import {
  updateOrderStatusAction,
  type AdminOrderActionResult,
} from "@/lib/orders";
import type { OrderStatus } from "@/lib/account";

type Props = {
  orderId: string;
  currentStatus: OrderStatus;
};

const STATUSES: ReadonlyArray<OrderStatus> = [
  "pending_confirmation",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const initialState: AdminOrderActionResult = { ok: true };

/**
 * Server-driven status update form. The list of available next
 * statuses is derived from the current state using a small
 * transition graph so the operator never picks a status that the
 * service will reject.
 */
export function AdminOrderStatusForm({ orderId, currentStatus }: Props) {
  const [state, formAction] = useActionState<AdminOrderActionResult, FormData>(
    async (_prev, form) => updateOrderStatusAction(form),
    initialState,
  );
  const { push } = useToast();
  const lastErrorRef = useRef<string | null>(null);
  const lastOkRef = useRef<typeof state | null>(null);
  const [nextStatus, setNextStatus] = useState<OrderStatus>(currentStatus);

  useEffect(() => {
    if (!state.ok && state.error && lastErrorRef.current !== state.error) {
      lastErrorRef.current = state.error;
      push({ title: state.error, tone: "danger" });
    }
    if (state.ok && lastOkRef.current !== state) {
      lastOkRef.current = state;
      push({ title: "Order status updated.", tone: "success" });
    }
  }, [state, push]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3"
      aria-label="Update order status"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <Select
        label="Next status"
        name="nextStatus"
        value={nextStatus}
        onChange={(event) => setNextStatus(event.target.value as OrderStatus)}
        options={STATUSES.map((status) => ({
          value: status,
          label: labelFor(status),
          disabled: status === currentStatus,
        }))}
      />
      <Textarea
        label="Internal note (optional)"
        name="note"
        maxLength={500}
        placeholder="Internal note — not visible to the customer."
        helpText="Recorded in the order status history."
      />
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
      {pending ? "Updating…" : "Update status"}
    </Button>
  );
}

function labelFor(status: OrderStatus): string {
  switch (status) {
    case "pending_confirmation":
      return "Pending confirmation";
    case "confirmed":
      return "Confirmed";
    case "processing":
      return "Processing";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
  }
}
