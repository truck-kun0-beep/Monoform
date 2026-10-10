"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  name: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  helpText?: string;
  /** Server-side error message for this field. */
  error?: string;
  /** Minimum length used for the HTML `minLength` attribute. */
  minLength?: number;
  /** Disable the input while the form is submitting. */
  disabled?: boolean;
  className?: string;
};

/**
 * Password input with an accessible show / hide toggle. The toggle
 * button is a real `<button type="button">` with an `aria-pressed`
 * state so screen readers announce the visibility change.
 */
export function PasswordField({
  label,
  name,
  autoComplete,
  required,
  defaultValue,
  helpText,
  error,
  minLength,
  disabled,
  className,
}: Props) {
  const reactId = useId();
  const id = `${name}-${reactId}`;
  const [visible, setVisible] = useState(false);
  const helpId = helpText ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col", className)}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          defaultValue={defaultValue}
          minLength={minLength}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "block w-full bg-transparent text-ink placeholder:text-ink-subtle",
            "border-0 border-b border-line-strong py-3 pr-12",
            "focus:outline-none focus:border-ink",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-colors duration-base",
            error && "border-danger focus:border-danger",
          )}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
          disabled={disabled}
          className={cn(
            "absolute right-0 top-1/2 -translate-y-1/2 px-2 py-1 text-eyebrow uppercase text-ink-muted",
            "transition-colors hover:text-ink",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
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
}
