// Regression tests for the order-notification outbox.
//
// The Vercel production deployment was reporting "No notifications
// have been queued for this order" for every order because the
// outbox insert in `placeOrder` was silently skipped when
// `STORE_ORDER_NOTIFICATION_EMAIL` was missing or set to the
// placeholder. The fix has two parts:
//
//  1. `placeOrder` now ALWAYS writes a row to the outbox. When
//     the env var is missing the safe `not-configured@local.invalid`
//     fallback is used and `last_error` records the exact reason
//     (`unset` / `placeholder` / `invalid`).
//  2. `rebuildNotificationForOrder` is a new admin recovery path
//     for orders that committed with zero rows (typically placed
//     before the fix or during an outage). It inserts a row using
//     the *current* recipient configuration and hands it to the
//     dispatch pipeline; a duplicate rebuild on an order that
//     already has a row is a no-op that re-renders the existing
//     state instead of fabricating a new attempt.
//
// These tests pin both contracts so the silent-skip regression
// cannot reappear.

import { test, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createMockSupabaseClient } from "./fixtures/mock-supabase.mjs";
import {
  placeOrder,
  rebuildNotificationForOrder,
  __setServiceClientForTesting,
} from "@/lib/orders/service.ts";
import { __setCurrentUserForTesting } from "@/lib/auth/require.ts";

const TEST_USER = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "tester@example.com",
};
const ADMIN_USER = {
  id: "56d05a56-5b3a-4a3a-9a3a-5b3a4a3a9a3a",
  email: "admin@example.com",
};

const INSERTED_ORDER_ROW = {
  id: "0b2763dc-dd16-49d8-ab75-d1b1e3cedf2a",
  order_number: "MF-000001",
  user_id: TEST_USER.id,
  created_at: "2026-10-13T10:00:00.000Z",
  order_status: "pending_confirmation",
  payment_method: "cod",
  payment_status: "pending",
  subtotal_paisa: 100000,
  delivery_fee_paisa: 7000,
  total_paisa: 107000,
  currency: "BDT",
  customer_name: "Asha Khan",
  customer_phone: "+8801712345678",
  customer_email: null,
  recipient_name: "Asha Khan",
  phone: "+8801712345678",
  district: "Dhaka",
  locality: null,
  address_line: "House 1, Road 1",
  additional_details: null,
  postal_code: null,
  delivery_zone: "inside_dhaka",
  delivery_instructions: null,
  bkash_reference: null,
  cancelled_at: null,
};

let mock;
let originalEnv;

function setStoreEmail(value) {
  if (value === undefined) {
    delete process.env.STORE_ORDER_NOTIFICATION_EMAIL;
  } else {
    process.env.STORE_ORDER_NOTIFICATION_EMAIL = value;
  }
}

function stagePlaceOrderHappyPath() {
  mock = createMockSupabaseClient({
    user: TEST_USER,
    allowlist: [{ user_id: ADMIN_USER.id }],
  });
  __setServiceClientForTesting(mock);
  // findIdempotentOrder -> miss
  mock.__push("orders", "select", { data: null, error: null });
  // findRecentIdempotentOrderByHash (pre-insert) -> miss
  mock.__push("orders", "select", { data: null, error: null });
  // orders insert -> success
  mock.__push("orders", "insert", { data: INSERTED_ORDER_ROW, error: null });
  // findRecentIdempotentOrderByHash (post) -> our own row
  mock.__push("orders", "select", {
    data: {
      id: INSERTED_ORDER_ROW.id,
      idempotency_hash: "stub",
      created_at: INSERTED_ORDER_ROW.created_at,
    },
    error: null,
  });
  // order_items insert -> success
  mock.__push("order_items", "insert", { data: null, error: null });
  // order_status_history insert -> success
  mock.__push("order_status_history", "insert", { data: null, error: null });
  // order_notifications insert -> success (the assertion below
  // inspects the queued call so the exact success is irrelevant
  // beyond not throwing)
  mock.__push("order_notifications", "insert", { data: null, error: null });
  // readOrderAsDetail orders -> success
  mock.__push("orders", "select", { data: INSERTED_ORDER_ROW, error: null });
  // readOrderAsDetail order_items
  mock.__push("order_items", "select", { data: [], error: null });
  // readOrderAsDetail order_status_history
  mock.__push("order_status_history", "select", { data: [], error: null });
}

