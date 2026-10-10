"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "./Toast";

type Props = {
  /** Text to copy to the clipboard. */
  value: string;
  /** Accessible label. Defaults to "Copy". */
  label?: string;
  /** Optional className. */
  className?: string;
};

/**
 * Copy-to-clipboard button.
 *
 *  - Only reports success after the clipboard write actually
 *    succeeds (the browser `navigator.clipboard` API can be
 *    disabled, denied or absent).
 *  - Never pretends to copy sensitive data — the caller is
 *    responsible for ensuring the value is safe to disclose.
 *  - Falls back to a manual select-and-copy when the async
 *    clipboard API is unavailable, but still shows an honest
 *    toast on failure.
 */
export function CopyButton({ value, label = "Copy", className }: Props) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(value);
        toast.push({
          title: "Copied",
          description: "The value is on your clipboard.",
          tone: "success",
        });
        return;
      }
      // Fallback: temporary textarea + execCommand. We only
      // attempt this when the modern API is missing.
      if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (ok) {
          toast.push({
            title: "Copied",
            description: "The value is on your clipboard.",
            tone: "success",
          });
          return;
        }
      }
      toast.push({
        title: "Could not copy",
        description: "Your browser blocked the copy action. Please copy the value manually.",
        tone: "danger",
        durationMs: 6000,
      });
    } catch {
      toast.push({
        title: "Could not copy",
        description: "Your browser blocked the copy action. Please copy the value manually.",
        tone: "danger",
        durationMs: 6000,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-2 border border-line-strong px-3 py-1 text-eyebrow uppercase text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        className,
      )}
    >
      {label}
    </button>
  );
}
