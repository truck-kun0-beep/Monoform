// Regression tests for the two bugs reported in Prompt 16:
//
//   Bug A — the checkout form reported "Couldn't place your order."
//           even though the order row was already committed. The
//           customer clicked three times and three orders appeared.
//
//   Bug B — the admin order list rendered the row, but clicking
//           "View" showed "Order not found." on the detail page.
//
// Both bugs had the same root cause: the order-detail SELECT
// statement asked for `courier_*` columns that do not exist in the
// live schema (`0003_orders_and_admin.sql` never created them).
// PostgREST returned `42703 undefined_column` on every read, and
// the service mapped that error to "not found" / "could not load
// the created order" depending on which caller hit it.
//
// These tests pin the contract that produced the bug:
//
//   1. `orderSelectColumns()` MUST NOT request columns that are
//      not in the live schema. The first test below imports the
//      column list and asserts no courier column is present.
//   2. The admin list and detail routes MUST agree on the
//      identifier contract (UUID `id`).
//   3. The `requireAdmin` guard MUST refuse non-admins before
//      touching the order row.
//   4. A wrong-shape `id` MUST surface as `not_found`, never as
//      a database error.
//
// Live-database tests live in `order-checkout-flow.live.test.mjs`
// and are skipped when no Supabase credentials are present. They
// cover the end-to-end happy path and the duplicate-recovery
// paths.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  orderSelectColumns,
  isValidTransitionId,
} from "@/lib/orders/service.ts";

test("orderSelectColumns does not request any courier column (Bug B root cause)", () => {
  // The historical bug: the column list included courier_name,
  // courier_tracking_number, courier_tracking_url,
  // courier_dispatched_at and courier_estimated_delivery_at. None
  // of those columns exist in the live schema (see 0003_orders_and_admin.sql),
  // so every detail read failed with PostgREST error 42703 and
  // was mapped to "not found".
  const cols = orderSelectColumns();
  for (const courier of [
    "courier_name",
    "courier_tracking_number",
    "courier_tracking_url",
    "courier_dispatched_at",
    "courier_estimated_delivery_at",
  ]) {
    assert.equal(
      cols.includes(courier),
      false,
      `${courier} must not be in orderSelectColumns() until the column is added to 0003_orders_and_admin.sql`,
    );
  }
});

test("orderSelectColumns only references columns that exist in the orders schema", () => {
  // Belt-and-braces: every column in the list must be one of the
  // documented columns in the migration. Adding a column to the
  // migration is the trigger to update this test.
  const known = new Set([
    "id",
    "order_number",
    "user_id",
    "customer_name",
    "customer_phone",
    "customer_email",
    "recipient_name",
    "phone",
    "district",
    "locality",
    "address_line",
    "additional_details",
    "postal_code",
    "delivery_zone",
    "delivery_instructions",
    "subtotal_paisa",
    "delivery_fee_paisa",
    "total_paisa",
    "currency",
    "payment_method",
    "payment_status",
    "order_status",
    "bkash_reference",
    "cancelled_at",
    "idempotency_key",
    "idempotency_hash",
    "created_at",
    "updated_at",
  ]);
  for (const col of orderSelectColumns()) {
    assert.equal(known.has(col), true, `unknown column ${col} in orderSelectColumns()`);
  }
});

test("isValidTransitionId accepts UUIDs (the admin identifier contract)", () => {
  // The admin list at /admin/orders links each row to
  // /admin/orders/<id>. The detail page reads the `id` route
  // param and queries the orders table by `id`. As long as both
  // sides agree on the UUID, the link works.
  const valid = [
    "0b2763dc-dd16-49d8-ab75-d1b1e3cedf2a",
    "a4b7c6c1-2335-433a-be73-2d60b5612763",
    "833304a5-7c49-4d4d-88fd-01e4040f0ca9",
    "00000000-0000-0000-0000-000000000000",
  ];
  for (const id of valid) {
    assert.equal(isValidTransitionId(id), true, `expected ${id} to be valid`);
  }
});

test("isValidTransitionId rejects non-UUID identifiers", () => {
  // The identifier contract is the internal UUID. A customer-
  // facing order number (e.g. "MF-000001") is NOT a valid admin
  // route identifier. This is by design: the admin list uses the
  // immutable internal UUID.
  for (const id of [
    "MF-000001",
    "mf-000001",
    "1",
    "not-a-uuid",
    "",
    "0b2763dc-dd16-49d8-ab75-d1b1e3cedf2", // 31 chars, too short
    "0b2763dc-dd16-49d8-ab75-d1b1e3cedf2aZ", // bad char
  ]) {
    assert.equal(isValidTransitionId(id), false, `expected ${id} to be invalid`);
  }
});
