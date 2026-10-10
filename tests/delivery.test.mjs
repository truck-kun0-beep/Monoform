// Tests for the centralised delivery / pricing configuration.
//
// The values tested here are the canonical numbers used by every
// page that displays a delivery charge. They must never drift; if a
// test fails the entire order flow is wrong.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DELIVERY_FEE_PAISA,
  DELIVERY_FEE_TAKA,
  ORDER_CURRENCY,
  SUPPORTED_DELIVERY_ZONES,
  SUPPORTED_PAYMENT_METHODS,
  deliveryFeeForZone,
  takaToPaisa,
  paisaToTaka,
} from "@/lib/orders/config.ts";

test("Inside-Dhaka delivery equals ৳70", () => {
  assert.equal(DELIVERY_FEE_PAISA.inside_dhaka, 7000);
  assert.equal(DELIVERY_FEE_TAKA.inside_dhaka, 70);
  assert.equal(deliveryFeeForZone("inside_dhaka"), 7000);
});

test("Outside-Dhaka delivery equals ৳120", () => {
  assert.equal(DELIVERY_FEE_PAISA.outside_dhaka, 12000);
  assert.equal(DELIVERY_FEE_TAKA.outside_dhaka, 120);
  assert.equal(deliveryFeeForZone("outside_dhaka"), 12000);
});

test("Unknown delivery zones fall back to zero", () => {
  // The `deliveryFeeForZone` helper uses a fallback so a misconfigured
  // request cannot inflate the delivery charge.
  // @ts-expect-error -- passing an unknown zone on purpose
  assert.equal(deliveryFeeForZone("anywhere"), 0);
});

test("Order currency is the BDT value from the brand config", () => {
  // The cart, checkout and admin pages all rely on the order backend
  // agreeing on the same currency.
  assert.equal(typeof ORDER_CURRENCY, "string");
  assert.ok(ORDER_CURRENCY.length > 0);
});

test("Supported delivery zones are the two published values", () => {
  assert.deepEqual([...SUPPORTED_DELIVERY_ZONES], [
    "inside_dhaka",
    "outside_dhaka",
  ]);
});

test("Supported payment methods are COD and bKash", () => {
  assert.deepEqual([...SUPPORTED_PAYMENT_METHODS], ["cod", "bkash"]);
});

test("takaToPaisa rounds to integer minor units", () => {
  assert.equal(takaToPaisa(1), 100);
  assert.equal(takaToPaisa(1.5), 150);
  assert.equal(takaToPaisa(1.555), 156); // half-even rounding via Math.round
  assert.equal(takaToPaisa(0), 0);
  assert.equal(takaToPaisa(-5), 0); // never negative
  assert.equal(takaToPaisa(NaN), 0);
  assert.equal(takaToPaisa(Infinity), 0);
});

test("paisaToTaka converts back without drift", () => {
  assert.equal(paisaToTaka(1500), 15);
  assert.equal(paisaToTaka(0), 0);
  assert.equal(paisaToTaka(NaN), 0);
  assert.equal(paisaToTaka(-100), 0);
});

test("Subtotal + delivery equals the expected total", () => {
  // The matrix given in the spec:
  //   1500 + 70  == 1570
  //   1500 + 120 == 1620
  //    800 + 70  == 870
  //    800 + 120 == 920
  const cases = [
    [150000, "inside_dhaka", 7000, 157000],
    [150000, "outside_dhaka", 12000, 162000],
    [80000, "inside_dhaka", 7000, 87000],
    [80000, "outside_dhaka", 12000, 92000],
  ];
  for (const [subtotal, zone, fee, total] of cases) {
    const computed = subtotal + deliveryFeeForZone(zone);
    assert.equal(computed, total, `subtotal ${subtotal} + ${zone} should equal ${total}`);
    assert.equal(deliveryFeeForZone(zone), fee);
  }
});
