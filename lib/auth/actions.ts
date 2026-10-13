"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient, getSiteUrl } from "./index";
import {
  sanitiseAuthError,
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordMatch,
} from "./validation";
import type { AuthActionResult } from "./types";

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function isSafeInternalPath(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  if (value.startsWith("/\\")) return false;
  if (value.length > 512) return false;
  return true;
}

function resolveRedirect(value: string | undefined): string {
  return isSafeInternalPath(value) ? value : "/account";
}

function formString(form: FormData, key: string): string {
  const raw = form.get(key);
  return typeof raw === "string" ? raw : "";
}

async function getClient() {
  return createSupabaseServerClient();
}

const NOT_CONFIGURED_MESSAGE =
  "Authentication is not configured. Add Supabase credentials to your environment.";

/* ------------------------------------------------------------------ *
 * Sign in
 * ------------------------------------------------------------------ */

export async function signInAction(form: FormData): Promise<AuthActionResult> {
  const email = formString(form, "email");
  const password = formString(form, "password");
  const redirectTo = resolveRedirect(formString(form, "redirect") || undefined);

  const fieldErrors: Record<string, string> = {};
  const emailError = validateEmail(email);
  if (emailError) fieldErrors.email = emailError;
  if (!password) fieldErrors.password = "Enter your password.";
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const client = await getClient();
  if (!client) {
    return { ok: false, error: NOT_CONFIGURED_MESSAGE };
  }

  const { error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    return { ok: false, error: sanitiseAuthError(error.message), fieldErrors: {} };
  }

  return { ok: true, status: "signed_in", redirectTo };
}

/* ------------------------------------------------------------------ *
 * Register
 * ------------------------------------------------------------------ */

export async function registerAction(form: FormData): Promise<AuthActionResult> {
  const firstName = formString(form, "firstName");
  const lastName = formString(form, "lastName");
  const email = formString(form, "email");
  const password = formString(form, "password");
  const confirmPassword = formString(form, "confirmPassword");
  const terms = form.get("terms") === "on";
  const redirectTo = resolveRedirect(formString(form, "redirect") || undefined);

  const fieldErrors: Record<string, string> = {};
  const firstNameError = validateName(firstName, "First name");
  if (firstNameError) fieldErrors.firstName = firstNameError;
  const lastNameError = validateName(lastName, "Last name");
  if (lastNameError) fieldErrors.lastName = lastNameError;
  const emailError = validateEmail(email);
  if (emailError) fieldErrors.email = emailError;
  const passwordError = validatePassword(password);
  if (passwordError) fieldErrors.password = passwordError;
  const matchError = validatePasswordMatch(password, confirmPassword);
  if (matchError) fieldErrors.confirmPassword = matchError;
  if (!terms) {
    fieldErrors.terms = "Please accept the terms to continue.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const client = await getClient();
  if (!client) {
    return { ok: false, error: NOT_CONFIGURED_MESSAGE };
  }

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const siteUrl = getSiteUrl();

  const { data, error } = await client.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${siteUrl}${redirectTo}`,
    },
  });

  if (error) {
    return { ok: false, error: sanitiseAuthError(error.message), fieldErrors: {} };
  }

  // Supabase returns a `user` even when email confirmation is on
  // (the user is just not signed in yet). We treat a populated
  // user + no error as the success boundary — the form then asks
  // the SDK for a session in its own post-submit path so the
  // verification-vs-instant branch is taken on the client.
  if (!data.user) {
    return {
      ok: false,
      error: "Sign up did not return a user. Please try again.",
    };
  }

  if (data.session) {
    return { ok: true, status: "signed_in", redirectTo };
  }
  return { ok: true, status: "verification_pending" };
}

/* ------------------------------------------------------------------ *
 * Forgot password
 * ------------------------------------------------------------------ */

export async function forgotPasswordAction(
  form: FormData,
): Promise<AuthActionResult> {
  const email = formString(form, "email");
  const fieldErrors: Record<string, string> = {};
  const emailError = validateEmail(email);
  if (emailError) fieldErrors.email = emailError;
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const client = await getClient();
  if (!client) {
    return { ok: false, error: NOT_CONFIGURED_MESSAGE };
  }

  const siteUrl = getSiteUrl();
  const { error } = await client.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: `${siteUrl}/reset-password` },
  );

  if (error) {
    return { ok: false, error: sanitiseAuthError(error.message), fieldErrors: {} };
  }
  return { ok: true, status: "request_submitted" };
}

/* ------------------------------------------------------------------ *
 * Reset password
 * ------------------------------------------------------------------ */

export async function resetPasswordAction(
  form: FormData,
): Promise<AuthActionResult> {
  const password = formString(form, "password");
  const confirmPassword = formString(form, "confirmPassword");

  const fieldErrors: Record<string, string> = {};
  const passwordError = validatePassword(password);
  if (passwordError) fieldErrors.password = passwordError;
  const matchError = validatePasswordMatch(password, confirmPassword);
  if (matchError) fieldErrors.confirmPassword = matchError;
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const client = await getClient();
  if (!client) {
    return { ok: false, error: NOT_CONFIGURED_MESSAGE };
  }

  const { error } = await client.auth.updateUser({ password });

  if (error) {
    return { ok: false, error: sanitiseAuthError(error.message), fieldErrors: {} };
  }

  return { ok: true, status: "password_updated", redirectTo: "/login" };
}

/* ------------------------------------------------------------------ *
 * Sign out — server-side helper for form actions that want a clean
 * redirect after the cookie has been cleared. We expose it as an
 * action so it can be used by a `<form action={signOutAction}>` in
 * the header.
 * ------------------------------------------------------------------ */

export async function signOutAction(): Promise<void> {
  const client = await getClient();
  if (client) {
    await client.auth.signOut();
  }
  redirect("/");
}

/* ------------------------------------------------------------------ *
 * Utility — exposes a request-aware redirect target for forms that
 * need to read it from search params.
 * ------------------------------------------------------------------ */

export async function getCurrentRedirectParam(): Promise<string> {
  const h = await headers();
  const referer = h.get("referer");
  if (!referer) return "/account";
  try {
    const url = new URL(referer);
    const value = url.searchParams.get("redirect");
    return resolveRedirect(value ?? undefined);
  } catch {
    return "/account";
  }
}
