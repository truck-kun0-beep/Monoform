/**
 * Notification recipient resolution.
 *
 * This module is pure (no I/O, no environment reads). Keeping it
 * independent from `service.ts` means the test suite can import it
 * without dragging the rest of the order backend into the runtime.
 */

export type NotificationRecipient =
  | { kind: "ok"; value: string }
  | { kind: "missing"; reason: "unset" | "placeholder" | "invalid" };

/**
 * Placeholder values from `.env.example` that the recipient
 * resolver treats as "not configured". Kept in sync with the
 * `PLACEHOLDER_TOKENS` set in `scripts/preflight.mjs`.
 */
const PLACEHOLDER_VALUES: ReadonlySet<string> = new Set([
  "STORE_ORDER_NOTIFICATION_EMAIL_PLACEHOLDER",
]);

/**
 * Lightweight check that a string looks like a routable email
 * address. The check is intentionally permissive — we do not want
 * to be the source of false negatives, only to refuse obvious
 * operator mistakes (e.g. trailing spaces, a stray newline, an
 * unescaped "mailto:"). The real validation happens at SMTP relay
 * time.
 */
function looksLikeEmail(value: string): boolean {
  const v = value.trim();
  if (v.length < 3 || v.length > 320) return false;
  if (v.includes(" ") || v.includes("\n") || v.includes("\r")) return false;
  const at = v.indexOf("@");
  if (at <= 0 || at === v.length - 1) return false;
  const dot = v.indexOf(".", at);
  if (dot === -1 || dot === v.length - 1) return false;
  return true;
}

/**
 * Resolve a raw `STORE_ORDER_NOTIFICATION_EMAIL` value into either
 * a usable recipient or an explicit `missing` reason.
 */
export function resolveNotificationRecipient(
  raw: string | undefined | null,
): NotificationRecipient {
  if (raw === undefined || raw === null) {
    return { kind: "missing", reason: "unset" };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { kind: "missing", reason: "unset" };
  }
  if (PLACEHOLDER_VALUES.has(trimmed)) {
    return { kind: "missing", reason: "placeholder" };
  }
  if (!looksLikeEmail(trimmed)) {
    return { kind: "missing", reason: "invalid" };
  }
  return { kind: "ok", value: trimmed };
}

/**
 * Stable placeholder recipient used when the deployment has not
 * configured `STORE_ORDER_NOTIFICATION_EMAIL`. The `.invalid` TLD
 * is reserved by RFC 2606 to guarantee the address cannot route to
 * a real mailbox — the dispatch path can still record the attempt
 * and the admin can rebuild the row once the env var is set. The
 * exact value is also exported so tests can assert on it.
 */
export const UNCONFIGURED_NOTIFICATION_RECIPIENT =
  "not-configured@local.invalid";

/**
 * Resolve the recipient an order should be queued for, falling
 * back to a safe placeholder when the env var is missing. The
 * `lastError` field returns a short operator-facing explanation
 * when the fallback is used so the admin UI can surface it.
 */
export function resolveNotificationRecipientForQueue(
  raw: string | undefined | null,
): {
  recipient: string;
  configured: boolean;
  lastError: string | null;
} {
  const resolved = resolveNotificationRecipient(raw);
  if (resolved.kind === "ok") {
    return {
      recipient: resolved.value,
      configured: true,
      lastError: null,
    };
  }
  const reason = describeMissingReason(resolved.reason);
  return {
    recipient: UNCONFIGURED_NOTIFICATION_RECIPIENT,
    configured: false,
    lastError: reason,
  };
}

/**
 * Short operator-facing description for a missing-recipient
 * reason. Kept in one place so the admin UI and the logs use the
 * same wording.
 */
export function describeMissingReason(
  reason: "unset" | "placeholder" | "invalid",
): string {
  switch (reason) {
    case "unset":
      return "STORE_ORDER_NOTIFICATION_EMAIL is not configured. Set it in the deployment environment, then rebuild the notification.";
    case "placeholder":
      return "STORE_ORDER_NOTIFICATION_EMAIL is still the example placeholder. Replace it with a real address, then rebuild the notification.";
    case "invalid":
      return "STORE_ORDER_NOTIFICATION_EMAIL is not a valid email address. Fix it in the deployment environment, then rebuild the notification.";
  }
}
