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
