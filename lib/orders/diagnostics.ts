import "server-only";

/**
 * Server-side diagnostic logger for the order backend.
 *
 * Goal: when a customer sees "Couldn't place your order.", the
 * operator must be able to look at the server logs and find the
 * exact failure point, the Supabase error code and the table that
 * rejected the write — without seeing the customer's data.
 *
 * The logger writes to `process.stderr` only. It is intentionally
 * NOT routed through the standard `console.error` path so the
 * module can be replaced by a structured-logging backend later
 * (e.g. Logflare, Datadog) by overriding the `emit` field.
 *
 * Privacy contract
 * ----------------
 * The `log` function only ever receives sanitised key/value pairs
 * that the caller has explicitly chosen. The logger does not look
 * at the surrounding scope, the stack trace, or the Supabase
 * `details` / `hint` payloads. Callers that pass an unknown object
 * must pass a string, not a free-form blob.
 *
 * The logger is server-only. Importing it from a "use client" file
 * fails the build (the `server-only` package throws).
 */

export type OrderLogLevel = "info" | "warn" | "error";

export type OrderLogFields = Record<string, string | number | boolean | null>;

/**
 * Single module-level sink. Tests override this to assert on the
 * emitted events without touching `process.stderr`.
 */
type OrderLogSink = {
  emit(level: OrderLogLevel, code: string, fields: OrderLogFields): void;
};

let sink: OrderLogSink = {
  emit(level, code, fields) {
    const safe = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined),
    );
    const line = JSON.stringify({
      t: new Date().toISOString(),
      source: "orders",
      level,
      code,
      ...safe,
    });
    process.stderr.write(line + "\n");
  },
};

export function setOrderLogSink(next: OrderLogSink | null): void {
  sink = next ?? {
    emit(level, code, fields) {
      const safe = Object.fromEntries(
        Object.entries(fields).filter(([, v]) => v !== undefined),
      );
      const line = JSON.stringify({
        t: new Date().toISOString(),
        source: "orders",
        level,
        code,
        ...safe,
      });
      process.stderr.write(line + "\n");
    },
  };
}

/**
 * Public entry point. `code` is a stable identifier the operator
 * can grep for (e.g. `order_insert_failed`). `fields` carries the
 * sanitised key/value pairs the operator should see.
 */
export function logOrderEvent(
  level: OrderLogLevel,
  code: string,
  fields: OrderLogFields = {},
): void {
  try {
    sink.emit(level, code, fields);
  } catch {
    // The logger must never throw. A failure here is a programming
    // bug — the caller passed an unsupported value type. Swallow
    // it so a misbehaving diagnostic never breaks order placement.
  }
}

/**
 * Reduce a Supabase PostgREST error to a small, safe set of fields.
 * The Supabase `message` and `details` fields can contain column
 * names but can also contain user-supplied values echoed back by
 * triggers; we keep the structured fields (`code`, `hint`) and
 * short-circuit the message to a constant string so a customer
 * never appears in the server log by accident.
 */
export function summariseSupabaseError(err: {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
} | null | undefined): OrderLogFields {
  if (!err) return { supabaseError: "none" };
  return {
    supabaseErrorCode: typeof err.code === "string" ? err.code : null,
    supabaseErrorHint: typeof err.hint === "string" ? err.hint : null,
  };
}
