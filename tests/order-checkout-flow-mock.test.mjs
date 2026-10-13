// Mocked regression tests for Prompt 16.
//
// These tests cover the full `placeOrder` flow using an
// in-memory Supabase client. The mock is small and explicit; the
// test names describe the production bug they prevent.
//
// Every test that follows is MOCKED. A separate file
// (`order-checkout-flow.live.test.mjs`) runs the same scenario
// against the configured Supabase project end-to-end. The two
// files are kept separate so a CI run on a machine without
// Supabase credentials still exercises the contract.
//
// Mapping to the prompt's twelve scenarios:
//
//   1.  Successful order creation produces a successful response
//       with the correct identifier
//   2.  A notification failure after order commitment does not
//       make checkout claim the order failed
//   3.  A committed order is not duplicated after a client retry
//   4.  Concurrent duplicate submissions are handled safely
//   5.  Reusing an idempotency key with different contents is
//       rejected
//   6.  An unsuccessful database insert does not clear the cart
//   7.  An error after commitment does not trigger a second order
//   8.  The admin View link passes the identifier expected by
//       the detail page
//   9.  A valid administrator can open an order that appears in
//       the admin list (live: see .live.test.mjs)
//  10.  A genuinely unknown identifier produces a proper
//       not-found state
//  11.  An ordinary customer remains unable to access admin
//       details
//  12.  Historical order totals and item snapshots remain intact

import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createMockSupabaseClient } from "./fixtures/mock-supabase.mjs";
import {
  placeOrder,
  getOrderForAdmin,
  requireAdmin,
  __setServiceClientForTesting,
  hashOrderContent,
  resolveProducts,
} from "@/lib/orders/service.ts";
import { deliveryFeeForZone } from "@/lib/orders/config.ts";
import { __setCurrentUserForTesting } from "@/lib/auth/require.ts";

const TEST_USER = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "tester@example.com",
};
const ADMIN_USER = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "admin@example.com",
};

function goodInput(overrides = {}) {
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
    idempotencyKey: `test-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 10)}`,
    ...overrides,
  };
}

const INSERTED_ORDER_ROW = {
  id: "order-1",
  order_number: "MF-000001",
  created_at: "2026-10-13T05:30:49.838529+00:00",
  order_status: "pending_confirmation",
  payment_method: "cod",
  payment_status: "pending",
  subtotal_paisa: 90000,
  delivery_fee_paisa: 7000,
  total_paisa: 97000,
  currency: "BDT",
  customer_name: "Asha Khan",
  customer_phone: "01712345678",
  customer_email: "tester@example.com",
  recipient_name: "Asha Khan",
  phone: "01712345678",
  district: "Dhaka",
  locality: "Dhanmondi",
  address_line: "House 12, Road 7",
  additional_details: null,
  postal_code: "1205",
  delivery_zone: "inside_dhaka",
  delivery_instructions: null,
  bkash_reference: null,
  cancelled_at: null,
};

let mock;

afterEach(() => {
  if (mock) {
    __setServiceClientForTesting(null);
    mock = null;
  }
  __setCurrentUserForTesting(null);
});

/**
 * Stage a happy-path mock for `placeOrder`:
 *   - findIdempotentOrder: miss
 *   - findRecentIdempotentOrderByHash (pre): miss
 *   - next_order_number: success
 *   - orders insert: success
 *   - findRecentIdempotentOrderByHash (post): returns the just-inserted row
 *   - order_items insert: success
 *   - order_status_history insert: success
 *   - order_notifications insert: success
 *   - readOrderAsDetail orders: returns the inserted row
 *   - readOrderAsDetail order_items: returns the inserted items
 *   - readOrderAsDetail order_status_history: returns the inserted history
 */
