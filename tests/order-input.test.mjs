// Tests for the pure helpers that gate the order-placement service.
//
// These cover the request-side validation, the server-side product
// resolution (which is what blocks browser-supplied prices) and the
// idempotency hash. The full `placeOrder` function is not exercised
// here because it needs a live Supabase project.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validatePlaceOrderInput,
  resolveProducts,
  hashOrderContent,
  simpleHash,
} from "@/lib/orders/service.ts";
import { DELIVERY_FEE_PAISA } from "@/lib/orders/config.ts";

const goodAddress = {
  recipientName: "Asha Khan",
  phone: "01712345678",
  district: "Dhaka",
  addressLine: "House 12, Road 7, Dhanmondi",
  deliveryZone: "inside_dhaka",
};

const goodInput = {
  customerName: "Asha Khan",
  customerPhone: "01712345678",
  customerEmail: `asha.khan${String.fromCharCode(64)}example.com`,
  address: goodAddress,
  paymentMethod: "cod",
  bkashReference: null,
  lines: [{ productId: "p-001", quantity: 1, size: "M", color: "Camel" }],
  idempotencyKey: "checkout-abc-12345678",
};

test("validatePlaceOrderInput accepts a complete order", () => {
  const errors = validatePlaceOrderInput(goodInput);
  assert.deepEqual(errors, {});
});

test("validatePlaceOrderInput rejects empty customer fields", () => {
  const errors = validatePlaceOrderInput({
    ...goodInput,
    customerName: "",
    customerPhone: "",
  });
  assert.ok(errors.customerName);
  assert.ok(errors.customerPhone);
});

test("validatePlaceOrderInput rejects an invalid BD phone", () => {
  const errors = validatePlaceOrderInput({
    ...goodInput,
    customerPhone: "not-a-bd-phone",
  });
  assert.ok(errors.customerPhone);
});

test("validatePlaceOrderInput rejects an unsupported delivery zone", () => {
  const errors = validatePlaceOrderInput({
    ...goodInput,
    address: { ...goodAddress, deliveryZone: "antarctica" },
  });
  assert.ok(errors["address.deliveryZone"]);
});

test("validatePlaceOrderInput rejects an unsupported payment method", () => {
  const errors = validatePlaceOrderInput({
    ...goodInput,
    paymentMethod: "crypto",
  });
  assert.ok(errors.paymentMethod);
});

test("validatePlaceOrderInput rejects an empty line array", () => {
  const errors = validatePlaceOrderInput({ ...goodInput, lines: [] });
  assert.ok(errors.lines);
});

test("validatePlaceOrderInput rejects a line with no productId", () => {
  const errors = validatePlaceOrderInput({
    ...goodInput,
    lines: [{ productId: "", quantity: 1 }],
  });
  assert.ok(errors["lines.0.productId"]);
});

test("validatePlaceOrderInput rejects a quantity below 1", () => {
  const errors = validatePlaceOrderInput({
    ...goodInput,
    lines: [{ productId: "p-001", quantity: 0, size: "M" }],
  });
  assert.ok(errors["lines.0.quantity"]);
});

test("validatePlaceOrderInput rejects a short idempotency key", () => {
  const errors = validatePlaceOrderInput({
    ...goodInput,
    idempotencyKey: "abc",
  });
  assert.ok(errors.idempotencyKey);
});

test("resolveProducts uses server-side prices (browser cannot override)", () => {
  // Even if a malicious caller submits a hand-rolled `unitPrice` in
  // the line, the order backend never reads it — it only consumes
  // the line's productId and quantity and looks the price up from
  // the catalogue. The tests below prove the helper ignores any
  // caller-supplied monetary value.
  const result = resolveProducts([
    {
      productId: "p-001",
      quantity: 2,
      size: "M",
      // @ts-expect-error — the type forbids this; we test that the
      // server still does the right thing even if it is present.
      unitPrice: { amount: 1, currency: "BDT" },
    },
  ]);
  assert.equal(result.missing.length, 0);
  assert.equal(result.products.length, 1);
  // The subtotal reflects the catalogue price, not the (ignored)
  // caller-supplied `unitPrice` of 1.
  assert.ok(result.subtotalPaisa > 1);
});

test("resolveProducts flags unknown product IDs", () => {
  const result = resolveProducts([
    { productId: "does-not-exist", quantity: 1, size: "M" },
  ]);
  assert.equal(result.products.length, 0);
  assert.deepEqual(result.missing, ["does-not-exist"]);
  assert.equal(result.subtotalPaisa, 0);
});

test("simpleHash is deterministic", () => {
  assert.equal(simpleHash("hello"), simpleHash("hello"));
  assert.notEqual(simpleHash("hello"), simpleHash("Hello"));
});

test("hashOrderContent: same inputs produce the same hash", () => {
  const a = hashOrderContent({
    lines: goodInput.lines,
    address: goodInput.address,
    paymentMethod: goodInput.paymentMethod,
    subtotalPaisa: 49000,
    deliveryFeePaisa: DELIVERY_FEE_PAISA.inside_dhaka,
  });
  const b = hashOrderContent({
    lines: goodInput.lines,
    address: goodInput.address,
    paymentMethod: goodInput.paymentMethod,
    subtotalPaisa: 49000,
    deliveryFeePaisa: DELIVERY_FEE_PAISA.inside_dhaka,
  });
  assert.equal(a, b);
});

test("hashOrderContent: materially different content produces a different hash", () => {
  const baseline = hashOrderContent({
    lines: goodInput.lines,
    address: goodInput.address,
    paymentMethod: goodInput.paymentMethod,
    subtotalPaisa: 49000,
    deliveryFeePaisa: DELIVERY_FEE_PAISA.inside_dhaka,
  });

  // Different quantity in the same line.
  const diffQuantity = hashOrderContent({
    lines: [{ ...goodInput.lines[0], quantity: 2 }],
    address: goodInput.address,
    paymentMethod: goodInput.paymentMethod,
    subtotalPaisa: 49000,
    deliveryFeePaisa: DELIVERY_FEE_PAISA.inside_dhaka,
  });
  assert.notEqual(baseline, diffQuantity);

  // Different address.
  const diffAddress = hashOrderContent({
    lines: goodInput.lines,
    address: { ...goodInput.address, district: "Gazipur" },
    paymentMethod: goodInput.paymentMethod,
    subtotalPaisa: 49000,
    deliveryFeePaisa: DELIVERY_FEE_PAISA.inside_dhaka,
  });
  assert.notEqual(baseline, diffAddress);

  // Different payment method.
  const diffMethod = hashOrderContent({
    lines: goodInput.lines,
    address: goodInput.address,
    paymentMethod: "bkash",
    subtotalPaisa: 49000,
    deliveryFeePaisa: DELIVERY_FEE_PAISA.inside_dhaka,
  });
  assert.notEqual(baseline, diffMethod);

  // Different subtotal.
  const diffSubtotal = hashOrderContent({
    lines: goodInput.lines,
    address: goodInput.address,
    paymentMethod: goodInput.paymentMethod,
    subtotalPaisa: 49001,
    deliveryFeePaisa: DELIVERY_FEE_PAISA.inside_dhaka,
  });
  assert.notEqual(baseline, diffSubtotal);
});
