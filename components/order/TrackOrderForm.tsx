"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Input, Spinner, useToast } from "@/components/ui";
import {
  trackOrderAction,
  type TrackOrderActionResult,
} from "@/lib/account";

type Props = {
  /** When `true`, a previous successful result is shown above the form. */
  defaultNumber?: string;
};

const initialState: TrackOrderActionResult = {
  ok: false,
  error: "",
};

/**
 * Public tracking form. Posts to the `trackOrderAction` server
 * action. Validation errors are rendered inline. The form is
 * fully keyboard-friendly and the submit button is disabled while
 * the request is in flight.
 */
export function TrackOrderForm({ defaultNumber }: Props) {
  const [state, formAction] = useActionState<TrackOrderActionResult, FormData>(
    async (_prev, form) => trackOrderAction(form),
    initialState,
  );
  const { push } = useToast();
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      !state.ok &&
      state.error &&
      lastErrorRef.current !== state.error
    ) {
      lastErrorRef.current = state.error;
      push({ title: state.error, tone: "danger" });
    }
  }, [state, push]);

  const fieldErrors =
    !state.ok && state.fieldErrors ? state.fieldErrors : {};

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5"
      aria-label="Track order form"
    >
      <Input
        label="Order number"
        name="number"
        autoComplete="off"
        required
        defaultValue={defaultNumber}
        placeholder="e.g. MF-100245"
        helpText="The number is on your order confirmation."
        error={fieldErrors.number}
      />
      <Input
        label="Phone used for this order"
        name="phone"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        required
        placeholder="01XXXXXXXXX"
        helpText="We use the phone you provided at checkout to verify the lookup."
        error={fieldErrors.phone}
      />
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  // `useFormStatus` must be used inside a `<form>` element. The
  // `pending` flag drives the disabled state and the inline
  // spinner so customers cannot fire a second request before the
  // first returns.
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="inline-flex h-12 items-center justify-center gap-2 border border-ink bg-ink px-6 text-eyebrow uppercase tracking-[0.2em] text-paper transition-colors hover:bg-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <Spinner size="sm" label="Tracking…" />
          <span>Tracking…</span>
        </>
      ) : (
        <span>Track Order</span>
      )}
    </button>
  );
}
