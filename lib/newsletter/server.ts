import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/auth/config";
import { validateEmail } from "@/lib/auth/validation";
import { brand } from "@/config/brand";

/**
 * Server-side newsletter subscription service.
 *
 * Subscriptions persist to the `newsletter_subscriptions` table
 * (see `supabase/migrations/0005_newsletter_subscriptions.sql`).
 * The service only reports a successful subscription when the
 * row was actually persisted. When the configured email
 * provider (Resend) is available, a welcome / confirmation
 * message is also dispatched.
 *
 * The service is intentionally provider-agnostic: the same row
 * is written whether or not the email provider is configured.
 * A `pending` welcome email can be retried from the admin
 * dashboard once the provider is live.
 */

const SOURCE_FORM = "newsletter-form";

export type NewsletterSubmitInput = {
  email: string;
  source?: string;
  /** Whether the customer explicitly opted in. The form sets this
   *  to `true` only when the consent checkbox is ticked. */
  consent: boolean;
  /** Optional reference to the authenticated user, when the
   *  visitor is signed in at the time of submit. */
  userId?: string | null;
};

export type NewsletterSubmitResult =
  | {
      kind: "ok";
      status: "subscribed" | "already_subscribed";
      email: string;
      emailed: boolean;
    }
  | { kind: "consent_required" }
  | { kind: "validation_error"; message: string }
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "unconfigured" }
  | { kind: "error"; message: string };

export const NEWSLETTER_RUNTIME = {
  /** Max subscriptions per IP per window. */
  rateLimit: 5,
  /** Rate-limit window in milliseconds. */
  rateWindowMs: 10 * 60 * 1000,
  /** Max stored email length. */
  maxEmailLength: 320,
};

let cachedServiceClient: SupabaseClient | null = null;
function getServiceClient(): SupabaseClient | null {
  if (cachedServiceClient) return cachedServiceClient;
  const env = getSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !serviceKey) return null;
  if (serviceKey === "service-role-key") return null;
  cachedServiceClient = createClient(env.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedServiceClient;
}

/**
 * Returns true when the newsletter can be persisted to the
 * database. Email delivery is checked separately by
 * `isNewsletterEmailConfigured`.
 */
export function isNewsletterBackendConfigured(): boolean {
  return getServiceClient() !== null;
}

/** Returns true when the welcome / confirmation email can be
 *  dispatched through the configured provider. */
export function isNewsletterEmailConfigured(): boolean {
  return Boolean(
    brand.newsletterConfigured &&
      process.env.RESEND_API_KEY &&
      process.env.RESEND_FROM_EMAIL,
  );
}

/**
 * Validate a submission server-side. Returns either a sanitised
 * payload (lowercased email) or a discriminated error.
 */
function validateSubmission(input: NewsletterSubmitInput):
  | { ok: true; email: string; source: string; userId: string | null }
  | { ok: false; reason: "consent" | "invalid" | "too_long" } {
  if (!input.consent) {
    return { ok: false, reason: "consent" };
  }
  const emailError = validateEmail(input.email);
  if (emailError) {
    return { ok: false, reason: "invalid" };
  }
  const email = input.email.trim().toLowerCase();
  if (email.length > NEWSLETTER_RUNTIME.maxEmailLength) {
    return { ok: false, reason: "too_long" };
  }
  return {
    ok: true,
    email,
    source: input.source?.trim().slice(0, 64) || SOURCE_FORM,
    userId: input.userId ?? null,
  };
}

/**
 * Persist a subscription, dispatch the welcome email, and
 * return a discriminated result for the form.
 *
 * The function never throws — all failure modes are reported
 * through the result so the caller can render an honest
 * status without `try/catch`.
 */
export async function submitNewsletterSubscription(
  input: NewsletterSubmitInput,
  context: { ip: string },
): Promise<NewsletterSubmitResult> {
  const validation = validateSubmission(input);
  if (!validation.ok) {
    if (validation.reason === "consent") {
      return { kind: "consent_required" };
    }
    if (validation.reason === "invalid") {
      return {
        kind: "validation_error",
        message: "Please enter a valid email address.",
      };
    }
    return {
      kind: "validation_error",
      message: "Email address is too long.",
    };
  }

  const rate = checkRateLimit(context.ip);
  if (!rate.allowed) {
    return { kind: "rate_limited", retryAfterSeconds: rate.retryAfterSeconds };
  }

  const client = getServiceClient();
  if (!client) {
    return { kind: "unconfigured" };
  }

  // Look up an existing row so the same email is treated as a
  // single subscription. The unique index on `lower(email)` also
  // makes this idempotent at the database level.
  const { data: existing, error: lookupError } = await client
    .from("newsletter_subscriptions")
    .select("id, status, email")
    .ilike("email", validation.email)
    .maybeSingle();

  if (lookupError) {
    return {
      kind: "error",
      message: "We could not save your subscription right now. Please try again.",
    };
  }

  if (existing && (existing as { status: string }).status === "subscribed") {
    return {
      kind: "ok",
      status: "already_subscribed",
      email: validation.email,
      emailed: false,
    };
  }

  if (existing) {
    // Re-subscribe: rotate token, reset unsubscribe timestamp,
    // update consent_at.
    const { error: updateError } = await client
      .from("newsletter_subscriptions")
      .update({
        status: "subscribed",
        consent_at: new Date().toISOString(),
        unsubscribed_at: null,
        unsubscribe_token: generateToken(),
        user_id: validation.userId,
        source: validation.source,
        ip: context.ip,
        email_status: isNewsletterEmailConfigured() ? "pending" : "skipped",
        email_error: null,
        emailed_at: null,
      })
      .eq("id", (existing as { id: string }).id);
    if (updateError) {
      return {
        kind: "error",
        message: "We could not save your subscription right now. Please try again.",
      };
    }
  } else {
    const { error: insertError } = await client
      .from("newsletter_subscriptions")
      .insert({
        email: validation.email,
        status: "subscribed",
        source: validation.source,
        user_id: validation.userId,
        ip: context.ip,
        email_status: isNewsletterEmailConfigured() ? "pending" : "skipped",
      });
    if (insertError) {
      // The unique index may have raced; treat as a duplicate.
      if (insertError.code === "23505") {
        return {
          kind: "ok",
          status: "already_subscribed",
          email: validation.email,
          emailed: false,
        };
      }
      return {
        kind: "error",
        message: "We could not save your subscription right now. Please try again.",
      };
    }
  }

  // Dispatch the welcome email when the provider is configured.
  let emailed = false;
  if (isNewsletterEmailConfigured()) {
    emailed = await dispatchWelcomeEmail({
      to: validation.email,
      apiKey: process.env.RESEND_API_KEY ?? "",
      from: process.env.RESEND_FROM_EMAIL ?? "",
    });
  }

  return {
    kind: "ok",
    status: "subscribed",
    email: validation.email,
    emailed,
  };
}

