"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui";
import { useToast } from "@/components/ui";
import {
  updateProfileAction,
  type AccountActionResult,
} from "@/lib/account";

type Props = {
  initialFullName: string;
  initialPhone: string;
  email: string;
  /** Render the email row as read-only. */
  readOnlyEmail?: boolean;
};

const initialState: AccountActionResult = { ok: true };

/**
 * Editable profile form.
 *
 * - Full name comes from the `customer_profiles.full_name` column
 *   (or the auth metadata when the row is empty).
 * - Phone is normalised on the server to the local 01XXXXXXXXX
 *   representation.
 * - Email is read-only. Email changes must go through Supabase's
 *   own verification flow, which is a separate concern.
 */
export function ProfileForm({
  initialFullName,
  initialPhone,
  email,
  readOnlyEmail = true,
}: Props) {
  const [state, formAction] = useActionState<AccountActionResult, FormData>(
    async (_prev, form) => updateProfileAction(form),
    initialState,
  );
  const { push } = useToast();
  const lastOkRef = useRef<typeof state | null>(null);

  useEffect(() => {
    if (state.ok && state.message && lastOkRef.current !== state) {
      lastOkRef.current = state;
      push({ title: state.message, tone: "success" });
    }
  }, [state, push]);

  const fieldErrors = !state.ok ? state.fieldErrors ?? {} : {};
  const reactId = useId();
  const field = (name: string) => `${name}-${reactId}`;

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5"
      aria-label="Profile form"
    >
      {state.ok === false ? (
        <div
          role="alert"
          className="border border-danger/40 bg-paper px-4 py-3 text-sm text-ink"
        >
          <p className="text-eyebrow uppercase text-danger">
            Could not save profile
          </p>
          <p className="mt-1 text-ink-muted">{state.error}</p>
        </div>
      ) : null}

      <Input
        id={field("fullName")}
        name="fullName"
        label="Full name"
        autoComplete="name"
        required
        maxLength={80}
        defaultValue={initialFullName}
        error={fieldErrors.fullName}
      />

      <Input
        id={field("email")}
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        defaultValue={email}
        readOnly={readOnlyEmail}
        disabled={readOnlyEmail}
        helpText={
          readOnlyEmail
            ? "Email is managed by your sign-in provider. Contact support to change it."
            : undefined
        }
      />

      <Input
        id={field("phone")}
        name="phone"
        type="tel"
        label="Phone"
        autoComplete="tel"
        inputMode="tel"
        defaultValue={initialPhone}
        placeholder="01XXXXXXXXX"
        helpText="Optional. Used by the courier to coordinate delivery."
        error={fieldErrors.phone}
      />

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Saving…" label="Save Changes" />
        <button
          type="reset"
          className="text-eyebrow uppercase text-ink-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Reset
        </button>
      </div>
    </form>
  );
}

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="inline-flex h-11 items-center justify-center gap-2 border border-ink bg-ink px-6 text-eyebrow uppercase text-paper transition-colors hover:bg-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
