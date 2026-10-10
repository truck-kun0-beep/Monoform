import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helpText?: string;
  error?: string;
  hideLabel?: boolean;
};

const baseField =
  "block w-full bg-transparent text-ink placeholder:text-ink-subtle " +
  "border-0 border-b border-line-strong py-3 " +
  "focus:outline-none focus:border-ink " +
  "disabled:cursor-not-allowed disabled:opacity-50 " +
  "transition-colors duration-base";

/**
 * Single-line text field. Designed to sit inside a vertical rhythm
 * with the matching label / error / help text.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helpText, error, hideLabel, className, id, ...rest },
  ref,
) {
  const fieldId = id ?? rest.name;
  const helpId = helpText ? `${fieldId}-help` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col">
      {label ? (
        <label htmlFor={fieldId} className={cn("field-label", hideLabel && "sr-only")}>
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={fieldId}
        className={cn(baseField, error && "border-danger focus:border-danger", className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
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

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  helpText?: string;
  error?: string;
  hideLabel?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { label, helpText, error, hideLabel, className, id, ...rest },
    ref,
  ) {
    const fieldId = id ?? rest.name;
    const helpId = helpText ? `${fieldId}-help` : undefined;
    const errorId = error ? `${fieldId}-error` : undefined;
    const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="flex flex-col">
        {label ? (
          <label htmlFor={fieldId} className={cn("field-label", hideLabel && "sr-only")}>
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={fieldId}
          className={cn(
            baseField,
            "min-h-[120px] resize-y border border-line p-3",
            error && "border-danger focus:border-danger",
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
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
  },
);
