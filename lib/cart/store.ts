"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import type {
  AddToCartInput,
  CartItemKey,
  CartLine,
  Currency,
  Money,
} from "@/types";
import { brand } from "@/config/brand";

/**
 * Client-side cart store.
 *
 * The store is intentionally framework-agnostic. It exposes a tiny
 * pub/sub interface and a `localStorage` adapter so the React layer
 * (`useCart`) can subscribe without re-implementing the state model.
 *
 * When a backend cart becomes available, replace the storage adapter
 * with one that calls the API and resolves the same shape. All
 * consumers depend on the functions in this file, not on the React
 * hook, so the swap does not require touching the rest of the app.
 */

const STORAGE_KEY = "monoform.cart.v1";

const subscribers = new Set<() => void>();
let snapshot: CartLine[] = loadInitial();
let lastRemoved: CartLine | null = null;
let hydrated = false;

function loadInitial(): CartLine[] {
  // Guarded for SSR — only read from storage in the browser.
  if (typeof window === "undefined") return [];
  return readFromStorage() ?? [];
}

function readFromStorage(): CartLine[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw as string) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(isCartLine);
  } catch {
    return null;
  }
}

function writeToStorage(lines: CartLine[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Quota errors are non-fatal — the in-memory store still works.
  }
}

function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.productId === "string" &&
    typeof candidate.slug === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.quantity === "number" &&
    typeof candidate.unitPrice === "object" &&
    typeof candidate.lineTotal === "object"
  );
}

function emit(): void {
  for (const subscriber of subscribers) {
    subscriber();
  }
}

function setSnapshot(next: CartLine[]): void {
  snapshot = next;
  writeToStorage(next);
  emit();
}

export function getCart(): CartLine[] {
  return snapshot;
}

export function getCartSnapshot(): CartLine[] {
  return snapshot;
}

export function getServerCartSnapshot(): CartLine[] {
  // Stable reference for SSR — never reads localStorage.
  return EMPTY_LINES;
}

