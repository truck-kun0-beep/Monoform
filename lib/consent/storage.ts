"use client";

/**
 * Cookie / local-storage consent helper.
 *
 * The consent record is kept in `localStorage` (so it does not
 * contribute to every request) under a stable key. We never
 * write the consent record to the cookies the application sets
 * for authentication or cart — that would risk overwriting
 * session state.
 *
 * The default consent state is `essential: true, analytics:
 * false, marketing: false` — the strictest possible default
 * that still allows the store to function.
 *
 * The interface version is recorded alongside the record so
 * we can detect a stale consent record and ask the user to
 * re-confirm when the categories change.
 */

import { CONSENT_INTERFACE_VERSION } from "@/config/consent";
import type { ConsentCategoryId } from "@/config/consent";

export type ConsentRecord = {
  version: string;
  /** Map of category id → granted. Always includes `essential: true`. */
  categories: Record<ConsentCategoryId, boolean>;
  /** ISO timestamp of the last update. */
  updatedAt: string;
};

const STORAGE_KEY = "monoform.consent.v1";

const DEFAULT_CATEGORIES: Record<ConsentCategoryId, boolean> = {
  essential: true,
  analytics: false,
  marketing: false,
};

export function readConsentRecord(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentRecord>;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== CONSENT_INTERFACE_VERSION) {
      // Stale record — drop it so the banner can re-prompt.
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const categories = { ...DEFAULT_CATEGORIES, ...(parsed.categories ?? {}) };
    categories.essential = true; // always on
    return {
      version: parsed.version ?? CONSENT_INTERFACE_VERSION,
      categories,
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeConsentRecord(
  categories: Record<ConsentCategoryId, boolean>,
): ConsentRecord {
  const safe: Record<ConsentCategoryId, boolean> = {
    ...DEFAULT_CATEGORIES,
    ...categories,
    essential: true,
  };
  const record: ConsentRecord = {
    version: CONSENT_INTERFACE_VERSION,
    categories: safe,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
      // localStorage may be disabled (private mode, quota, etc.).
      // The in-memory record is still valid for the current
      // session, so we still return it to the caller.
    }
  }
  return record;
}

export function clearConsentRecord(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Returns true when the user has explicitly saved a consent
 * record (accept all, reject all, or custom). Used by the
 * banner to decide whether to show itself.
 */
export function hasRecordedConsent(): boolean {
  return readConsentRecord() !== null;
}

/**
 * Returns the optional categories that the current consent
 * record allows. Used by the (future) loader scripts to
 * decide whether to inject a third-party tag.
 */
export function allowedOptionalCategories(): ConsentCategoryId[] {
  const record = readConsentRecord();
  if (!record) return [];
  return (Object.keys(record.categories) as ConsentCategoryId[]).filter(
    (id) => id !== "essential" && record.categories[id],
  );
}
