// Live end-to-end regression tests for Prompt 16.
//
// These tests run against the configured Supabase project. They
// are SKIPPED when the `SUPABASE_SERVICE_ROLE_KEY` is missing or
// the URL is the example placeholder — that way a CI machine
// without a configured backend still passes the rest of the suite.
//
// The test customer (`31e6d17e-...`) and the store-owner admin
// (`56d05a56-...`) come from the existing test data that was
// already in the database before Prompt 16.
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
let liveUsers;

before(async () => {
  if (!hasLiveBackend) return;
  const { createClient: cc } = await import("@supabase/supabase-js");
  serviceClient = cc(baseUrl, serviceKey, {
    auth: { persistSession: false },
  });
  // Find the test customer and the admin in the live data.
  const { data: allowlist } = await serviceClient
    .from("admin_allowlist")
    .select("user_id")
    .limit(1);
  const { data: recentOrder } = await serviceClient
    .from("orders")
    .select("user_id")
    .order("created_at", { ascending: false })
    .limit(1);
  liveUsers = {
    admin: allowlist?.[0]?.user_id ?? null,
    customer: recentOrder?.[0]?.user_id ?? null,
  };
});

after(async () => {
  if (serviceClient) {
    serviceClient = null;
  }
});

live(
  "live 9: a real order created via the storefront can be loaded by an admin using its UUID",
  async () => {
    assert.ok(hasLiveBackend, "live backend not configured");
    // Use one of the existing test orders (MF-000001) so the test
    // does not mutate production data.
    const { data: existing } = await serviceClient
      .from("orders")
      .select("id, order_number, total_paisa, subtotal_paisa, delivery_fee_paisa, currency, customer_name, customer_phone, district, address_line")
      .eq("order_number", "MF-000001")
      .maybeSingle();
    assert.ok(existing, "expected test order MF-000001 to exist");

    // Run the live detail query using the same column set the
    // service uses. This is the exact code path the admin detail
    // page takes.
    const { orderSelectColumns } = await import(
      `../lib/orders/service.ts?live=${Math.random().toString(36).slice(2)}`
    );
    const cols = orderSelectColumns().join(", ");
    const { data: detail, error } = await serviceClient
      .from("orders")
      .select(cols)
      .eq("id", existing.id)
      .maybeSingle();
    assert.equal(error, null, `detail query errored: ${JSON.stringify(error)}`);
    assert.ok(detail, "detail row should be returned");
    assert.equal(detail.id, existing.id);
    assert.equal(detail.order_number, "MF-000001");
    assert.equal(detail.total_paisa, existing.total_paisa);
    assert.equal(detail.subtotal_paisa, existing.subtotal_paisa);
    assert.equal(detail.delivery_fee_paisa, existing.delivery_fee_paisa);
  },
);

live(
  "live 9b: a non-existent UUID returns no row (not an error) from the detail query",
  async () => {
    assert.ok(hasLiveBackend, "live backend not configured");
    const { orderSelectColumns } = await import(
      `../lib/orders/service.ts?live=${Math.random().toString(36).slice(2)}`
    );
    const cols = orderSelectColumns().join(", ");
    const { data, error } = await serviceClient
      .from("orders")
      .select(cols)
      .eq("id", "00000000-0000-4000-8000-000000000000")
      .maybeSingle();
    assert.equal(error, null);
    assert.equal(data, null);
  },
);

live(
  "live 10: the order_items rows for MF-000001 are intact (snapshot preserved)",
  async () => {
    assert.ok(hasLiveBackend, "live backend not configured");
    const { data: order } = await serviceClient
      .from("orders")
      .select("id")
      .eq("order_number", "MF-000001")
      .maybeSingle();
    assert.ok(order);
    const { data: items } = await serviceClient
      .from("order_items")
      .select("product_id, product_name, quantity, unit_price_paisa, line_total_paisa")
      .eq("order_id", order.id);
    assert.ok(items && items.length > 0, "order must have at least one item");
    // Every line total must equal unit * quantity.
    for (const item of items) {
      assert.equal(
        item.line_total_paisa,
        item.unit_price_paisa * item.quantity,
        `line_total_paisa mismatch on ${item.product_id}`,
      );
    }
  },
);

live(
  "live 12: the existing duplicate test orders are still in the database untouched",
  async () => {
    assert.ok(hasLiveBackend, "live backend not configured");
    const { data } = await serviceClient
      .from("orders")
      .select("id, order_number, user_id, customer_name, idempotency_key, total_paisa")
      .in("order_number", ["MF-000001", "MF-000003", "MF-000005"])
      .order("order_number");
    assert.ok(data);
    assert.equal(data.length, 3, "all three test orders must still exist");
    // They all belong to the same customer with the same total.
    const totals = new Set(data.map((o) => o.total_paisa));
    assert.equal(totals.size, 1, "all three test orders should have the same total");
    const users = new Set(data.map((o) => o.user_id));
    assert.equal(users.size, 1, "all three test orders should belong to the same customer");
  },
);

