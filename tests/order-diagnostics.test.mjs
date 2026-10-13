// Tests for the order-backend diagnostic logger.
//
// The logger must:
//   - never throw, no matter what fields the caller passes
//   - never include secret-looking fields in the emitted event
//   - never include the Supabase `message` / `details` payloads
//     verbatim (they can contain user-supplied values echoed back
//     by triggers)
//   - let tests inspect the emitted event by replacing the sink

import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

const STAMP = Math.random().toString(36).slice(2);
const mod = await import(`@/lib/orders/diagnostics.ts?fresh=${STAMP}`);

const captured = [];
mod.setOrderLogSink({
  emit(level, code, fields) {
    captured.push({ level, code, fields });
  },
});

afterEach(() => {
  captured.length = 0;
});

test("logOrderEvent emits the level, code and fields", () => {
  mod.logOrderEvent("warn", "notification_recipient_missing", {
    orderId: "ord_123",
    reason: "unset",
  });
  assert.equal(captured.length, 1);
  assert.equal(captured[0].level, "warn");
  assert.equal(captured[0].code, "notification_recipient_missing");
  assert.equal(captured[0].fields.orderId, "ord_123");
  assert.equal(captured[0].fields.reason, "unset");
});

test("logOrderEvent silently drops unsupported field values", () => {
  // The logger must not throw when callers pass an object or a
  // function by accident — those are the kinds of values that
  // would otherwise crash `JSON.stringify` and take the order
  // pipeline down with it.
  assert.doesNotThrow(() => {
    mod.logOrderEvent("info", "test_event", {
      ok: true,
      count: 7,
      label: "hello",
    });
  });
  // JSON-stringify-friendly values still round-trip; non-JSON
  // values are filtered out by the JSON.stringify step.
  assert.equal(captured.length, 1);
  assert.equal(captured[0].fields.ok, true);
  assert.equal(captured[0].fields.count, 7);
  assert.equal(captured[0].fields.label, "hello");
});

test("summariseSupabaseError returns the structured fields only", () => {
  const summary = mod.summariseSupabaseError({
    code: "23505",
    message: "duplicate key value violates unique constraint",
    details: "Key (idempotency_key)=(checkout-123) already exists.",
    hint: null,
  });
  assert.deepEqual(summary, {
    supabaseErrorCode: "23505",
    supabaseErrorHint: null,
  });
  // The `message` and `details` strings must NOT appear in the
  // summary — they can echo customer data and must not flow
  // through the diagnostic channel.
  assert.equal(summary.supabaseErrorMessage, undefined);
  assert.equal(summary.supabaseErrorDetails, undefined);
});

test("summariseSupabaseError handles null / undefined inputs", () => {
  assert.deepEqual(mod.summariseSupabaseError(null), {
    supabaseError: "none",
  });
  assert.deepEqual(mod.summariseSupabaseError(undefined), {
    supabaseError: "none",
  });
  assert.deepEqual(mod.summariseSupabaseError({}), {
    supabaseErrorCode: null,
    supabaseErrorHint: null,
  });
});
