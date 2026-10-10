"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";

type Props = {
  label: string;
  /** Label rendered while the form is submitting. */
  pendingLabel?: string;
  fullWidth?: boolean;
  size?: "md" | "lg";
};

/**
 * Submit button for the auth pages. Uses React 19's `useFormStatus`
 * so the form submitter is automatically wired to the server action
 * returned by the parent `<form action={...}>`. Prevents duplicate
 * submissions without the form needing a local loading state.
 */
export function SubmitButton({
  label,
  pendingLabel = "Working…",
  fullWidth = true,
  size = "lg",
}: Props) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size={size}
      fullWidth={fullWidth}
      loading={pending}
      aria-busy={pending || undefined}
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}
