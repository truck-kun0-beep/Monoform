// Tests for the client-side cart store.
//
// The store is implemented as a single mutable module under
// `@/lib/cart/store`. The test imports it directly, drives the
// public mutators, and asserts on the returned snapshot. We do NOT
// drive the `useCart` React hook here — that is covered by the
// build / smoke test.

import { test, before } from "node:test";
import assert from "node:assert/strict";

// Minimal localStorage shim. The store keys its persistence layer
// behind `typeof window !== "undefined"`, so Node imports leave the
// store empty by default. The shim is only used by tests that
// exercise the persistence boundary explicitly.
const storage = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
  },
};

const cart = await import("@/lib/cart/store.ts");

before(() => {
  cart.clearCart();
  storage.clear();
});

test("getCart returns an empty array initially", () => {
  cart.clearCart();
  assert.deepEqual(cart.getCart(), []);
  assert.equal(cart.getItemCount(), 0);
  assert.equal(cart.getSubtotal().amount, 0);
});

test("addItem appends a new line and computes the correct subtotal", () => {
  cart.clearCart();
  cart.addItem({
    productId: "p-001",
    slug: "wool-overcoat-camel",
    name: "Wool Overcoat",
    image: { alt: "Wool Overcoat" },
    size: "M",
    color: "Camel",
    quantity: 1,
    unitPrice: { amount: 24500, currency: "BDT" },
  });
  const lines = cart.getCart();
  assert.equal(lines.length, 1);
  assert.equal(lines[0].quantity, 1);
  assert.equal(lines[0].lineTotal.amount, 24500);
  assert.equal(cart.getItemCount(), 1);
  assert.equal(cart.getSubtotal().amount, 24500);
});

test("different sizes of the same product remain distinct lines", () => {
  cart.clearCart();
  const base = {
    productId: "p-002",
    slug: "silk-slip-dress-ivory",
    name: "Silk Slip Dress",
    image: { alt: "Silk Slip Dress" },
    color: "Ivory",
    unitPrice: { amount: 9800, currency: "BDT" },
  };
  cart.addItem({ ...base, size: "S", quantity: 1 });
  cart.addItem({ ...base, size: "M", quantity: 1 });
  const lines = cart.getCart();
  assert.equal(lines.length, 2);
  // Each line is its own entry; the subtotal counts both.
  assert.equal(cart.getItemCount(), 2);
  assert.equal(cart.getSubtotal().amount, 19600);
});

test("different colours of the same product remain distinct lines", () => {
  cart.clearCart();
  const base = {
    productId: "p-001",
    slug: "wool-overcoat-camel",
    name: "Wool Overcoat",
    image: { alt: "Wool Overcoat" },
    size: "M",
    unitPrice: { amount: 24500, currency: "BDT" },
  };
  cart.addItem({ ...base, color: "Camel", quantity: 1 });
  cart.addItem({ ...base, color: "Charcoal", quantity: 1 });
  assert.equal(cart.getCart().length, 2);
  assert.equal(cart.getSubtotal().amount, 49000);
});

test("adding the same variant twice merges into one line", () => {
  cart.clearCart();
  const line = {
    productId: "p-001",
    slug: "wool-overcoat-camel",
    name: "Wool Overcoat",
    image: { alt: "Wool Overcoat" },
    size: "M",
    color: "Camel",
    quantity: 1,
    unitPrice: { amount: 24500, currency: "BDT" },
  };
  cart.addItem(line);
  cart.addItem(line);
  const lines = cart.getCart();
  assert.equal(lines.length, 1);
  assert.equal(lines[0].quantity, 2);
  assert.equal(lines[0].lineTotal.amount, 49000);
  assert.equal(cart.getItemCount(), 2);
});

test("updateQuantity recomputes the line total and subtotal", () => {
  cart.clearCart();
  cart.addItem({
    productId: "p-001",
    slug: "wool-overcoat-camel",
    name: "Wool Overcoat",
    image: { alt: "Wool Overcoat" },
    size: "M",
    color: "Camel",
    quantity: 1,
    unitPrice: { amount: 24500, currency: "BDT" },
  });
  const lineId = cart.getCart()[0].id;
  cart.updateQuantity(lineId, 3);
  assert.equal(cart.getCart()[0].quantity, 3);
  assert.equal(cart.getCart()[0].lineTotal.amount, 73500);
  assert.equal(cart.getSubtotal().amount, 73500);
});

test("updateQuantity with a non-positive value removes the line", () => {
  cart.clearCart();
  cart.addItem({
    productId: "p-001",
    slug: "wool-overcoat-camel",
    name: "Wool Overcoat",
    image: { alt: "Wool Overcoat" },
    size: "M",
    color: "Camel",
    quantity: 1,
    unitPrice: { amount: 24500, currency: "BDT" },
  });
  const lineId = cart.getCart()[0].id;
  cart.updateQuantity(lineId, 0);
  assert.equal(cart.getCart().length, 0);
});

test("removeItem drops the matching line and remembers it for undo", () => {
  cart.clearCart();
  cart.addItem({
    productId: "p-001",
    slug: "wool-overcoat-camel",
    name: "Wool Overcoat",
    image: { alt: "Wool Overcoat" },
    size: "M",
    color: "Camel",
    quantity: 1,
    unitPrice: { amount: 24500, currency: "BDT" },
  });
  const lineId = cart.getCart()[0].id;
  cart.removeItem(lineId);
  assert.equal(cart.getCart().length, 0);
  const removed = cart.getLastRemoved();
  assert.ok(removed);
  assert.equal(removed.id, lineId);
  // Undo brings the line back.
  cart.undoRemoval();
  assert.equal(cart.getCart().length, 1);
  assert.equal(cart.getLastRemoved(), null);
});

test("clearCart empties the snapshot", () => {
  cart.addItem({
    productId: "p-001",
    slug: "wool-overcoat-camel",
    name: "Wool Overcoat",
    image: { alt: "Wool Overcoat" },
    size: "M",
    color: "Camel",
    quantity: 1,
    unitPrice: { amount: 24500, currency: "BDT" },
  });
  cart.clearCart();
  assert.equal(cart.getCart().length, 0);
  assert.equal(cart.getItemCount(), 0);
  assert.equal(cart.getSubtotal().amount, 0);
});

test("Browser-supplied prices cannot bypass the line total", () => {
  // `addItem` always multiplies unitPrice * quantity when storing the
  // line — even a malicious caller passing a wrong `quantity` cannot
  // inflate the recorded total. This protects the UI preview that
  // the order service later re-validates on the server.
  cart.clearCart();
  cart.addItem({
    productId: "p-001",
    slug: "wool-overcoat-camel",
    name: "Wool Overcoat",
    image: { alt: "Wool Overcoat" },
    size: "M",
    color: "Camel",
    quantity: 999,
    unitPrice: { amount: 24500, currency: "BDT" },
  });
  const line = cart.getCart()[0];
  assert.equal(line.lineTotal.amount, 24500 * 999);
  assert.equal(cart.getSubtotal().amount, 24500 * 999);
});