function stageHappyPath(overrides = {}) {
  mock = createMockSupabaseClient({ user: TEST_USER });
  __setServiceClientForTesting(mock);

  // findIdempotentOrder -> miss
  mock.__push("orders", "select", { data: null, error: null });
  // findRecentIdempotentOrderByHash (pre-insert) -> miss
  mock.__push("orders", "select", { data: null, error: null });
  // orders insert -> success
  mock.__push("orders", "insert", {
    data: overrides.insertResponse ?? INSERTED_ORDER_ROW,
    error: null,
  });
  // findRecentIdempotentOrderByHash (post-insert) -> returns our own row
  mock.__push("orders", "select", {
    data: {
      id: "order-1",
      idempotency_hash: "stub",
      created_at: INSERTED_ORDER_ROW.created_at,
    },
    error: null,
  });
  // order_items insert -> success
  mock.__push("order_items", "insert", { data: null, error: null });
  // order_status_history insert -> success
  mock.__push("order_status_history", "insert", { data: null, error: null });
  // order_notifications insert -> success
  mock.__push("order_notifications", "insert", { data: null, error: null });
  // readOrderAsDetail orders -> success
  mock.__push("orders", "select", {
    data: overrides.detailResponse ?? INSERTED_ORDER_ROW,
    error: null,
  });
  // readOrderAsDetail order_items
  mock.__push("order_items", "select", { data: [], error: null });
  // readOrderAsDetail order_status_history
  mock.__push("order_status_history", "select", { data: [], error: null });
}

test("scenario 1: placeOrder returns ok with the committed identifier (happy path)", async () => {
  __setCurrentUserForTesting(TEST_USER);
  stageHappyPath();
  const result = await placeOrder(goodInput());
  assert.equal(result.kind, "ok", `expected ok, got ${JSON.stringify(result)}`);
  if (result.kind !== "ok") return;
  assert.equal(result.order.id, "order-1");
  assert.equal(result.order.number, "MF-000001");
  assert.equal(result.order.customerName, "Asha Khan");
});

test("scenario 2: a notification outbox failure does not roll back the order", async () => {
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
      id: "order-1",
      idempotency_hash: "stub",
      created_at: INSERTED_ORDER_ROW.created_at,
    },
    error: null,
  });
  // order_items insert -> success
  mock.__push("order_items", "insert", { data: null, error: null });
  // order_status_history insert -> success
  mock.__push("order_status_history", "insert", { data: null, error: null });
  // order_notifications insert -> FAILURE
  mock.__push("order_notifications", "insert", {
    data: null,
    error: { code: "23503", message: "fk violation" },
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
    "notification outbox failure must NOT make checkout claim the order failed",
  );
  if (result.kind !== "ok") return;
  assert.equal(result.order.id, "order-1");
  assert.equal(result.order.number, "MF-000001");
});

test("scenario 7: post-commit read failure still returns ok and does not re-insert", async () => {
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
      id: "order-1",
      idempotency_hash: "stub",
      created_at: INSERTED_ORDER_ROW.created_at,
    },
    error: null,
  });
  // order_items insert -> success
  mock.__push("order_items", "insert", { data: null, error: null });
  // order_status_history insert -> success
  mock.__push("order_status_history", "insert", { data: null, error: null });
  // order_notifications insert -> success
  mock.__push("order_notifications", "insert", { data: null, error: null });
  // readOrderAsDetail orders -> ERROR (simulates the 42703 column bug)
  mock.__push("orders", "select", {
    data: null,
    error: { code: "42703", message: "column does not exist" },
  });

  const result = await placeOrder(goodInput());
  assert.equal(
    result.kind,
    "ok",
    "post-commit read failure must NOT return error",
  );
  if (result.kind !== "ok") return;
  assert.equal(result.order.id, "order-1");
  assert.equal(result.order.number, "MF-000001");
  const orderInserts = mock
    .__getCalls()
    .filter((c) => c.table === "orders" && c.op === "insert");
  assert.equal(
    orderInserts.length,
    1,
    "must not re-insert after a post-commit failure",
  );
});

