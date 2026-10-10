"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import type { CartLine } from "@/types";

const DISMISS_AFTER_MS = 6000;

/**
 * Inline undo strip shown at the top of the cart page when the last
 * `removeItem` call hasn't been undone yet. Mirrors the global toast
 * provider but is anchored to the cart so the visitor can re-add
 * the item in place without dismissing unrelated notifications.
 */
export function CartUndoToast() {
  const { lines, undoRemove, dismissUndo } = useCart();
  const [lastRemoved, setLastRemoved] = useState<CartLine | null>(null);
  const [visible, setVisible] = useState(false);

  // Detect removals by comparing the previous line list. Anything
  // missing from the current list — assuming the snapshot is non-empty
  // before — was just removed.
  useEffect(() => {
    // We rely on the dedicated lastRemoved hook exposed below.
  }, []);

  // We need a finer-grained hook. Use the store's getLastRemoved via
  // a tiny subscription that triggers a re-render whenever undo state
  // changes. The simplest approach: poll on every cart change. The
  // cart store is already sync; the polling cost is negligible.
  useEffect(() => {
    let cancelled = false;
    import("@/lib/cart").then(({ getLastRemoved }) => {
      if (cancelled) return;
      const current = getLastRemoved();
      if (current) {
        setLastRemoved(current);
        setVisible(true);
      } else {
        setVisible(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [lines]);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => {
      setVisible(false);
      dismissUndo();
    }, DISMISS_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [visible, dismissUndo]);

  if (!visible || !lastRemoved) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "sticky top-2 z-20 mb-6 flex flex-wrap items-center gap-3 border border-line bg-paper-warm px-4 py-3 text-sm shadow-sm",
        "animate-fade-in",
      )}
    >
      <span className="text-ink">
        Removed{" "}
        <span className="font-medium">{lastRemoved.name}</span>
        {lastRemoved.size ? ` (Size ${lastRemoved.size})` : ""}
        {lastRemoved.color ? `, ${lastRemoved.color}` : ""}.
      </span>
      <button
        type="button"
        onClick={() => {
          undoRemove();
          setVisible(false);
        }}
        className={cn(
          "link-underline text-eyebrow uppercase text-ink",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        )}
      >
        Undo
      </button>
      <button
        type="button"
        onClick={() => {
          dismissUndo();
          setVisible(false);
        }}
        aria-label="Dismiss notification"
        className={cn(
          "ml-auto text-eyebrow uppercase text-ink-muted transition-colors hover:text-ink",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        )}
      >
        Dismiss
      </button>
    </div>
  );
}
