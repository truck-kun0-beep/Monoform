"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

/**
 * Client-side wishlist store.
 *
 * Stores only product identifiers and the timestamp at which they
 * were added. The full product details are resolved from the
 * catalogue by the consumers (header button, PDP, /wishlist page).
 *
 * Persistence uses `localStorage` under a versioned key. When
 * account-backed wishlists are introduced, swap the storage adapter
 * for an API call — all consumers depend on the public functions
 * and the `useWishlist` hook, not on the storage layer.
 */

const STORAGE_KEY = "monoform.wishlist.v1";

export type WishlistEntry = {
  productId: string;
  /** ISO timestamp of when the product was added. */
  addedAt: string;
};

const subscribers = new Set<() => void>();
let snapshot: WishlistEntry[] = loadInitial();
let hydrated = false;

function loadInitial(): WishlistEntry[] {
  if (typeof window === "undefined") return [];
  return readFromStorage() ?? [];
}

function readFromStorage(): WishlistEntry[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(isWishlistEntry);
  } catch {
    return null;
  }
}

function writeToStorage(entries: WishlistEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* non-fatal */
  }
}

function isWishlistEntry(value: unknown): value is WishlistEntry {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.productId === "string" &&
    typeof candidate.addedAt === "string"
  );
}

function emit(): void {
  for (const subscriber of subscribers) {
    subscriber();
  }
}

function setSnapshot(next: WishlistEntry[]): void {
  snapshot = next;
  writeToStorage(next);
  emit();
}

function subscribe(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

const EMPTY: WishlistEntry[] = [];

/* ------------------------------------------------------------------ *
 * Pure API
 * ------------------------------------------------------------------ */

export function isInWishlist(
  productId: string,
  entries: WishlistEntry[] = snapshot,
): boolean {
  return entries.some((entry) => entry.productId === productId);
}

export function addToWishlist(productId: string): void {
  if (isInWishlist(productId)) return;
  setSnapshot([
    ...snapshot,
    { productId, addedAt: new Date().toISOString() },
  ]);
}

export function removeFromWishlist(productId: string): void {
  setSnapshot(snapshot.filter((entry) => entry.productId !== productId));
}

export function toggleWishlist(productId: string): boolean {
  if (isInWishlist(productId)) {
    removeFromWishlist(productId);
    return false;
  }
  addToWishlist(productId);
  return true;
}

export function clearWishlist(): void {
  setSnapshot([]);
}

export function getWishlistSnapshot(): WishlistEntry[] {
  return snapshot;
}

export function getServerWishlistSnapshot(): WishlistEntry[] {
  return EMPTY;
}

/**
 * One-time read of `localStorage` on the client. Safe to call
 * repeatedly; the second call is a no-op.
 */
export function ensureWishlistHydrated(): void {
  if (hydrated || typeof window === "undefined") return;
  const stored = readFromStorage();
  if (stored) {
    snapshot = stored;
    emit();
  } else if (snapshot.length > 0) {
    snapshot = [];
    emit();
  }
  hydrated = true;
}

/* ------------------------------------------------------------------ *
 * React hook
 * ------------------------------------------------------------------ */

export function useWishlist() {
  const entries = useSyncExternalStore(
    subscribe,
    getWishlistSnapshot,
    getServerWishlistSnapshot,
  );

  useEffect(() => {
    ensureWishlistHydrated();
  }, []);

  const ids = useMemo(
    () => entries.map((entry) => entry.productId),
    [entries],
  );

  const has = useCallback(
    (productId: string) => ids.includes(productId),
    [ids],
  );

  const toggle = useCallback((productId: string) => toggleWishlist(productId), []);
  const add = useCallback((productId: string) => addToWishlist(productId), []);
  const remove = useCallback(
    (productId: string) => removeFromWishlist(productId),
    [],
  );
  const clear = useCallback(() => clearWishlist(), []);

  return { entries, ids, has, toggle, add, remove, clear };
}
