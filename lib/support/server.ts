import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/auth/config";
import { support, isSupportMailConfigured } from "@/config/support";
import {
  normaliseBdPhone,
  validateEmail,
} from "@/lib/auth/validation";

/**
 * Server-side support-message service.
 *
 * The contact form persists a row in the `support_messages` table
 * before attempting to send a notification email. Persistence is
 * the source of truth — if the email provider is not configured
 * the row is still recorded so the team can pick it up from the
 * database. If the email send fails the row is marked with the
 * failure so it can be retried.
 *
 * The table is intentionally opt-in. When the migration has not
 * been applied the service falls back to a pure "email only" path
 * and reports an honest "unconfigured" status if neither side is
 * available.
 */

export type SupportTopic =
  | "product"
  | "sizing"
  | "shipping"
  | "returns"
  | "order"
  | "payment"
  | "other";

export type SupportSubmissionInput = {
  name: string;
  email: string;
  /** Optional order reference, free-form. */
  orderNumber?: string | null;
  topic: SupportTopic | string;
  message: string;
  /** Optional phone number. Normalised to local form when present. */
  phone?: string | null;
};

export type SupportSubmissionResult =
  | { kind: "ok"; reference: string; emailed: boolean }
  | { kind: "validation_error"; fieldErrors: Record<string, string> }
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "unconfigured" }
  | { kind: "error"; message: string };

const ALLOWED_TOPICS: ReadonlyArray<SupportTopic> = [
  "product",
  "sizing",
  "shipping",
  "returns",
  "order",
  "payment",
  "other",
];

const MAX_NAME = 80;
const MAX_EMAIL = 320;
const MAX_PHONE = 32;
const MAX_ORDER = 64;
const MAX_TOPIC = 32;
const MAX_MESSAGE = 4_000;

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
 * Validate a contact submission. Returns either a sanitised payload
 * or a per-field error map. Empty values are reported with the same
 * user-facing copy the auth flows use.
 */
export function validateSupportSubmission(
  input: SupportSubmissionInput,
): {
  ok: true;
  data: SupportSubmissionInput & { phone: string | null };
} | { ok: false; fieldErrors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const name = input.name.trim();
  if (!name) errors.name = "Enter your name.";
  else if (name.length > MAX_NAME) errors.name = "Name is too long.";

  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;
  else if (input.email.trim().length > MAX_EMAIL) errors.email = "Email is too long.";

  let phone: string | null = null;
  if (input.phone && input.phone.trim().length > 0) {
    const trimmed = input.phone.trim();
    if (trimmed.length > MAX_PHONE) {
      errors.phone = "Phone number is too long.";
    } else {
      const normalised = normaliseBdPhone(trimmed);
      if (!normalised) {
        errors.phone =
          "Enter a valid Bangladeshi phone number (e.g. 01XXXXXXXXX or +8801XXXXXXXXX).";
      } else {
        phone = normalised;
      }
    }
  }

  const topic = String(input.topic || "").trim();
  if (!topic) {
    errors.topic = "Choose a topic.";
  } else if (!ALLOWED_TOPICS.includes(topic as SupportTopic)) {
    errors.topic = "Choose one of the available topics.";
  } else if (topic.length > MAX_TOPIC) {
    errors.topic = "Topic is too long.";
  }

  const message = input.message.trim();
  if (!message) errors.message = "Enter a message.";
  else if (message.length > MAX_MESSAGE)
    errors.message = "Message is too long (4000 characters max).";

  const orderNumber = input.orderNumber?.trim();
  if (orderNumber && orderNumber.length > MAX_ORDER) {
    errors.orderNumber = "Order number is too long.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, fieldErrors: errors };
  }
  return {
    ok: true,
    data: {
      name,
      email: input.email.trim().toLowerCase(),
      orderNumber: orderNumber || null,
      topic,
      message,
      phone,
    },
  };
}

/**
 * Persist a support message and dispatch the notification email.
 *
 * The function never throws. It returns a discriminated result so
 * the caller can render a meaningful success / error state. The
 * `email` field is the customer-supplied contact address — it is
 * stored for reply purposes only. Outbound mail is always addressed
 * to the configured `STORE_SUPPORT_EMAIL`.
 */