/**
 * Mark a subscription as unsubscribed using a per-subscriber
 * token. Returns a discriminated result.
 */
export type UnsubscribeResult =
  | { kind: "ok"; email: string }
  | { kind: "not_found" }
  | { kind: "already"; email: string }
  | { kind: "invalid_token" }
  | { kind: "unconfigured" }
  | { kind: "error"; message: string };

export async function unsubscribeByToken(
  token: string | null | undefined,
): Promise<UnsubscribeResult> {
  if (!token) {
    return { kind: "invalid_token" };
  }
  const client = getServiceClient();
  if (!client) {
    return { kind: "unconfigured" };
  }

  const { data, error } = await client
    .from("newsletter_subscriptions")
    .select("id, email, status")
    .eq("unsubscribe_token", token)
    .maybeSingle();
  if (error) {
    return { kind: "error", message: "We could not process that request." };
  }
  if (!data) {
    return { kind: "not_found" };
  }
  if ((data as { status: string }).status === "unsubscribed") {
    return { kind: "already", email: (data as { email: string }).email };
  }

  const { error: updateError } = await client
    .from("newsletter_subscriptions")
    .update({
      status: "unsubscribed",
      unsubscribed_at: new Date().toISOString(),
      // Rotate the token so the same link cannot be reused.
      unsubscribe_token: generateToken(),
    })
    .eq("id", (data as { id: string }).id);
  if (updateError) {
    return { kind: "error", message: "We could not process that request." };
  }
  return { kind: "ok", email: (data as { email: string }).email };
}

/**
 * Build the absolute unsubscribe URL for a given token. The
 * route is `/newsletter/unsubscribe?token=…`; the token is
 * the only thing that authorises the action.
 */
export function buildUnsubscribeUrl(
  token: string,
  siteUrl: string,
): string {
  const base = siteUrl.replace(/\/$/, "");
  return `${base}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

/* ------------------------------------------------------------------ *
 * Email dispatch
 * ------------------------------------------------------------------ */

async function dispatchWelcomeEmail(input: {
  to: string;
  from: string;
  apiKey: string;
}): Promise<boolean> {
  const { to, from, apiKey } = input;
  if (!to || !from || !apiKey) return false;
  const subject = "You're subscribed to MONOFORM";
  const text = [
    `Thank you for subscribing to MONOFORM.`,
    ``,
    `You'll hear from us when there's something new to share — new arrivals,`,
    `seasonal edits and studio notes. No noise, no spam.`,
    ``,
    `If you ever want to stop, every email we send includes an unsubscribe link,`,
    `or you can use this one:`,
    ``,
    `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/newsletter/unsubscribe`,
    ``,
    `— The MONOFORM team`,
  ].join("\n");
  const html = `<!doctype html>
<html lang="en">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #111; background: #fafaf7; padding: 24px;">
    <table style="max-width: 560px; margin: 0 auto; background: #fff; border: 1px solid #eee; width: 100%;">
      <tr>
        <td style="padding: 32px;">
          <p style="margin: 0; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #888;">MONOFORM</p>
          <h1 style="margin: 8px 0 0 0; font-size: 22px;">Thank you for subscribing.</h1>
          <p style="margin: 16px 0 0 0; font-size: 14px; line-height: 1.5;">
            You'll hear from us when there's something new to share — new arrivals,
            seasonal edits and studio notes. No noise, no spam.
          </p>
          <p style="margin: 16px 0 0 0; font-size: 14px; line-height: 1.5;">
            If you ever want to stop, every email we send includes an unsubscribe link.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Rate limiter (in-memory; per IP)
 * ------------------------------------------------------------------ */

type RateBucket = { count: number; resetAt: number };
const RATE_BUCKETS = new Map<string, RateBucket>();

function checkRateLimit(ip: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const existing = RATE_BUCKETS.get(ip);
  if (!existing || existing.resetAt <= now) {
    RATE_BUCKETS.set(ip, {
      count: 1,
      resetAt: now + NEWSLETTER_RUNTIME.rateWindowMs,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (existing.count >= NEWSLETTER_RUNTIME.rateLimit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      ),
    };
  }
  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Generate a per-subscriber random token. */
function generateToken(): string {
  const bytes = new Uint8Array(24);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function resolveClientIpFromHeaders(
  fetchHeaders: Headers,
): Promise<string> {
  const forwarded = fetchHeaders.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = fetchHeaders.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export async function resolveNewsletterClientIp(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    return resolveClientIpFromHeaders(await headers());
  } catch {
    return "unknown";
  }
}
