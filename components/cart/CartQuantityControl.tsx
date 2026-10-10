"use client";

import { useRef } from "react";
import { MinusIcon, PlusIcon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type Props = {
  quantity: number;
  onChange: (next: number) => void;
  /** Optional cap. Defaults to 99. */
  max?: number;
  /** Compact stepper used in the shopping-bag drawer. */
  size?: "sm" | "md";
  /** Accessible label used by the +/- buttons. */
  productName: string;
  /** Disable the controls (e.g. while removing). */
  disabled?: boolean;
  className?: string;
};

/**
 * Accessible quantity stepper used in cart rows.
 *
 * Incrementing past the configured cap is silently ignored; the
 * button also exposes `aria-disabled` so screen readers announce the
 * state. The +/- buttons are real `<button type="button">` elements
 * with explicit aria-labels and visible focus rings.
 */
export function CartQuantityControl({
  quantity,
  onChange,
  max = 99,
  size = "md",
  productName,
  disabled = false,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const decrease = () => {
    if (disabled) return;
    onChange(quantity - 1);
  };
  const increase = () => {
    if (disabled) return;
    if (quantity >= max) return;
    onChange(quantity + 1);
  };

  const buttonSize = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const valuePadding = size === "sm" ? "min-w-8 px-2" : "min-w-10 px-3";

  return (
    <div
      className={cn(
        "inline-flex items-stretch border border-line",
        className,
      )}
      role="group"
      aria-label={`Quantity for ${productName}`}
    >
      <button
        type="button"
        onClick={decrease}
        disabled={disabled}
        aria-label={
          quantity <= 1
            ? `Remove ${productName} from bag`
            : `Decrease quantity of ${productName}`
        }
        className={cn(
          buttonSize,
          "inline-flex items-center justify-center text-ink",
          "transition-colors duration-base ease-out-soft",
          "hover:bg-paper-warm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
        )}
      >
        <MinusIcon className="h-3 w-3" aria-hidden="true" />
      </button>
      <label className="sr-only" htmlFor={`qty-${productName.replace(/\s+/g, "-").toLowerCase()}`}>
        Quantity for {productName}
      </label>
      <input
        ref={inputRef}
        id={`qty-${productName.replace(/\s+/g, "-").toLowerCase()}`}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={quantity}
        onChange={(event) => {
          const raw = event.target.value.replace(/[^0-9]/g, "");
          if (raw === "") return;
          const next = Math.min(max, Math.max(1, Number(raw)));
          onChange(next);
        }}
        onBlur={(event) => {
          const raw = event.target.value.replace(/[^0-9]/g, "");
          if (raw === "" || Number(raw) < 1) {
            onChange(1);
            event.target.value = "1";
          }
        }}
        disabled={disabled}
        aria-live="polite"
        className={cn(
          valuePadding,
          "w-12 border-x border-line bg-paper text-center text-sm tabular-nums text-ink",
          "focus:outline-none focus-visible:bg-paper-warm",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      />
      <button
        type="button"
        onClick={increase}
        disabled={disabled || quantity >= max}
        aria-disabled={quantity >= max || undefined}
        aria-label={`Increase quantity of ${productName}`}
        className={cn(
          buttonSize,
          "inline-flex items-center justify-center text-ink",
          "transition-colors duration-base ease-out-soft",
          "hover:bg-paper-warm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
        )}
      >
        <PlusIcon className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}
