"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Select, Textarea, useToast } from "@/components/ui";
import {
  updatePaymentStatusAction,
  type AdminOrderActionResult,
} from "@/lib/orders";
import type { OrderPaymentMethod, OrderPaymentStatus } from "@/lib/account";

type Props = {
  orderId: string;
  currentStatus: OrderPaymentStatus;
  paymentMethod: OrderPaymentMethod;
};

const initialState: AdminOrderActionResult = { ok: true };

/**
 * Authorised payment-status update. The available options are
 * pruned by the current payment method so, for example, a COD
 * order never shows "Awaiting verification".
 */
export function AdminPaymentStatusForm({
  orderId,
  currentStatus,
  paymentMethod,
}: Props) {
  const [state, formAction] = useActionState<AdminOrderActionResult, FormData>(
    async (_prev, form) => updatePaymentStatusAction(form),
    initialState,
  );
  const { push } = useToast();
  const lastErrorRef = useRef<string | null>(null);
  const lastOkRef = useRef<typeof state | null>(null);
  const options = paymentOptionsFor(paymentMethod);
  const [nextStatus, setNextStatus] = useState<OrderPaymentStatus>(
    options[0] ?? currentStatus,
  );

  useEffect(() => {
    if (!state.ok && state.error && lastErrorRef.current !== state.error) {
      lastErrorRef.current = state.error;
      push({ title: state.error, tone: "danger" });
    }
    if (state.ok && lastOkRef.current !== state) {
      lastOkRef.current = state;
      push({ title: "Payment status updated.", tone: "success" });
    }
  }, [state, push]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3"
      aria-label="Update payment status"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <Select
        label="Payment status"
        name="nextStatus"
        value={nextStatus}
        onChange={(event) =>
          setNextStatus(event.target.value as OrderPaymentStatus)
        }
        options={options.map((status) => ({
          value: status,
          label: labelFor(status),
          disabled: status === currentStatus,
        }))}
      />
      <Textarea
        label="Internal note (optional)"
        name="note"
        maxLength={500}
        placeholder="Reference checked, payment confirmed by bank statement."
      />
      <SubmitButton />
    </form>
  );
}

function paymentOptionsFor(
  method: OrderPaymentMethod,
): ReadonlyArray<OrderPaymentStatus> {
  if (method === "cod") {
    return ["pending", "paid", "failed", "refunded"];
  }
  return ["awaiting_verification", "paid", "failed", "refunded"];
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending} aria-busy={pending || undefined}>
      {pending ? "Updating…" : "Update payment status"}
    </Button>
  );
}

function labelFor(status: OrderPaymentStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "awaiting_verification":
      return "Awaiting verification";
    case "paid":
      return "Paid";
    case "failed":
      return "Failed";
    case "refunded":
      return "Refunded";
  }
}
