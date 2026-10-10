"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import type { FacetEntry } from "@/lib/catalogue";

type Props = {
  name: string;
  /** Currently selected values. */
  values: string[];
  /** Facet entries shown in the list. */
  options: FacetEntry[];
  /** Callback when a value is toggled. */
  onToggle: (value: string) => void;
  /** Optional visual hint for the row (e.g. a colour swatch). */
  renderSwatch?: (option: FacetEntry) => React.ReactNode;
  /** Number of options to show before collapsing. Defaults to 8. */
  collapseAfter?: number;
  className?: string;
  /**
   * Aria-label used for the surrounding fieldset. Defaults to the
   * option's label.
   */
  legend: string;
};

/**
 * Checkbox list used by every multi-select filter (category, size,
 * colour). Disables options whose facet count is zero so an empty
 * bucket is never selectable — but still visible so the visitor can
 * see why the catalogue is empty.
 */
export function CheckboxList({
  name,
  values,
  options,
  onToggle,
  renderSwatch,
  collapseAfter = 8,
  className,
  legend,
}: Props) {
  const reactId = useId();
  const groupName = `${name}-${reactId}`;
  const visible = options.slice(0, collapseAfter);
  const overflow = options.slice(collapseAfter);

  return (
    <fieldset
      className={cn("flex flex-col gap-1.5", className)}
      aria-label={legend}
    >
      <legend className="sr-only">{legend}</legend>
      {visible.map((option) => {
        const checked = values.includes(option.value);
        return (
          <CheckboxRow
            key={option.value}
            id={`${groupName}-${option.value}`}
            name={groupName}
            checked={checked}
            disabled={option.count === 0 && !checked}
            option={option}
            onToggle={onToggle}
            renderSwatch={renderSwatch}
          />
        );
      })}
      {overflow.length > 0 ? (
        <OverflowList
          id={`${groupName}-overflow`}
          groupName={groupName}
          values={values}
          options={overflow}
          onToggle={onToggle}
          renderSwatch={renderSwatch}
        />
      ) : null}
    </fieldset>
  );
}

function CheckboxRow({
  id,
  name,
  checked,
  disabled,
  option,
  onToggle,
  renderSwatch,
}: {
  id: string;
  name: string;
  checked: boolean;
  disabled: boolean;
  option: FacetEntry;
  onToggle: (value: string) => void;
  renderSwatch?: (option: FacetEntry) => React.ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "group flex cursor-pointer items-center gap-3 text-sm text-ink",
        "transition-colors duration-base ease-out-soft",
        disabled ? "cursor-not-allowed opacity-50" : "hover:text-ink-soft",
      )}
    >
      <input
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => onToggle(option.value)}
        className={cn(
          "peer sr-only",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex h-4 w-4 shrink-0 items-center justify-center border border-line-strong bg-paper",
          "transition-colors duration-base ease-out-soft",
          "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink",
          checked && "bg-ink",
        )}
      >
        {checked ? (
          <svg
            viewBox="0 0 12 12"
            className="h-3 w-3 text-paper"
            aria-hidden="true"
          >
            <path
              d="M2.5 6.4 4.8 8.7 9.5 3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      {renderSwatch ? (
        <span className="shrink-0">{renderSwatch(option)}</span>
      ) : null}
      <span className="flex-1 truncate">{option.label}</span>
      <span className="text-xs tabular-nums text-ink-muted">
        {option.count}
      </span>
    </label>
  );
}

function OverflowList({
  id,
  groupName,
  values,
  options,
  onToggle,
  renderSwatch,
}: {
  id: string;
  groupName: string;
  values: string[];
  options: FacetEntry[];
  onToggle: (value: string) => void;
  renderSwatch?: (option: FacetEntry) => React.ReactNode;
}) {
  return (
    <details className="mt-1 border-t border-line pt-2">
      <summary
        className={cn(
          "cursor-pointer list-none text-[11px] uppercase tracking-[0.18em] text-ink-muted",
          "hover:text-ink",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        Show {options.length} more
      </summary>
      <div className="mt-2 flex flex-col gap-1.5">
        {options.map((option) => {
          const checked = values.includes(option.value);
          return (
            <CheckboxRow
              key={option.value}
              id={`${id}-${option.value}`}
              name={groupName}
              checked={checked}
              disabled={option.count === 0 && !checked}
              option={option}
              onToggle={onToggle}
              renderSwatch={renderSwatch}
            />
          );
        })}
      </div>
    </details>
  );
}

/**
 * Render a swatch indicator for a colour. The value is the colour
 * label and we expect the caller to provide the hex code through the
 * facet `value` for the matching colour.
 */
export function ColorSwatch({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 rounded-full border border-line"
      style={{ backgroundColor: value }}
      title={label}
    />
  );
}
