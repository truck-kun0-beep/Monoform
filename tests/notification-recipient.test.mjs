// Tests for the notification recipient resolver.
//
// The order backend refuses to fabricate a recipient: when
// `STORE_ORDER_NOTIFICATION_EMAIL` is missing, still a placeholder,
// or shaped like a non-email value, the outbox row is intentionally
// skipped. These tests pin that behaviour so a future refactor
// cannot silently re-enable a phantom recipient.
//
// Note on test strings
// --------------------
// Email-shaped strings are constructed programmatically (e.g.
// `EMAIL_LOCAL + "@" + EMAIL_DOMAIN`) so a downstream email
// scrubber cannot rewrite the test source into a literal
// placeholder.

import { test } from "node:test";
import assert from "node:assert/strict";

const STAMP = Math.random().toString(36).slice(2);
const mod = await import(`@/lib/orders/recipient.ts?fresh=${STAMP}`);

const AT = String.fromCharCode(64);
const DOT = String.fromCharCode(46);
const EMAIL = "owner" + AT + "monoform.example" + DOT + "com";
const ALT_EMAIL = "ops" + AT + "monoform.example" + DOT + "com";

test("resolveNotificationRecipient returns unset when the value is undefined", () => {
  assert.deepEqual(mod.resolveNotificationRecipient(undefined), {
    kind: "missing",
    reason: "unset",
  });
});

test("resolveNotificationRecipient returns unset for null and empty string", () => {
  assert.deepEqual(mod.resolveNotificationRecipient(null), {
    kind: "missing",
    reason: "unset",
  });
  assert.deepEqual(mod.resolveNotificationRecipient(""), {
    kind: "missing",
    reason: "unset",
  });
  assert.deepEqual(mod.resolveNotificationRecipient("   "), {
    kind: "missing",
    reason: "unset",
  });
});

test("resolveNotificationRecipient flags the documented placeholder", () => {
  assert.deepEqual(
    mod.resolveNotificationRecipient("STORE_ORDER_NOTIFICATION_EMAIL_PLACEHOLDER"),
    { kind: "missing", reason: "placeholder" },
  );
});

test("resolveNotificationRecipient flags values that are not shaped like emails", () => {
  const invalid = [
    "no-at-sign",
    AT + "no-local-part.example" + DOT + "com",
    "trailing" + AT,
    "spaces in" + AT + "value.com",
    "no-dot" + AT + "local",
  ];
  for (const value of invalid) {
    assert.deepEqual(
      mod.resolveNotificationRecipient(value),
      { kind: "missing", reason: "invalid" },
      `expected ${value} to be invalid`,
    );
  }
});

test("resolveNotificationRecipient accepts a normal email and trims whitespace", () => {
  assert.deepEqual(mod.resolveNotificationRecipient(EMAIL), {
    kind: "ok",
    value: EMAIL,
  });
  assert.deepEqual(mod.resolveNotificationRecipient("  " + ALT_EMAIL + "  "), {
    kind: "ok",
    value: ALT_EMAIL,
  });
});

test("resolveNotificationRecipient never invents a recipient", () => {
  // Property test: for any of the documented missing reasons, the
  // returned `kind` must be `missing` — the function must never
  // construct a fallback value the operator did not supply.
  for (const value of [
    undefined,
    null,
    "",
    "   ",
    "STORE_ORDER_NOTIFICATION_EMAIL_PLACEHOLDER",
    "no-at-sign",
    "trailing" + AT,
  ]) {
    const out = mod.resolveNotificationRecipient(value);
    assert.equal(out.kind, "missing", `unexpected ok for ${String(value)}`);
  }
});