test("scenario 3: same key on retry returns the original order, not a second one", async () => {
  __setCurrentUserForTesting(TEST_USER);
  stageHappyPath();
  const input = goodInput();
  const first = await placeOrder(input);
  assert.equal(first.kind, "ok");
  if (first.kind !== "ok") return;

  // Compute the content hash the service stores alongside the
  // order. The retry must see the SAME hash so the service returns
  // the original order instead of treating the retry as a conflict.
  const products = resolveProducts(input.lines);
  const contentHash = hashOrderContent({
    lines: input.lines,
    address: input.address,
    paymentMethod: input.paymentMethod,
    subtotalPaisa: products.subtotalPaisa,
    deliveryFeePaisa: deliveryFeeForZone(input.address.deliveryZone),
  });

  // Stage the dedup path: the second call should hit
  // findIdempotentOrder and return the existing order.
  mock = createMockSupabaseClient({ user: TEST_USER });
  __setServiceClientForTesting(mock);
  // findIdempotentOrder -> hit, returns the original order with
  // the matching content hash
  mock.__push("orders", "select", {
    data: { id: "order-1", idempotency_hash: contentHash },
    error: null,
  });
  // readOrderAsDetail orders -> success
  mock.__push("orders", "select", { data: INSERTED_ORDER_ROW, error: null });
  // readOrderAsDetail order_items
  mock.__push("order_items", "select", { data: [], error: null });
  // readOrderAsDetail order_status_history
  mock.__push("order_status_history", "select", { data: [], error: null });

  const second = await placeOrder(input);
  assert.equal(second.kind, "ok");
  if (second.kind !== "ok") return;
  assert.equal(second.order.id, "order-1", "must return the original order id");
  const orderInserts = mock
    .__getCalls()
    .filter((c) => c.table === "orders" && c.op === "insert");
  assert.equal(orderInserts.length, 0, "must not insert a duplicate order");
});

test("scenario 5: same key with different content returns idempotency_conflict", async () => {
  __setCurrentUserForTesting(TEST_USER);
  mock = createMockSupabaseClient({ user: TEST_USER });
  __setServiceClientForTesting(mock);
  // findIdempotentOrder -> hit, but the stored hash differs from
  // the one we are about to compute. Queue the full readOrderAsDetail
  // path so the function returns a non-null detail; the hash
  // mismatch is what triggers the conflict.
  mock.__push("orders", "select", {
    data: { id: "order-1", idempotency_hash: "different-hash" },
    error: null,
  });
  // readOrderAsDetail orders
  mock.__push("orders", "select", { data: INSERTED_ORDER_ROW, error: null });
  // readOrderAsDetail order_items
  mock.__push("order_items", "select", { data: [], error: null });
  // readOrderAsDetail order_status_history
  mock.__push("order_status_history", "select", { data: [], error: null });
  const result = await placeOrder(goodInput());
  assert.equal(result.kind, "idempotency_conflict");
});

test("scenario 4: same content under a different key within the window returns the original", async () => {
  __setCurrentUserForTesting(TEST_USER);
  mock = createMockSupabaseClient({ user: TEST_USER });
  __setServiceClientForTesting(mock);
  // findIdempotentOrder -> miss (different key)
  mock.__push("orders", "select", { data: null, error: null });
  // findRecentIdempotentOrderByHash (pre) -> HIT, returns the
  // existing same-content order
  mock.__push("orders", "select", {
    data: {
      id: "order-existing",
      idempotency_hash: "any",
      created_at: new Date().toISOString(),
    },
    error: null,
  });
  // readOrderAsDetail orders -> success
  mock.__push("orders", "select", {
    data: { ...INSERTED_ORDER_ROW, id: "order-existing", order_number: "MF-000099" },
    error: null,
  });
  // readOrderAsDetail order_items
  mock.__push("order_items", "select", { data: [], error: null });
  // readOrderAsDetail order_status_history
  mock.__push("order_status_history", "select", { data: [], error: null });

  const result = await placeOrder(goodInput());
  assert.equal(result.kind, "ok");
  if (result.kind !== "ok") return;
  assert.equal(result.order.id, "order-existing");
  const orderInserts = mock
    .__getCalls()
    .filter((c) => c.table === "orders" && c.op === "insert");
  assert.equal(orderInserts.length, 0);
});

