"use client";

import { useActionState } from "react";
import {
  AuthMessage,
  AuthNotConfiguredNotice,
  SubmitButton,
  TextField,
} from "@/components/auth";
import {
  forgotPasswordAction,
  initialAuthActionResult,
  isSupabaseConfigured,
  type AuthActionResult,
} from "@/lib/auth/react";

/**
 * Forgot password form. The neutral "check your email" message is
 * only shown when the action actually accepted the reset request
 * (`status: "request_submitted"`) — not before. We never reveal
 * whether the email has an account, so the copy is intentionally
 * generic.
 */
export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(
    async (
      _prev: AuthActionResult,
      form: FormData,
    ): Promise<AuthActionResult> => {
      return forgotPasswordAction(form);
    },
    initialAuthActionResult,
  );

  const fieldErrors = !state.ok ? state.fieldErrors ?? {} : {};
  const configured = isSupabaseConfigured();

  if (state.ok && state.status === "request_submitted") {
    return (
      <AuthMessage tone="info" title="Check your email">
        <p>
          If an account exists for the address you entered, we have sent a
          password reset link. The link expires after a short time for your
          security.
        </p>
        <p className="mt-3 text-xs text-ink-subtle">
          Don't see the email? Check your spam folder, or wait a minute before
          requesting another link.
        </p>
      </AuthMessage>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5"
      aria-label="Forgot password form"
    >
      {!configured ? <AuthNotConfiguredNotice /> : null}
      {state.ok === false && state.error ? (
        <AuthMessage tone="error" title="Something went wrong">
          {state.error}
        </AuthMessage>
      ) : null}

      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="[email protected]"
        disabled={!configured}
        error={fieldErrors.email}
      />

      <SubmitButton
        label="Send Reset Link"
        pendingLabel="Sending…"
      />
    </form>
  );
}