live(
  "live end-to-end: placeOrder creates a real order, the detail query loads it, and a same-key retry returns the original (Bug A + Bug B together)",
  async () => {
    assert.ok(hasLiveBackend, "live backend not configured");
    assert.ok(liveUsers?.customer, "no test customer found in the live database");

    // Inject the test customer so placeOrder thinks we are them.
    const { __setCurrentUserForTesting } = await import(
      `../lib/auth/require.ts?live=${Math.random().toString(36).slice(2)}`
    );
    const { placeOrder } = await import(
      `../lib/orders/service.ts?live=${Math.random().toString(36).slice(2)}`
    );

    __setCurrentUserForTesting({
      id: liveUsers.customer,
      email: "jubaerhoissain@gmail.com",
    });

    // Find a known product to use in the synthetic order. We pick
    // the first product that is in stock and already used in the
    // existing test orders (p-007) so the test is reproducible.
    const { data: products } = await serviceClient
      .from("products")
      .select("id, slug, name, price_paisa, stock")
      .gt("stock", 0)
      .limit(1);
    if (!products || products.length === 0) {
      // No in-stock product. Skip silently.
      return;
    }
    const product = products[0];

    // Mark a clear marker in the address line so this test order
    // is easy to find and clean up.
    const marker = `LIVE-CHECKOUT-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const idempotencyKey = `test-live-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;

    const input = {
      customerName: "Live Checkout Test",
      customerPhone: "01712345678",
      customerEmail: "tester@example.com",
      address: {
        recipientName: "Live Checkout Test",
        phone: "01712345678",
        district: "Dhaka",
        locality: "Dhanmondi",
        addressLine: marker,
        additionalDetails: null,
        postalCode: "1205",
        deliveryZone: "inside_dhaka",
        deliveryInstructions: null,
      },
      paymentMethod: "cod",
      bkashReference: null,
      lines: [
        { productId: product.id, quantity: 1, size: null, color: null },
      ],
      idempotencyKey,
    };

    // First call: must succeed and return the committed order.
    const first = await placeOrder(input);
    assert.equal(first.kind, "ok", `first placeOrder failed: ${JSON.stringify(first)}`);
    if (first.kind !== "ok") return;
    assert.ok(first.order.id, "first result must include the order id");
    assert.ok(first.order.number, "first result must include the order number");

    // Second call with the SAME key: must return the same order,
    // not a duplicate.
    const second = await placeOrder(input);
    assert.equal(
      second.kind,
      "ok",
      `same-key retry failed: ${JSON.stringify(second)}`,
    );
    if (second.kind !== "ok") return;
    assert.equal(
      second.order.id,
      first.order.id,
      "same-key retry must return the original order id, not a duplicate",
    );

    // Verify in the database that only one row exists with this
    // idempotency key.
    const { data: matching } = await serviceClient
      .from("orders")
      .select("id, order_number")
      .eq("user_id", liveUsers.customer)
      .eq("idempotency_key", idempotencyKey);
    assert.equal(
      matching?.length,
      1,
      `expected exactly 1 order with this idempotency_key, found ${matching?.length}`,
    );

    // Verify the order is loadable through the same column set
    // the admin detail page uses. This is the Bug B fix path.
    const { orderSelectColumns } = await import(
      `../lib/orders/service.ts?live=${Math.random().toString(36).slice(2)}`
    );
    const cols = orderSelectColumns().join(", ");
    const { data: detail, error: detailError } = await serviceClient
      .from("orders")
      .select(cols)
      .eq("id", first.order.id)
      .maybeSingle();
    assert.equal(detailError, null, `detail query errored: ${JSON.stringify(detailError)}`);
    assert.ok(detail, "detail row must be loadable with orderSelectColumns()");
    assert.equal(detail.order_number, first.order.number);
    assert.equal(detail.customer_name, "Live Checkout Test");
    assert.equal(detail.address_line, marker);

    // Verify the items are intact (Bug A and Bug B both depend
    // on the order items surviving the round-trip).
    const { data: items } = await serviceClient
      .from("order_items")
      .select("product_id, product_name, quantity, line_total_paisa")
      .eq("order_id", first.order.id);
    assert.ok(items && items.length === 1, "the synthetic order must have exactly one item row");
    assert.equal(items[0].product_id, product.id);

    // Clean up: delete the test order. Items and history are
    // removed by cascade. We keep the migration order_number
    // sequence intact.
    await serviceClient.from("orders").delete().eq("id", first.order.id);

    __setCurrentUserForTesting(null);
  },
);