function subscribe(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

const EMPTY_LINES: CartLine[] = [];

/* ------------------------------------------------------------------ *
 * Pure helpers (no React, no storage). Re-used by the hook and by any
 * server-side preview that wants to compute totals.
 * ------------------------------------------------------------------ */

function makeLineId(): string {
  return `line-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function makeVariantKey(input: CartItemKey): string {
  // Lowercase + trim so case-only differences don't create duplicates.
  return [
    input.productId,
    (input.size ?? "").trim().toLowerCase(),
    (input.color ?? "").trim().toLowerCase(),
  ].join("::");
}

function sameVariant(a: CartItemKey, b: CartItemKey): boolean {
  return makeVariantKey(a) === makeVariantKey(b);
}

function multiplyPrice(price: Money, quantity: number): Money {
  return { amount: price.amount * quantity, currency: price.currency };
}

function pickCurrency(...values: Money[]): Currency {
  return values[0]?.currency ?? brand.cartCurrency;
}

function normaliseVariantValue(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

/* ------------------------------------------------------------------ *
 * Mutators
 * ------------------------------------------------------------------ */

export function addItem(input: AddToCartInput): void {
  const quantity = Math.max(1, Math.floor(input.quantity ?? 1));
  const existingIndex = snapshot.findIndex((line) =>
    sameVariant(line, {
      productId: input.productId,
      size: input.size,
      color: input.color,
    }),
  );

  if (existingIndex >= 0) {
    const next = snapshot.slice();
    const existing = next[existingIndex];
    if (!existing) return;
    const updatedQuantity = existing.quantity + quantity;
    next[existingIndex] = {
      ...existing,
      quantity: updatedQuantity,
      lineTotal: multiplyPrice(existing.unitPrice, updatedQuantity),
    };
    setSnapshot(next);
    return;
  }

  const line: CartLine = {
    id: makeLineId(),
    productId: input.productId,
    slug: input.slug,
    name: input.name,
    image: input.image,
    size: input.size,
    color: input.color,
    quantity,
    unitPrice: input.unitPrice,
    lineTotal: multiplyPrice(input.unitPrice, quantity),
  };
  setSnapshot([...snapshot, line]);
}

export function removeItem(lineId: string): void {
  const target = snapshot.find((line) => line.id === lineId);
  if (!target) {
    // No-op so callers can fire remove without checking existence.
    return;
  }
  lastRemoved = target;
  setSnapshot(snapshot.filter((line) => line.id !== lineId));
}

export function updateQuantity(lineId: string, quantity: number): void {
  const safe = Math.floor(quantity);
  if (!Number.isFinite(safe) || safe <= 0) {
    removeItem(lineId);
    return;
  }
  const next = snapshot.map((line) => {
    if (line.id !== lineId) return line;
    return {
      ...line,
      quantity: safe,
      lineTotal: multiplyPrice(line.unitPrice, safe),
    };
  });
  setSnapshot(next);
}

/**
 * Change the size of an existing line. The size must be a non-empty
 * string and must not collide with another line for the same product
 * (in which case the two lines are merged by combining quantities).
 * The change is a no-op when the new size matches the existing one.
 */
export function setLineSize(lineId: string, size: string | null | undefined): boolean {
  const target = snapshot.find((line) => line.id === lineId);
  if (!target) return false;
  const nextSize = normaliseVariantValue(size);
  if ((target.size ?? undefined) === nextSize) return true;
  const updated: CartLine = {
    ...target,
    size: nextSize,
  };
  applyVariantChange(
    updated,
    (line) => line.id !== lineId && sameVariant(line, updated),
  );
  return true;
}

/**
 * Change the colour of an existing line. Same merge rules as
 * `setLineSize`. Passing an empty / null value clears the colour.
 */
export function setLineColor(lineId: string, color: string | null | undefined): boolean {
  const target = snapshot.find((line) => line.id === lineId);
  if (!target) return false;
  const nextColor = normaliseVariantValue(color);
  if ((target.color ?? undefined) === nextColor) return true;
  const updated: CartLine = {
    ...target,
    color: nextColor,
  };
  applyVariantChange(
    updated,
    (line) => line.id !== lineId && sameVariant(line, updated),
  );
  return true;
}

function applyVariantChange(
  updated: CartLine,
  isMergeCandidate: (line: CartLine) => boolean,
): void {
  const mergeIndex = snapshot.findIndex(isMergeCandidate);
  if (mergeIndex >= 0) {
    const existing = snapshot[mergeIndex];
    if (!existing) {
      setSnapshot(snapshot.map((line) => (line.id === updated.id ? updated : line)));
      return;
    }
    const mergedQuantity = existing.quantity + updated.quantity;
    const merged: CartLine = {
      ...existing,
      quantity: mergedQuantity,
      lineTotal: multiplyPrice(existing.unitPrice, mergedQuantity),
    };
    setSnapshot(
      snapshot
        .filter((line) => line.id !== updated.id && line.id !== existing.id)
        .concat(merged),
    );
    return;
  }
  setSnapshot(snapshot.map((line) => (line.id === updated.id ? updated : line)));
}

/**
 * Restore the last item removed through `removeItem`. Returns the
 * restored line so the caller can announce it. `null` means there
 * was nothing to undo (or the undo already happened).
 */
export function undoRemoval(): CartLine | null {
  if (!lastRemoved) return null;
  const restored = lastRemoved;
  lastRemoved = null;
  // Avoid duplicating a line that was re-added manually.
  const duplicateIndex = snapshot.findIndex((line) =>
    sameVariant(line, restored),
  );
  if (duplicateIndex >= 0) {
    const existing = snapshot[duplicateIndex];
    if (!existing) {
      setSnapshot([...snapshot, restored]);
      return restored;
    }
    const quantity = existing.quantity + restored.quantity;
    const merged: CartLine = {
      ...existing,
      quantity,
      lineTotal: multiplyPrice(existing.unitPrice, quantity),
    };
    setSnapshot(
      snapshot.map((line, index) => (index === duplicateIndex ? merged : line)),
    );
    return merged;
  }
  setSnapshot([...snapshot, restored]);
  return restored;
}

export function getLastRemoved(): CartLine | null {
  return lastRemoved;
}

export function clearLastRemoved(): void {
  if (lastRemoved) {
    lastRemoved = null;
    emit();
  }
}

export function clearCart(): void {
  setSnapshot([]);
}

/* ------------------------------------------------------------------ *
 * Derived selectors
 * ------------------------------------------------------------------ */

export function getItemCount(lines: CartLine[] = snapshot): number {
  return lines.reduce((total, line) => total + line.quantity, 0);
}

export function getSubtotal(lines: CartLine[] = snapshot): Money {
  if (lines.length === 0) {
    return { amount: 0, currency: brand.cartCurrency };
  }
  const first = lines[0];
  const currency = pickCurrency(
    first?.unitPrice ?? { amount: 0, currency: brand.cartCurrency },
  );
  const amount = lines.reduce(
    (total, line) => total + line.unitPrice.amount * line.quantity,
    0,
  );
  return { amount, currency };
}

/* ------------------------------------------------------------------ *
 * Hydration
 * ------------------------------------------------------------------ */

/**
 * Triggers a one-time read of `localStorage` on the client so the
 * first render after navigation matches the persisted cart. Safe to
 * call multiple times — the second call is a no-op.
 */
export function ensureHydrated(): void {
  if (hydrated || typeof window === "undefined") return;
  const stored = readFromStorage();
  if (stored) {
    snapshot = stored;
    emit();
  } else if (snapshot.length > 0) {
    // In-memory state was populated during this session but storage
    // was empty (e.g. user cleared it in another tab).
    snapshot = [];
    emit();
  }
  hydrated = true;
}

/* ------------------------------------------------------------------ *
 * React hook
 * ------------------------------------------------------------------ */

export function useCart() {
  // Use the stable empty reference for SSR.
  const lines = useSyncExternalStore(
    subscribe,
    getCartSnapshot,
    getServerCartSnapshot,
  );

  // Hydrate from localStorage exactly once on the client.
  useEffect(() => {
    ensureHydrated();
  }, []);

  const itemCount = useMemo(() => getItemCount(lines), [lines]);
  const subtotal = useMemo(() => getSubtotal(lines), [lines]);

  const add = useCallback((input: AddToCartInput) => addItem(input), []);
  const remove = useCallback((lineId: string) => removeItem(lineId), []);
  const update = useCallback(
    (lineId: string, quantity: number) => updateQuantity(lineId, quantity),
    [],
  );
  const changeSize = useCallback(
    (lineId: string, size: string | null | undefined) => setLineSize(lineId, size),
    [],
  );
  const changeColor = useCallback(
    (lineId: string, color: string | null | undefined) => setLineColor(lineId, color),
    [],
  );
  const undoRemove = useCallback(() => undoRemoval(), []);
  const dismissUndo = useCallback(() => clearLastRemoved(), []);
  const clear = useCallback(() => clearCart(), []);

  return {
    lines,
    itemCount,
    subtotal,
    add,
    remove,
    update,
    changeSize,
    changeColor,
    undoRemove,
    dismissUndo,
    clear,
  };
}
