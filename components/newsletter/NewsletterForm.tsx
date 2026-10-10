"use client";

import { useId, useState } from "react";
import { Button, Input } from "@/components/ui";
import { submitNewsletterAction } from "@/lib/newsletter/actions";
import type { NewsletterActionResult } from "@/lib/newsletter";
import { cn } from "@/lib/utils";

/**
 * Variant controls the visual density of the form. The home
 * hero wants a generous, centred layout; the footer wants a
 * compact, stacked layout that fits the column width.
 */
export type NewsletterVariant = "stacked" | "inline";

type Props = {
  /** Eyebrow label shown above the heading. Optional. */
  eyebrow?: string;
  /** Headline. Required. */
  heading: string;
  /** Supporting paragraph. */
  description?: string;
  /** Source label recorded server-side for analytics. */
  source?: string;
  /** Pre-filled email (e.g. when the visitor is signed in). */
  defaultEmail?: string;
  /** User id recorded server-side. Server treats this as a hint
   *  only — the customer still has to tick the consent box. */
  userId?: string | null;
  /** Compact vs spacious layout. */
  variant?: NewsletterVariant;
  /** Optional CTA override. */
  submitLabel?: string;
  /** Optional className on the root element. */
  className?: string;
};

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; email: string; already?: boolean }
  | { kind: "error"; message: string };

/**
 * Reusable newsletter subscription form.
 *
 * Renders honest states:
 *  - idle: empty form with consent checkbox.
 *  - submitting: spinner inside the button.
 *  - success: confirmation that the subscription was persisted
 *    (and, if the welcome email was dispatched, that the email
 *    was sent). The form resets so the visitor can subscribe
 *    a different address.
 *  - already-subscribed: a softer success — the email is
 *    already on the list. The visitor is told honestly.
 *  - error: server-side validation, rate limit, missing
 *    configuration, or any provider failure.
 *
 * The form does NOT show "success" before the server confirms
 * the row was actually written. The form's state is driven by
 * the server action's return value, not by optimistic UI.
 */
export function NewsletterForm({
  eyebrow,
  heading,
  description,
  source = "newsletter-form",
  defaultEmail = "",
  userId = null,
  variant = "stacked",
  submitLabel = "Subscribe",
  className,
}: Props) {
  const inputId = useId();
  const consentId = useId();
  const errorId = useId();
  const [email, setEmail] = useState(defaultEmail);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [fieldError, setFieldError] = useState<string | null>(null);

  const isSubmitting = status.kind === "submitting";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setFieldError(null);
    if (!consent) {
      setFieldError("Please tick the consent box to receive the newsletter.");
      return;
    }
    setStatus({ kind: "submitting" });
    try {
      const form = new FormData(event.currentTarget);
      const result: NewsletterActionResult = await submitNewsletterAction(form);
      if (result.ok) {
        setStatus({
          kind: "success",
          email: result.email,
          already: result.status === "already_subscribed",
        });
        setEmail("");
        setConsent(false);
        return;
      }
      setStatus({ kind: "error", message: result.error });
    } catch {
      setStatus({
        kind: "error",
        message: "Something went wrong. Please try again in a moment.",
      });
    }
  }

  if (status.kind === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn("border border-line bg-paper-warm p-6", className)}
      >
        <p className="eyebrow text-ink-muted">
          {status.already ? "Already on the list" : "You're subscribed"}
        </p>
        <p className="mt-3 text-sm text-ink">
          {status.already
            ? `${status.email} is already on the MONOFORM newsletter list. We won't send a duplicate welcome.`
            : `Thank you. We'll be in touch at ${status.email} when there's something new to share.`}
        </p>
        <button
          type="button"
          onClick={() => setStatus({ kind: "idle" })}
          className="link-underline mt-4 text-xs uppercase tracking-[0.18em] text-ink-muted"
        >
          Subscribe another address
        </button>
      </div>
    );
  }

  const isInline = variant === "inline";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-describedby={status.kind === "error" ? errorId : undefined}
      className={cn(
        "flex",
        isInline ? "flex-col gap-3" : "flex-col gap-3",
        className,
      )}
    >
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <p className={isInline ? "text-sm text-ink" : "text-display-md text-ink"}>
        {heading}
      </p>
      {description ? (
        <p className="text-sm text-ink-muted">{description}</p>
      ) : null}

      <input type="hidden" name="source" value={source} />
      {userId ? <input type="hidden" name="userId" value={userId} /> : null}

      <div className={cn("flex gap-3", isInline ? "flex-col" : "flex-col sm:flex-row sm:items-start")}>
        <div className="flex-1 text-left">
          <label htmlFor={inputId} className="sr-only">
            Email address
          </label>
          <Input
            id={inputId}
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="[email protected]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            hideLabel
            error={fieldError ?? undefined}
          />
        </div>
        <Button
          type="submit"
          size={isInline ? "md" : "lg"}
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Subscribing" : submitLabel}
        </Button>
      </div>

      <div className="flex items-start gap-3">
        <input
          id={consentId}
          name="consent"
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={isSubmitting}
          required
          className="mt-1 h-4 w-4 border border-line-strong bg-paper text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        />
        <label htmlFor={consentId} className="text-xs text-ink-muted">
          I agree to receive the MONOFORM newsletter. I can unsubscribe at
          any time using the link in any email.
        </label>
      </div>

      {status.kind === "error" ? (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