export async function submitSupportMessage(
  input: SupportSubmissionInput,
  context: { ip: string },
): Promise<SupportSubmissionResult> {
  const validation = validateSupportSubmission(input);
  if (!validation.ok) {
    return { kind: "validation_error", fieldErrors: validation.fieldErrors };
  }

  // Rate-limit per IP. 5 submissions per 10 minutes. Keeps a tiny
  // in-memory bucket — the project is small and the dedicated
  // abuse-protection service is out of scope for this prompt.
  const rate = checkRateLimit(context.ip);
  if (!rate.allowed) {
    return { kind: "rate_limited", retryAfterSeconds: rate.retryAfterSeconds };
  }

  const payload = validation.data;
  const client = getServiceClient();
  let stored = false;
  let rowId: string | null = null;

  if (client) {
    const { data, error } = await client
      .from("support_messages")
      .insert({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        topic: payload.topic,
        order_number: payload.orderNumber,
        message: payload.message,
        ip: context.ip,
        status: "received",
        email_status: isSupportMailConfigured() ? "pending" : "skipped",
      })
      .select("id")
      .maybeSingle();
    if (!error && data) {
      stored = true;
      rowId = (data as { id: string }).id;
    }
  }

  let emailed = false;
  if (isSupportMailConfigured() && support.toEmail) {
    const sent = await dispatchSupportEmail({
      to: support.toEmail,
      from: process.env.RESEND_FROM_EMAIL ?? "",
      apiKey: process.env.RESEND_API_KEY ?? "",
      payload,
    });
    emailed = sent.kind === "sent";
    if (stored && client && rowId) {
      await client
        .from("support_messages")
        .update({
          email_status: sent.kind,
          email_error: sent.kind === "failed" ? sent.error : null,
          emailed_at: sent.kind === "sent" ? new Date().toISOString() : null,
        })
        .eq("id", rowId);
    }
  }

  if (!stored && !emailed) {
    return { kind: "unconfigured" };
  }

  return {
    kind: "ok",
    reference: rowId ?? `pending-${Date.now()}`,
    emailed,
  };
}

/* ------------------------------------------------------------------ *
 * Email dispatch
 * ------------------------------------------------------------------ */

type SupportEmailResult =
  | { kind: "sent" }
  | { kind: "failed"; error: string }
  | { kind: "skipped" };

async function dispatchSupportEmail(input: {
  to: string;
  from: string;
  apiKey: string;
  payload: SupportSubmissionInput & { phone: string | null };
}): Promise<SupportEmailResult> {
  const { to, from, apiKey, payload } = input;
  if (!to || !from || !apiKey) return { kind: "skipped" };

  const subject = `[MONOFORM] Support enquiry — ${payload.topic}`;
  const html = renderSupportEmail(payload);
  const text = renderSupportEmailText(payload);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: payload.email,
        subject,
        html,
        text,
      }),
    });
    if (!response.ok) {
      const detail = await safeReadError(response);
      return { kind: "failed", error: detail };
    }
    return { kind: "sent" };
  } catch (err) {
    return {
      kind: "failed",
      error: err instanceof Error ? err.message : "Unknown email error.",
    };
  }
}

async function safeReadError(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { message?: string; error?: string };
    return json.message || json.error || `Provider returned ${response.status}.`;
  } catch {
    return `Provider returned ${response.status}.`;
  }
}

function renderSupportEmail(
  payload: SupportSubmissionInput & { phone: string | null },
): string {
  return `<!doctype html>
<html lang="en">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #111; background: #fafaf7; padding: 24px;">
    <table style="max-width: 640px; margin: 0 auto; background: #fff; border: 1px solid #eee; width: 100%;">
      <tr>
        <td style="padding: 32px;">
          <p style="margin: 0; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #888;">MONOFORM · Support</p>
          <h1 style="margin: 8px 0 0 0; font-size: 22px;">New support enquiry</h1>
          <p style="margin: 4px 0 0 0; color: #555; font-size: 14px;">Topic: ${escapeHtml(payload.topic)}</p>

          <h2 style="margin: 24px 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.18em; color: #555;">From</h2>
          <p style="margin: 0;">${escapeHtml(payload.name)}</p>
          <p style="margin: 0;">${escapeHtml(payload.email)}</p>
          ${payload.phone ? `<p style="margin: 0;">${escapeHtml(payload.phone)}</p>` : ""}
          ${payload.orderNumber ? `<p style="margin: 0;">Order reference: ${escapeHtml(payload.orderNumber)}</p>` : ""}

          <h2 style="margin: 24px 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.18em; color: #555;">Message</h2>
          <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(payload.message)}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderSupportEmailText(
  payload: SupportSubmissionInput & { phone: string | null },
): string {
  return [
    `MONOFORM — New support enquiry`,
    `Topic: ${payload.topic}`,
    "",
    "From",
    `- ${payload.name}`,
    `- ${payload.email}`,
    payload.phone ? `- ${payload.phone}` : "",
    payload.orderNumber ? `- Order reference: ${payload.orderNumber}` : "",
    "",
    "Message",
    payload.message,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ------------------------------------------------------------------ *
 * Tiny in-memory rate limiter
 * ------------------------------------------------------------------ */

type Bucket = { count: number; resetAt: number };
const RATE_BUCKETS = new Map<string, Bucket>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

function checkRateLimit(ip: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const existing = RATE_BUCKETS.get(ip);
  if (!existing || existing.resetAt <= now) {
    RATE_BUCKETS.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (existing.count >= RATE_LIMIT) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export const __supportInternals = {
  RATE_LIMIT,
  RATE_WINDOW_MS,
};