function goodInput() {
  return {
    customerName: "Asha Khan",
    customerPhone: "01712345678",
    customerEmail: "tester@example.com",
    address: {
      recipientName: "Asha Khan",
      phone: "01712345678",
      district: "Dhaka",
      locality: "Dhanmondi",
      addressLine: "House 12, Road 7",
      additionalDetails: null,
      postalCode: "1205",
      deliveryZone: "inside_dhaka",
      deliveryInstructions: null,
    },
    paymentMethod: "cod",
    bkashReference: null,
    lines: [{ productId: "p-001", quantity: 1, size: "M", color: "Camel" }],
    idempotencyKey: `idem-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 10)}`,
  };
}

beforeEach(() => {
  originalEnv = process.env.STORE_ORDER_NOTIFICATION_EMAIL;
});

afterEach(() => {
  setStoreEmail(originalEnv);
  if (mock) {
    __setServiceClientForTesting(null);
    mock = null;
  }
  __setCurrentUserForTesting(null);
});

test("placeOrder ALWAYS writes an outbox row, even when the recipient env is unset", async () => {
  setStoreEmail(undefined);
  __setCurrentUserForTesting(TEST_USER);
  stagePlaceOrderHappyPath();

  const result = await placeOrder(goodInput());
  assert.equal(result.kind, "ok");
  if (result.kind !== "ok") return;

  const notifInserts = mock
    .__getCalls()
    .filter((c) => c.table === "order_notifications" && c.op === "insert");
  assert.equal(
    notifInserts.length,
    1,
    "placeOrder must insert the notification outbox row even when STORE_ORDER_NOTIFICATION_EMAIL is unset",
  );
  // The mock records inserts with `payload` as the array of rows.
  const inserted = notifInserts[0].payload[0];
  // The safe fallback recipient must be used so the row's
  // `recipient` column satisfies its not-null contract.
  assert.equal(
    inserted.recipient,
    "not-configured@local.invalid",
  );
  // The status must be `pending` so the admin sees the row and
  // can rebuild once the env var is set.
  assert.equal(inserted.status, "pending");
});

test("placeOrder uses the safe fallback and records the reason when the env is the documented placeholder", async () => {
  setStoreEmail("STORE_ORDER_NOTIFICATION_EMAIL_PLACEHOLDER");
  __setCurrentUserForTesting(TEST_USER);
  stagePlaceOrderHappyPath();

  const result = await placeOrder(goodInput());
  assert.equal(result.kind, "ok");
  if (result.kind !== "ok") return;

  const notifInserts = mock
    .__getCalls()
    .filter((c) => c.table === "order_notifications" && c.op === "insert");
  assert.equal(notifInserts.length, 1);
  const inserted = notifInserts[0].payload[0];
  assert.equal(
    inserted.recipient,
    "not-configured@local.invalid",
  );
  assert.match(
    String(inserted.last_error ?? ""),
    /placeholder/i,
    "last_error must explain the placeholder reason",
  );
});

test("placeOrder uses the safe fallback and records the reason when the env value is not an email", async () => {
  setStoreEmail("not-an-email");
  __setCurrentUserForTesting(TEST_USER);
  stagePlaceOrderHappyPath();

  const result = await placeOrder(goodInput());
  assert.equal(result.kind, "ok");
  if (result.kind !== "ok") return;

  const notifInserts = mock
    .__getCalls()
    .filter((c) => c.table === "order_notifications" && c.op === "insert");
  assert.equal(notifInserts.length, 1);
  const inserted = notifInserts[0].payload[0];
  assert.equal(
    inserted.recipient,
    "not-configured@local.invalid",
  );
  assert.match(
    String(inserted.last_error ?? ""),
    /not a valid email/i,
  );
});

test("placeOrder uses the configured recipient when the env is a valid email", async () => {
  setStoreEmail("owner@monoform.example.com");
  __setCurrentUserForTesting(TEST_USER);
  stagePlaceOrderHappyPath();

  const result = await placeOrder(goodInput());
  assert.equal(result.kind, "ok");
  if (result.kind !== "ok") return;

  const notifInserts = mock
    .__getCalls()
    .filter((c) => c.table === "order_notifications" && c.op === "insert");
  assert.equal(notifInserts.length, 1);
  const inserted = notifInserts[0].payload[0];
  assert.equal(inserted.recipient, "owner@monoform.example.com");
  // When the recipient is valid, last_error must be null so the
  // admin UI does not display a misleading "recipient not
  // configured" message on healthy rows.
  assert.equal(inserted.last_error, null);
});

