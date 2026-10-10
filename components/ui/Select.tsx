import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  helpText?: string;
  error?: string;
  hideLabel?: boolean;
  options: ReadonlyArray<Option>;
};

/**
 * Styled `<select>` matching the underline-style text field used
 * across the account and auth forms. The default option is the
 * first entry in `options` unless `defaultValue` is supplied.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, helpText, error, hideLabel, options, className, id, ...rest },
  ref,
) {
  const fieldId = id ?? rest.name;
  const helpId = helpText ? `${fieldId}-help` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col">
      {label ? (
        <label
          htmlFor={fieldId}
          className={cn("field-label", hideLabel && "sr-only")}
        >
          {label}
        </label>
      ) : null}
      <select
        ref={ref}
        id={fieldId}
        className={cn(
          "block w-full appearance-none bg-transparent text-ink",
          "border-0 border-b border-line-strong py-3 pr-8",
          "focus:outline-none focus:border-ink",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-colors duration-base",
          error && "border-danger focus:border-danger",
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helpText ? (
        <p id={helpId} className="field-help">
          {helpText}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
