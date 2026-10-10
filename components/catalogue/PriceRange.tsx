"use client";

import { useEffect, useId, useState, type ChangeEvent } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui";
import { formatPrice } from "@/lib/utils";

type Props = {
  min: number;
  max: number;
  value: { min: number | null; max: number | null };
  onApply: (next: { min: number | null; max: number | null }) => void;
  className?: string;
};

/**
 * Min / max price range. Inputs are intentionally uncontrolled so the
 * visitor can finish typing before the URL is updated; `Apply` pushes
 * the new bounds, `Clear` removes both. The component prevents invalid
 * ranges (min > max) and clamps to the catalogue-wide bounds.
 */
export function PriceRange({ min, max, value, onApply, className }: Props) {
  const reactId = useId();
  const [localMin, setLocalMin] = useState<string>(value.min?.toString() ?? "");
  const [localMax, setLocalMax] = useState<string>(value.max?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);

  // Sync the local input values when the URL state changes externally
  // (e.g. when a chip is removed).
  useEffect(() => {
    setLocalMin(value.min?.toString() ?? "");
    setLocalMax(value.max?.toString() ?? "");
  }, [value.min, value.max]);

  const onChangeMin = (event: ChangeEvent<HTMLInputElement>) => {
    setLocalMin(event.target.value);
    setError(null);
  };
  const onChangeMax = (event: ChangeEvent<HTMLInputElement>) => {
    setLocalMax(event.target.value);
    setError(null);
  };

  const handleApply = () => {
    const parsedMin = localMin.trim() === "" ? null : Number(localMin);
    const parsedMax = localMax.trim() === "" ? null : Number(localMax);

    if (parsedMin !== null && !Number.isFinite(parsedMin)) {
      setError("Enter a valid minimum price.");
      return;
    }
    if (parsedMax !== null && !Number.isFinite(parsedMax)) {
      setError("Enter a valid maximum price.");
      return;
    }
    if (parsedMin !== null && parsedMin < 0) {
      setError("Minimum price cannot be negative.");
      return;
    }
    if (parsedMax !== null && parsedMax < 0) {
      setError("Maximum price cannot be negative.");
      return;
    }
    if (parsedMin !== null && parsedMax !== null && parsedMin > parsedMax) {
      setError("Minimum cannot be greater than maximum.");
      return;
    }

    const clampedMin = parsedMin === null ? null : Math.max(min, Math.min(max, parsedMin));
    const clampedMax = parsedMax === null ? null : Math.max(min, Math.min(max, parsedMax));

    setError(null);
    onApply({ min: clampedMin, max: clampedMax });
  };

  const handleClear = () => {
    setLocalMin("");
    setLocalMax("");
    setError(null);
    onApply({ min: null, max: null });
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="grid grid-cols-2 gap-3">
        <Input
          id={`${reactId}-min`}
          name="minPrice"
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          placeholder={formatPrice(min, "BDT")}
          label="Min"
          value={localMin}
          onChange={onChangeMin}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleApply();
            }
          }}
        />
        <Input
          id={`${reactId}-max`}
          name="maxPrice"
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          placeholder={formatPrice(max, "BDT")}
          label="Max"
          value={localMax}
          onChange={onChangeMax}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleApply();
            }
          }}
        />
      </div>
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleApply}
          className={cn(
            "inline-flex h-9 items-center justify-center border border-ink bg-ink px-4 text-eyebrow uppercase text-paper",
            "transition-colors duration-base ease-out-soft hover:bg-ink-soft",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          )}
        >
          Apply
        </button>
        <button
          type="button"
          onClick={handleClear}
          className={cn(
            "inline-flex h-9 items-center justify-center border border-line px-4 text-eyebrow uppercase text-ink-muted",
            "transition-colors duration-base ease-out-soft hover:border-ink hover:text-ink",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          )}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
