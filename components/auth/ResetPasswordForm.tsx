"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AuthMessage,
  AuthNotConfiguredNotice,
  PasswordField,
  SubmitButton,
} from "@/components/auth";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
  PASSWORD_MIN_LENGTH,
  resetPasswordAction,
  type AuthActionResult,
} from "@/lib/auth/react";

const initialState: AuthActionResult = { ok: true };

/**
 * Reset password form.
 *
 * The form is only enabled once a Supabase recovery session is
 * detected. The session is established automatically when the user
 * clicks the recovery link in their email — Supabase writes the
 * tokens and the SDK picks them up on the next page load.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (
      _prev: AuthActionResult,
      form: FormData,
    ): Promise<AuthActionResult> => {
      return resetPasswordAction(form);
    },
    initialState,
  );

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  const fieldErrors = !state.ok ? state.fieldErrors ?? {} : {};
  const configured = isSupabaseConfigured();

  const [sessionReady, setSessionReady] = useState<boolean | null>(null);

  useEffect(() => {
    if (!configured) {
      setSessionReady(false);
      return;
    }
    const client = getSupabaseBrowserClient();
    if (!client) {
      setSessionReady(false);
      return;
    }
    let cancelled = false;
    const check = async () => {
      const { data } = await client.auth.getSession();
      if (cancelled) return;
      setSessionReady(Boolean(data.session));
    };
    check();
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setSessionReady(Boolean(session));
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [configured]);

  if (!configured) {
    return <AuthNotConfiguredNotice />;
  }

  if (sessionReady === false) {
    return (
      <AuthMessage tone="error" title="Recovery link required">
        <p>
          This page can only be used from a password reset link. The link is
          either expired or has already been used.
        </p>
        <p className="mt-3">
          <a href="/forgot-password" className="link-underline text-ink">
            Request a new reset link
          </a>
        </p>
      </AuthMessage>
    );
  }

  if (sessionReady === null) {
    return (
      <AuthMessage tone="info" title="Verifying reset link">
        <p>One moment — checking your recovery session…</p>
      </AuthMessage>
    );
  }

  if (state.ok) {
    return (
      <AuthMessage tone="success" title="Password updated">
        <p>
          Your password has been updated. You can now sign in with your new
          password.
        </p>
        <p className="mt-3 text-xs text-ink-subtle">
          Redirecting to sign in…
        </p>
      </AuthMessage>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5"
      aria-label="Reset password form"
    >
      <AuthMessage tone="error" title="Could not update password">
        {state.error}
      </AuthMessage>

      <PasswordField
        label="New password"
        name="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        helpText={`At least ${PASSWORD_MIN_LENGTH} characters with at least one number.`}
        error={fieldErrors.password}
      />
      <PasswordField
        label="Confirm new password"
        name="confirmPassword"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        error={fieldErrors.confirmPassword}
      />

      <SubmitButton label="Update Password" pendingLabel="Updating…" />
    </form>
  );
}
