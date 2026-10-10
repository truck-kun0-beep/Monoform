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
  isSupabaseConfigured,
  type AuthActionResult,
} from "@/lib/auth/react";

const initialState: AuthActionResult = { ok: true };

/**
 * Forgot password form. On success, displays a neutral message
 * that does not reveal whether the email is registered — the
 * provider always returns success in the happy path.
 */
export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(
    async (
      _prev: AuthActionResult,
      form: FormData,
    ): Promise<AuthActionResult> => {
      return forgotPasswordAction(form);
    },
    initialState,
  );

  const fieldErrors = !state.ok ? state.fieldErrors ?? {} : {};
  const configured = isSupabaseConfigured();

  if (state.ok) {
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
      <AuthMessage tone="error" title="Something went wrong">
        {state.error}
      </AuthMessage>

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
