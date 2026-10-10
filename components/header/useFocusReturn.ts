"use client";

import { useCallback, useRef } from "react";

/**
 * Returns focus to the previously focused element after an overlay
 * closes. The store keeps a single ref so multiple overlay openers
 * can share the same remembered target without losing it between
 * mount/unmount cycles of the hook instance.
 */
export function useFocusReturn() {
  const previous = useRef<HTMLElement | null>(null);

  const remember = useCallback(() => {
    if (typeof document === "undefined") return;
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      previous.current = active;
    }
  }, []);

  const restore = useCallback(() => {
    const target = previous.current;
    if (target && typeof target.focus === "function") {
      target.focus();
    }
    previous.current = null;
  }, []);

  return { remember, restore };
}
