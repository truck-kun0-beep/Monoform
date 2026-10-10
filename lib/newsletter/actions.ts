"use server";

import { headers } from "next/headers";
import { submitNewsletterSubscription } from "./server";
import type { NewsletterSubmitResult } from "./server";

/**
 * Result type returned to the client form. The client form
 * inspects `kind` to choose the right status card.
 */
export type NewsletterActionResult =
  | {
      ok: true;
      status: "subscribed" | "already_subscribed";
      email: string;
      emailed: boolean;
    }
  | {
      ok: false;
      error: string;
      retryAfterSeconds?: number;
    };

function formString(form: FormData, key: string): string {
  const raw = form.get(key);
  return typeof raw === "string" ? raw : "";
}

function formBool(form: FormData, key: string): boolean {
  const v = form.get(key);
  return v === "on" || v === "true" || v === "1";
}

async function resolveClientIp(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }
    const real = h.get("x-real-ip");
    if (real) return real.trim();
  } catch {
    // Outside a request context (build / test) — fall through.
  }
  return "unknown";
}

/**
 * Server action used by the newsletter form. Validates the
 * input on the server (consent, email shape, length), persists
 * the subscription, dispatches the welcome email, and returns
 * a discriminated result the form can render.
 */
export async function submitNewsletterAction(
  form: FormData,
): Promise<NewsletterActionResult> {
  const consent = formBool(form, "consent");
  const source = formString(form, "source") || "newsletter-form";
  const userId = formString(form, "userId") || null;

  const result: NewsletterSubmitResult = await submitNewsletterSubscription(
    {
      email: formString(form, "email"),
      consent,
      source,
      userId,
    },
    { ip: await resolveClientIp() },
  );

  if (result.kind === "ok") {
    return {
      ok: true,
      status: result.status,
      email: result.email,
      emailed: result.emailed,
    };
  }
  if (result.kind === "consent_required") {
    return {
      ok: false,
      error: "Please tick the consent box to receive the newsletter.",
    };
  }
  if (result.kind === "validation_error") {
    return { ok: false, error: result.message };
  }
  if (result.kind === "rate_limited") {
    return {
      ok: false,
      error: `Too many attempts. Please wait ${result.retryAfterSeconds} seconds before trying again.`,
      retryAfterSeconds: result.retryAfterSeconds,
    };
  }
  if (result.kind === "unconfigured") {
    return {
      ok: false,
      error:
        "Newsletter sign-up is not configured yet. Please check back soon.",
    };
  }
  return { ok: false, error: result.message };
}
