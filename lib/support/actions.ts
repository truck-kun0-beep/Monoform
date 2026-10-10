"use server";

import { headers } from "next/headers";
import {
  submitSupportMessage,
  type SupportTopic,
  type SupportSubmissionResult,
} from "./server";

/**
 * Public result shape returned to the contact form client
 * component. Mirrors `SupportSubmissionResult` with the few
 * customer-facing tweaks that the UI needs.
 */
export type ContactActionResult =
  | { ok: true; reference: string; emailed: boolean }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string>;
      retryAfterSeconds?: number;
    };

const ALLOWED_TOPICS: ReadonlyArray<SupportTopic> = [
  "product",
  "sizing",
  "shipping",
  "returns",
  "order",
  "payment",
  "other",
];

function formString(form: FormData, key: string): string {
  const raw = form.get(key);
  return typeof raw === "string" ? raw : "";
}

function formOptional(form: FormData, key: string): string | undefined {
  const raw = form.get(key);
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

/**
 * Server action used by the `/contact` form. Validates on the
 * server, persists the message, dispatches the notification email
 * and returns a discriminated result. The form preserves the
 * submitted values client-side on recoverable errors.
 */
export async function submitContactAction(
  form: FormData,
): Promise<ContactActionResult> {
  const topic = formString(form, "topic") || "other";
  const result: SupportSubmissionResult = await submitSupportMessage(
    {
      name: formString(form, "name"),
      email: formString(form, "email"),
      orderNumber: formOptional(form, "orderNumber") ?? null,
      topic: ALLOWED_TOPICS.includes(topic as SupportTopic)
        ? topic
        : "other",
      message: formString(form, "message"),
      phone: formOptional(form, "phone") ?? null,
    },
    { ip: await resolveClientIp() },
  );

  if (result.kind === "ok") {
    return { ok: true, reference: result.reference, emailed: result.emailed };
  }
  if (result.kind === "validation_error") {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: result.fieldErrors,
    };
  }
  if (result.kind === "rate_limited") {
    return {
      ok: false,
      error: `Too many submissions. Please wait ${result.retryAfterSeconds} seconds before trying again.`,
      retryAfterSeconds: result.retryAfterSeconds,
    };
  }
  if (result.kind === "unconfigured") {
    return {
      ok: false,
      error:
        "Support is not configured yet. Please email us directly or check back soon — the team is finishing the final setup.",
    };
  }
  return { ok: false, error: result.message };
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