test("placeOrder still commits the order when the outbox insert itself fails", async () => {
  setStoreEmail("owner@monoform.example.com");
  __setCurrentUserForTesting(TEST_USER);
  mock = createMockSupabaseClient({ user: TEST_USER });
  __setServiceClientForTesting(mock);
  // findIdempotentOrder -> miss
  mock.__push("orders", "select", { data: null, error: null });
  // findRecentIdempotentOrderByHash (pre) -> miss
  mock.__push("orders", "select", { data: null, error: null });
  // orders insert -> success
  mock.__push("orders", "insert", { data: INSERTED_ORDER_ROW, error: null });
  // findRecentIdempotentOrderByHash (post) -> our own row
  mock.__push("orders", "select", {
    data: {
      id: INSERTED_ORDER_ROW.id,
      idempotency_hash: "stub",
      created_at: INSERTED_ORDER_ROW.created_at,
    },
    error: null,
  });
  // order_items insert -> success
  mock.__push("order_items", "insert", { data: null, error: null });
  // order_status_history insert -> success
  mock.__push("order_status_history", "insert", { data: null, error: null });
  // order_notifications insert -> FAILURE (e.g. transient DB error)
  mock.__push("order_notifications", "insert", {
    data: null,
    error: { code: "42P01", message: "relation does not exist" },
  });
  // readOrderAsDetail orders -> success
  mock.__push("orders", "select", { data: INSERTED_ORDER_ROW, error: null });
  // readOrderAsDetail order_items
  mock.__push("order_items", "select", { data: [], error: null });
  // readOrderAsDetail order_status_history
  mock.__push("order_status_history", "select", { data: [], error: null });

  const result = await placeOrder(goodInput());
  assert.equal(
    result.kind,
    "ok",
    "an outbox insert failure must NOT roll back the order",
  );
  if (result.kind !== "ok") return;
  assert.equal(result.order.id, INSERTED_ORDER_ROW.id);
});

test("rebuildNotificationForOrder inserts a row when the order has no outbox entry", async () => {
  setStoreEmail("owner@monoform.example.com");
  __setCurrentUserForTesting(ADMIN_USER);
  mock = createMockSupabaseClient({
    user: ADMIN_USER,
    allowlist: [{ user_id: ADMIN_USER.id }],
  });
  __setServiceClientForTesting(mock);
  // requireAdmin -> allowlist hit
  mock.__push("admin_allowlist", "select", {
    data: { user_id: ADMIN_USER.id },
    error: null,
  });
  // rebuild: order exists
  mock.__push("orders", "select", { data: { id: INSERTED_ORDER_ROW.id }, error: null });
  // rebuild: existing notification lookup -> none
  mock.__push("order_notifications", "select", { data: null, error: null });
  // rebuild: insert the new outbox row
  const NEW_NOTIF_ID = "7c0b4f5e-1111-4222-8333-444444444444";
  mock.__push("order_notifications", "insert", {
    data: {
      id: NEW_NOTIF_ID,
      status: "pending",
      recipient: "owner@monoform.example.com",
      attempt_count: 0,
      last_attempted_at: null,
      last_error: null,
      sent_at: null,
    },
    error: null,
  });
  // dispatchNewOrderNotification -> fetches the order + items +
  // timeline. Resend is unconfigured in this test env, so the
  // dispatch will record an attempt and return ok with status
  // pending.
  mock.__push("order_notifications", "select", {
    data: {
      id: NEW_NOTIF_ID,
      status: "pending",
      recipient: "owner@monoform.example.com",
      notification_type: "new_order_owner",
      order_id: INSERTED_ORDER_ROW.id,
    },
    error: null,
  });
  mock.__push("orders", "select", { data: INSERTED_ORDER_ROW, error: null });
  mock.__push("order_items", "select", { data: [], error: null });
  mock.__push("order_status_history", "select", { data: [], error: null });
  // dispatch bumps last_attempted_at via update
  mock.__push("order_notifications", "update", { data: null, error: null });

  const result = await rebuildNotificationForOrder(INSERTED_ORDER_ROW.id);
  assert.ok(
    result.kind === "ok" || result.kind === "already_queued",
    `rebuild must return ok or already_queued, got ${result.kind}`,
  );
  // The rebuild must have created exactly one outbox row.
  const notifInserts = mock
    .__getCalls()
    .filter((c) => c.table === "order_notifications" && c.op === "insert");
  assert.equal(
    notifInserts.length,
    1,
    "rebuild must create exactly one outbox row when none exists",
  );
  assert.equal(notifInserts[0].payload[0].recipient, "owner@monoform.example.com");
});

