"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AuthMessage,
  AuthNotConfiguredNotice,
  PasswordField,
  SubmitButton,
  TextField,
} from "@/components/auth";
import {
  isSupabaseConfigured,
  PASSWORD_MIN_LENGTH,
  registerAction,
  type AuthActionResult,
} from "@/lib/auth/react";

type Props = {
  redirectTo: string;
};

const initialState: AuthActionResult = { ok: true };

/**
 * Registration form. Submits to the server action. When the
 * provider returns a session the user is signed in immediately
 * (verification disabled); otherwise we display a verification
 * pending message and don't auto-redirect.
 */
export function RegisterForm({ redirectTo }: Props) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (
      _prev: AuthActionResult,
      form: FormData,
    ): Promise<AuthActionResult> => {
      return registerAction(form);
    },
    initialState,
  );

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  // Track when we have shown the verification-pending state so the
  // form can be replaced with a static "check your inbox" message.
  const showVerificationPending = state.ok && !state.redirectTo;

  const fieldErrors = !state.ok ? state.fieldErrors ?? {} : {};
  const configured = isSupabaseConfigured();

  if (showVerificationPending) {
    return (
      <AuthMessage
        tone="success"
        title="Check your email"
      >
        <p>
          We sent a verification link to the address you provided. Click the
          link to confirm your account, then sign in to start shopping.
        </p>
        <p className="mt-3">
          <Link href="/login" className="link-underline text-ink">
            Back to sign in
          </Link>
        </p>
      </AuthMessage>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5"
      aria-label="Create account form"
    >
      <input type="hidden" name="redirect" value={redirectTo} />
      {!configured ? <AuthNotConfiguredNotice /> : null}
      {state.ok === false ? (
        <AuthMessage tone="error" title="Could not create account">
          {state.error}
        </AuthMessage>
      ) : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField
          label="First name"
          name="firstName"
          autoComplete="given-name"
          required
          maxLength={80}
          disabled={!configured}
          error={fieldErrors.firstName}
        />
        <TextField
          label="Last name"
          name="lastName"
          autoComplete="family-name"
          required
          maxLength={80}
          disabled={!configured}
          error={fieldErrors.lastName}
        />
      </div>
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
      <PasswordField
        label="Password"
        name="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        helpText={`At least ${PASSWORD_MIN_LENGTH} characters with at least one number.`}
        disabled={!configured}
        error={fieldErrors.password}
      />
      <PasswordField
        label="Confirm password"
        name="confirmPassword"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        disabled={!configured}
        error={fieldErrors.confirmPassword}
      />

      <TermsCheckbox disabled={!configured} error={fieldErrors.terms} />

      <SubmitButton label="Create Account" pendingLabel="Creating account…" />
    </form>
  );
}

function TermsCheckbox({
  disabled,
  error,
}: {
  disabled: boolean;
  error?: string;
}) {
  const [checked, setChecked] = useState(false);
  return (
    <div>
      <label className="flex items-start gap-3 text-sm text-ink-muted">
        <input
          type="checkbox"
          name="terms"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "terms-error" : undefined}
          className="mt-1 h-4 w-4 border-line text-ink focus:ring-ink"
          required
        />
        <span>
          I agree to the{" "}
          <Link href="/terms" className="link-underline text-ink">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="link-underline text-ink">
            privacy policy
          </Link>
          .
        </span>
      </label>
      {error ? (
        <p id="terms-error" className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
