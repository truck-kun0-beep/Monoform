"use client";

import { useId } from "react";
import { Input } from "@/components/ui";

type Props = {
  label: string;
  name: string;
  type?: "text" | "email" | "tel" | "password";
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  helpText?: string;
  error?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  inputMode?: "text" | "email" | "tel" | "numeric" | "url" | "search";
  disabled?: boolean;
  className?: string;
};

/**
 * Standard text input used by the auth pages. Built on top of the
 * shared `Input` so every form has identical focus, error and
 * label rendering. Passwords are handled by `PasswordField` which
 * adds the visibility toggle.
 */
export function TextField({
  label: _label,
  name,
  type = "text",
  autoComplete,
  required,
  defaultValue,
  placeholder,
  helpText,
  error,
  minLength,
  maxLength,
  pattern,
  inputMode,
  disabled,
  className,
}: Props) {
  const reactId = useId();
  const id = `${name}-${reactId}`;
  return (
    <Input
      id={id}
      name={name}
      type={type}
      autoComplete={autoComplete}
      required={required}
      defaultValue={defaultValue}
      placeholder={placeholder}
      helpText={helpText}
      error={error}
      minLength={minLength}
      maxLength={maxLength}
      pattern={pattern}
      inputMode={inputMode}
      disabled={disabled}
      className={className}
    />
  );
}