test("rebuildNotificationForOrder returns already_queued when an outbox row already exists", async () => {
  setStoreEmail("owner@monoform.example.com");
  __setCurrentUserForTesting(ADMIN_USER);
  mock = createMockSupabaseClient({
    user: ADMIN_USER,
    allowlist: [{ user_id: ADMIN_USER.id }],
  });
  __setServiceClientForTesting(mock);
  // requireAdmin -> allowlist hit
  mock.__push("admin_allowlist", "select", {
    data: { user_id: ADMIN_USER.id },
    error: null,
  });
  // rebuild: order exists
  mock.__push("orders", "select", { data: { id: INSERTED_ORDER_ROW.id }, error: null });
  // rebuild: existing notification lookup -> HIT
  const EXISTING_NOTIF_ID = "7c0b4f5e-1111-4222-8333-555555555555";
  mock.__push("order_notifications", "select", {
    data: {
      id: EXISTING_NOTIF_ID,
      status: "pending",
      recipient: "owner@monoform.example.com",
      attempt_count: 0,
      last_attempted_at: null,
      last_error: null,
      sent_at: null,
    },
    error: null,
  });

  const result = await rebuildNotificationForOrder(INSERTED_ORDER_ROW.id);
  assert.equal(
    result.kind,
    "already_queued",
    "a duplicate rebuild must NOT create a second outbox row",
  );
  if (result.kind !== "already_queued") return;
  assert.equal(result.notification.id, EXISTING_NOTIF_ID);
  // No insert must have been issued by the rebuild path.
  const notifInserts = mock
    .__getCalls()
    .filter((c) => c.table === "order_notifications" && c.op === "insert");
  assert.equal(
    notifInserts.length,
    0,
    "rebuild must not insert when an outbox row already exists",
  );
});

test("rebuildNotificationForOrder returns not_found for a non-existent order id", async () => {
  setStoreEmail("owner@monoform.example.com");
  __setCurrentUserForTesting(ADMIN_USER);
  mock = createMockSupabaseClient({
    user: ADMIN_USER,
    allowlist: [{ user_id: ADMIN_USER.id }],
  });
  __setServiceClientForTesting(mock);
  // requireAdmin -> allowlist hit
  mock.__push("admin_allowlist", "select", {
    data: { user_id: ADMIN_USER.id },
    error: null,
  });
  // rebuild: order does NOT exist
  mock.__push("orders", "select", { data: null, error: null });

  const result = await rebuildNotificationForOrder("99999999-9999-4999-8999-999999999999");
  assert.equal(result.kind, "not_found");
});

test("rebuildNotificationForOrder refuses a non-allowlisted caller", async () => {
  setStoreEmail("owner@monoform.example.com");
  __setCurrentUserForTesting(TEST_USER); // not on the allowlist
  mock = createMockSupabaseClient({
    user: TEST_USER,
    allowlist: [{ user_id: ADMIN_USER.id }],
  });
  __setServiceClientForTesting(mock);
  // requireAdmin -> allowlist miss
  mock.__push("admin_allowlist", "select", { data: null, error: null });

  const result = await rebuildNotificationForOrder(INSERTED_ORDER_ROW.id);
  assert.equal(result.kind, "forbidden");
});

test("the safe fallback recipient is the documented not-configured@local.invalid value", async () => {
  const recipientMod = await import(
    `@/lib/orders/recipient.ts?fresh=${Date.now()}`
  );
  assert.equal(
    recipientMod.UNCONFIGURED_NOTIFICATION_RECIPIENT,
    "not-configured@local.invalid",
  );
  // resolveNotificationRecipientForQueue returns the safe
  // fallback plus a non-null lastError when the env var is
  // missing. The exact value is what the outbox row will see
  // after the fix.
  const out = recipientMod.resolveNotificationRecipientForQueue(undefined);
  assert.equal(out.recipient, "not-configured@local.invalid");
  assert.equal(out.configured, false);
  assert.match(String(out.lastError ?? ""), /STORE_ORDER_NOTIFICATION_EMAIL/);
});
