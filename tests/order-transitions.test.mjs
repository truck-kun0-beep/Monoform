// Tests for the order state-machine guards.
//
// The transition graph is the single source of truth for which
// admin actions are legal. These tests pin the expected behaviour
// so a refactor cannot silently loosen it.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isValidOrderTransition,
  isValidPaymentTransition,
} from "@/lib/orders/service.ts";

test("isValidOrderTransition: self-transitions are rejected", () => {
  for (const s of [
    "pending_confirmation",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ]) {
    assert.equal(isValidOrderTransition(s, s), false, `${s} -> ${s}`);
  }
});

test("isValidOrderTransition: linear forward path is allowed", () => {
  const forward = [
    ["pending_confirmation", "confirmed"],
    ["confirmed", "processing"],
    ["processing", "shipped"],
    ["shipped", "delivered"],
  ];
  for (const [from, to] of forward) {
    assert.equal(isValidOrderTransition(from, to), true, `${from} -> ${to}`);
  }
});

test("isValidOrderTransition: one-step back correction is allowed", () => {
  const back = [
    ["confirmed", "pending_confirmation"],
    ["processing", "confirmed"],
    ["shipped", "processing"],
    ["delivered", "shipped"],
  ];
  for (const [from, to] of back) {
    assert.equal(isValidOrderTransition(from, to), true, `${from} -> ${to}`);
  }
});

test("isValidOrderTransition: jumps forward by more than one are rejected", () => {
  assert.equal(
    isValidOrderTransition("pending_confirmation", "shipped"),
    false,
  );
  assert.equal(
    isValidOrderTransition("confirmed", "delivered"),
    false,
  );
});

test("isValidOrderTransition: cancellation is allowed from any non-terminal state", () => {
  for (const from of [
    "pending_confirmation",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
  ]) {
    assert.equal(
      isValidOrderTransition(from, "cancelled"),
      true,
      `${from} -> cancelled`,
    );
  }
});

test("isValidOrderTransition: a cancelled order never leaves its state", () => {
  for (const to of [
    "pending_confirmation",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
  ]) {
    assert.equal(
      isValidOrderTransition("cancelled", to),
      false,
      `cancelled -> ${to}`,
    );
  }
  // Cancelling an already-cancelled order is a no-op (self-transition).
  assert.equal(isValidOrderTransition("cancelled", "cancelled"), false);
});

test("isValidPaymentTransition: COD can only enter cod-supported states", () => {
  assert.equal(isValidPaymentTransition("cod", "pending"), true);
  assert.equal(isValidPaymentTransition("cod", "paid"), true);
  assert.equal(isValidPaymentTransition("cod", "failed"), true);
  assert.equal(isValidPaymentTransition("cod", "refunded"), true);
  // bKash-only state is never reachable for COD.
  assert.equal(isValidPaymentTransition("cod", "awaiting_verification"), false);
});

test("isValidPaymentTransition: bKash starts in awaiting_verification", () => {
  assert.equal(isValidPaymentTransition("bkash", "awaiting_verification"), true);
  assert.equal(isValidPaymentTransition("bkash", "paid"), true);
  assert.equal(isValidPaymentTransition("bkash", "failed"), true);
  assert.equal(isValidPaymentTransition("bkash", "refunded"), true);
  // bKash orders do not use the COD "pending" state directly.
  assert.equal(isValidPaymentTransition("bkash", "pending"), false);
});
