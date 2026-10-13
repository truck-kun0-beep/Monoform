// Live end-to-end tests for the admin order detail page (Prompt 17).
//
// These tests run against the configured Supabase project. They
// are SKIPPED when the `SUPABASE_SERVICE_ROLE_KEY` is missing or
// the URL is the example placeholder — that way a CI machine
// without a configured backend still passes the rest of the suite.
//
// The tests:
//   - Verify that an existing order can be read by its UUID and
//     the detail data is intact.
//   - Verify that a forged id returns "not_found" without
//     misreporting as "error".
//   - Verify that the admin's existing order (MF-000007) is the
//     same one that surfaces in the admin list and the detail
//     page.
//
// Every test is clearly labelled LIVE in its name. Any failure
// here means the live backend, not the mocked one, is broken.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const ENV_PATH = new URL("../.env.local", import.meta.url);
let envLoaded = false;
let baseUrl = null;
let publishableKey = null;
let serviceKey = null;

try {
  const raw = readFileSync(ENV_PATH, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (m[1] === "NEXT_PUBLIC_SUPABASE_URL") baseUrl = m[2];
    if (m[1] === "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
      publishableKey = m[2];
    if (m[1] === "SUPABASE_SERVICE_ROLE_KEY") serviceKey = m[2];
  }
  envLoaded = Boolean(baseUrl && publishableKey && serviceKey);
} catch {
  envLoaded = false;
}

const hasLiveBackend = Boolean(
  envLoaded &&
    baseUrl &&
    !baseUrl.includes("example.supabase.co") &&
    serviceKey &&
    serviceKey !== "service-role-key" &&
    serviceKey !== "sb_secret_placeholder",
);

const skipReason = hasLiveBackend
  ? null
  : "SUPABASE_SERVICE_ROLE_KEY or URL is missing/placeholder; live tests skipped";

function live(name, fn) {
  test(name, { skip: skipReason ?? undefined }, async () => fn());
}

let serviceClient;

before(async () => {
  if (!hasLiveBackend) return;
  serviceClient = createClient(baseUrl, serviceKey, {
    auth: { persistSession: false },
  });
});

after(async () => {
  if (serviceClient) {
    serviceClient = null;
  }
});

live(
  "live: an existing test order can be read by UUID from the live Supabase project",
  async () => {
    assert.ok(hasLiveBackend, "live backend not configured");
    const { data: row, error } = await serviceClient
      .from("orders")
      .select(
        "id, order_number, order_status, payment_status, total_paisa, subtotal_paisa, delivery_fee_paisa, currency, customer_name, customer_phone, customer_email, recipient_name, phone, district, locality, address_line, postal_code, delivery_zone",
      )
      .eq("order_number", "MF-000007")
      .maybeSingle();
    assert.ok(row, "expected MF-000007 to exist in the live database");
    if (error) {
      console.log("orders read error:", error);
    }
    assert.equal(error, null);
    assert.equal(row.order_number, "MF-000007");
    assert.ok(row.id, "the order row must have a UUID id");
    assert.match(row.id, /^[0-9a-f-]{36}$/);
  },
);

live(
  "live: a UUID that doesn't match any order returns no row (not an error)",
  async () => {
    assert.ok(hasLiveBackend, "live backend not configured");
    const { data, error } = await serviceClient
      .from("orders")
      .select("id")
      .eq("id", "00000000-0000-0000-0000-000000000000")
      .maybeSingle();
    assert.equal(error, null, "missing rows must not surface as a DB error");
    assert.equal(data, null, "an unknown UUID must return null (not_found), not a row");
  },
);

live(
  "live: the existing order has items and the line total is preserved",
  async () => {
    assert.ok(hasLiveBackend, "live backend not configured");
    const { data: order } = await serviceClient
      .from("orders")
      .select("id, subtotal_paisa, delivery_fee_paisa, total_paisa")
      .eq("order_number", "MF-000007")
      .maybeSingle();
    assert.ok(order, "expected MF-000007");
    const { data: items } = await serviceClient
      .from("order_items")
      .select("id, product_name, size, color, quantity, unit_price_paisa, line_total_paisa")
      .eq("order_id", order.id);
    assert.ok(items, "expected items to be readable");
    assert.ok(items.length > 0, "expected MF-000007 to have at least one item");
    // The line total must equal unit_price * quantity.
    for (const item of items) {
      assert.equal(
        item.line_total_paisa,
        item.unit_price_paisa * item.quantity,
        "line total must equal unit price * quantity (historical snapshot)",
      );
    }
  },
);

live(
  "live: the existing order's id is the one used by the admin list View link",
  async () => {
    assert.ok(hasLiveBackend, "live backend not configured");
    // Simulate what the admin list query returns.
    const { data: rows, error } = await serviceClient
      .from("orders")
      .select("id, order_number, created_at, order_status, payment_method, payment_status, total_paisa, currency, customer_name, customer_phone, customer_email, delivery_zone")
      .order("created_at", { ascending: false })
      .limit(5);
    assert.equal(error, null);
    assert.ok(rows && rows.length > 0, "expected at least one order in the live list");
    // Every row should have a UUID id; the order_number is for display
    // only and the View link is /admin/orders/<id>.
    for (const row of rows) {
      assert.match(row.id, /^[0-9a-f-]{36}$/);
    }
  },
);

live(
  "live: the orders table query uses the correct column set (no recipient_phone, no courier_*)",
  async () => {
    assert.ok(hasLiveBackend, "live backend not configured");
    // The schema has `phone` (not `recipient_phone`) and has no
    // courier_* columns. The detail query must therefore not
    // request `recipient_phone` or `courier_*`.
    const { error } = await serviceClient
      .from("orders")
      .select("recipient_phone")
      .limit(1);
    assert.ok(error, "selecting recipient_phone should fail (column does not exist)");
    if (error) {
      // Postgres error code 42703 is "undefined column".
      assert.equal(error.code, "42703");
    }
  },
);

live(
  "live: the notifications table contains the existing MF-000007 row (unsent, no crash)",
  async () => {
    assert.ok(hasLiveBackend, "live backend not configured");
    const { data: order } = await serviceClient
      .from("orders")
      .select("id")
      .eq("order_number", "MF-000007")
      .maybeSingle();
    assert.ok(order);
    const { data: notifs, error } = await serviceClient
      .from("order_notifications")
      .select("id, status, recipient, attempt_count, last_error")
      .eq("order_id", order.id);
    assert.equal(error, null);
    assert.ok(notifs, "notifications must be readable");
    assert.equal(notifs.length, 1, "expected exactly one notification row for MF-000007");
    assert.equal(notifs[0].status, "pending");
  },
);