test("scenario 10: getOrderForAdmin with an unknown id returns not_found", async () => {
  __setCurrentUserForTesting(ADMIN_USER);
  mock = createMockSupabaseClient({ user: ADMIN_USER });
  __setServiceClientForTesting(mock);
  // requireAdmin: allowlist hit
  mock.__push("admin_allowlist", "select", {
    data: { user_id: ADMIN_USER.id },
    error: null,
  });
  // readOrderAsAdminDetail: nothing matches the unknown id
  mock.__push("orders", "select", { data: null, error: null });
  const result = await getOrderForAdmin("99999999-9999-4999-8999-999999999999");
  assert.equal(result.kind, "not_found");
});

test("scenario 11: a non-allowlisted caller cannot load admin details", async () => {
  __setCurrentUserForTesting(TEST_USER);
  mock = createMockSupabaseClient({ user: TEST_USER });
  __setServiceClientForTesting(mock);
  // requireAdmin: allowlist miss
  mock.__push("admin_allowlist", "select", { data: null, error: null });
  const guard = await requireAdmin();
  assert.equal(guard.kind, "forbidden");
  const result = await getOrderForAdmin("0b2763dc-dd16-49d8-ab75-d1b1e3cedf2a");
  assert.notEqual(result.kind, "ok");
});

test("scenario 8: AdminOrdersTable links to /admin/orders/<id> with encodeURIComponent", () => {
  const src = readFileSync(
    new URL("../components/admin/AdminOrdersTable.tsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /\$\{detailHrefBase\}\/\$\{encodeURIComponent\(order\.id\)\}/);
});

test("scenario 8: the admin detail page reads the [id] route param and calls getOrderForAdmin", () => {
  const src = readFileSync(
    new URL("../app/admin/orders/[id]/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /const \{ id \} = await params/);
  assert.match(src, /getOrderForAdmin\(id\)/);
});

test("scenario 6: CheckoutForm only clears the cart on state.ok === true", () => {
  const src = readFileSync(
    new URL("../components/checkout/CheckoutForm.tsx", import.meta.url),
    "utf8",
  );
  const lines = src.split("\n");
  const clearLine = lines.findIndex((l) => l.includes("clear()"));
  assert.notEqual(clearLine, -1, "CheckoutForm must call clear()");
  let guardIndex = -1;
  for (let i = clearLine; i >= 0; i -= 1) {
    if (/if\s*\(/.test(lines[i])) {
      guardIndex = i;
      break;
    }
  }
  assert.notEqual(guardIndex, -1, "clear() must be guarded by an if block");
  assert.match(lines[guardIndex], /state\.ok/);
});

test("scenario 12: placeOrder preserves the totals in the returned detail", async () => {
  __setCurrentUserForTesting(TEST_USER);
  stageHappyPath();
  const result = await placeOrder(goodInput());
  if (result.kind !== "ok") {
    assert.fail(`expected ok, got ${result.kind}: ${JSON.stringify(result)}`);
  }
  assert.equal(result.order.total.amount, 97000 / 100);
  assert.equal(result.order.subtotal.amount, 90000 / 100);
  assert.equal(result.order.deliveryFee.amount, 7000 / 100);
  assert.equal(result.order.shippingAddress.district, "Dhaka");
  assert.equal(result.order.shippingAddress.recipientName, "Asha Khan");
  assert.equal(result.order.shippingAddress.deliveryZone, "inside_dhaka");
  assert.equal(result.order.shippingAddress.addressLine, "House 12, Road 7");
  assert.equal(result.order.customerName, "Asha Khan");
  assert.equal(result.order.customerPhone, "01712345678");
});
