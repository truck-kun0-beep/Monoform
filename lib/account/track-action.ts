"use server";

import { headers } from "next/headers";
import { lookupOrderForTracking } from "./orders";
import type { OrderTrackingResult } from "./types";

/**
 * Server action exposed to the public tracking form. The
 * implementation delegates to `lookupOrderForTracking` from the
 * order service and never returns more information than the
 * public tracking contract allows.
 *
 * The function builds a rate-limit bucket key from the IP (when
 * available) and the order number so a single attacker cannot
 * enumerate the entire order-number space. The bucket size and
 * window are configured in `lib/account/orders.ts`.
 */
export type TrackOrderActionResult =
  | { ok: true; order: OrderTrackingResult }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string>;
      retryAfterSeconds?: number;
    };

export async function trackOrderAction(
  form: FormData,
): Promise<TrackOrderActionResult> {
  const rawNumber =
    typeof form.get("number") === "string" ? String(form.get("number")) : "";
  const rawPhone =
    typeof form.get("phone") === "string" ? String(form.get("phone")) : "";

  const ip = await resolveClientIp();
  // The bucket key combines the IP and the (uppercased) number
  // so a single IP can probe many numbers while a single number
  // is also throttled across many IPs.
  const bucketKey = `${ip}::${rawNumber.trim().toUpperCase().slice(0, 64) || "empty"}`;

  const result = await lookupOrderForTracking(rawNumber, rawPhone, {
    bucketKey,
  });

  if (result.kind === "ok") {
    return { ok: true, order: result.order };
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
      error: `Too many attempts. Please wait ${result.retryAfterSeconds} seconds before trying again.`,
      retryAfterSeconds: result.retryAfterSeconds,
    };
  }
  if (result.kind === "not_found") {
    // Deliberately ambiguous. The application must not leak
    // whether the order number exists when the phone does not
    // match — both states surface the same message.
    return {
      ok: false,
      error:
        "We couldn't find an order matching that number and phone. Please check both values and try again.",
    };
  }
  if (result.kind === "not_supported") {
    return {
      ok: false,
      error:
        "Order tracking is not available yet. The order service is being prepared — please try again later.",
    };
  }
  if (result.kind === "not_configured") {
    return {
      ok: false,
      error:
        "Tracking is not available because the project is not connected to a Supabase instance yet.",
    };
  }
  return {
    ok: false,
    error: result.message,
  };
}

async function resolveClientIp(): Promise<string> {
  try {
    const h = await headers();
    // The hosting layer is expected to forward the client IP.
    // We accept the common `x-forwarded-for` and
    // `x-real-ip` headers, falling back to a constant so the
    // bucket key is still meaningful when running in dev.
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }
    const real = h.get("x-real-ip");
    if (real) return real.trim();
  } catch {
    // `headers()` may throw outside a request context. Fall
    // through to the dev fallback below.
  }
  return "unknown";
}
