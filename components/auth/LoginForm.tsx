"use client";

import { useActionState, useEffect } from "react";
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
  initialAuthActionResult,
  isSupabaseConfigured,
  signInAction,
  type AuthActionResult,
} from "@/lib/auth/react";

type Props = {
  /** Validated redirect target — defaults to `/account`. */
  redirectTo: string;
};

/**
 * Login form. Submits to the server action and renders any
 * validation / provider errors inline. On success, the router
 * navigates to the validated `redirectTo`.
 *
 * The initial state is the shared `{ ok: false, error: "" }`
 * sentinel so the success branch only fires on a real action
 * return.
 */
export function LoginForm({ redirectTo }: Props) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (
      _prev: AuthActionResult,
      form: FormData,
    ): Promise<AuthActionResult> => {
      return signInAction(form);
    },
    initialAuthActionResult,
  );

  useEffect(() => {
    if (state.ok && state.status === "signed_in" && state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  const fieldErrors = !state.ok ? state.fieldErrors ?? {} : {};
  const configured = isSupabaseConfigured();

  return (
    <form action={formAction} className="flex flex-col gap-5" aria-label="Sign in form">
      <input type="hidden" name="redirect" value={redirectTo} />

      {!configured ? <AuthNotConfiguredNotice /> : null}

      {state.ok === false && state.error ? (
        <AuthMessage tone="error" title="Sign in failed">
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

      <PasswordField
        label="Password"
        name="password"
        autoComplete="current-password"
        required
        disabled={!configured}
        error={fieldErrors.password}
      />

      <div className="flex items-center justify-between text-sm">
        <Link
          href="/forgot-password"
          className="link-underline text-eyebrow uppercase text-ink-muted"
        >
          Forgot password
        </Link>
      </div>

      <SubmitButton label="Sign in" pendingLabel="Signing in…" />
    </form>
  );
}
