"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { contactCopy } from "@/config/content";
import { submitContactAction } from "@/lib/support/actions";
import type { ContactActionResult } from "@/lib/support";

type Props = {
  /** When the visitor is signed-in we prefill name + email. */
  defaultName?: string;
  defaultEmail?: string;
};

/**
 * Public contact form. Submits through the
 * `submitContactAction` server action, renders inline field errors
 * without clearing the rest of the form, and shows an honest
 * success / error state based on the action result.
 *
 * The form intentionally has no client-side CAPTCHA — the server
 * applies a simple per-IP rate limit and a max-length check
 * instead. This keeps the experience accessible and avoids
 * collecting extra data through a third-party widget.
 */
export function ContactForm({ defaultName = "", defaultEmail = "" }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{
    reference: string;
    emailed: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement | null>(null);

  const formId = useId();
  const statusId = `${formId}-status`;

  useEffect(() => {
    // Reset submission state when the user starts editing again.
    if (submitted) return;
    if (error || Object.keys(fieldErrors).length > 0) return;
  }, [submitted, error, fieldErrors]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const form = new FormData(event.currentTarget);
      const result: ContactActionResult = await submitContactAction(form);
      if (result.ok) {
        setSubmitted({ reference: result.reference, emailed: result.emailed });
        formRef.current?.reset();
        return;
      }
      setError(result.error);
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      if (result.retryAfterSeconds) {
        setError(
          `Too many submissions. Please wait ${result.retryAfterSeconds} seconds before trying again.`,
        );
      }
    } catch {
      setError("Something went wrong. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="border border-line bg-paper-warm p-6"
      >
        <p className="eyebrow text-ink-muted">Message received</p>
        <h2 className="mt-3 text-display-sm text-ink">Thank you for getting in touch.</h2>
        <p className="mt-3 text-sm text-ink-muted">
          We have recorded your enquiry
          {submitted.emailed
            ? " and the support team has been notified by email."
            : ". The support team will pick it up from the dashboard."}{" "}
          We will reply to the address you provided.
        </p>
        <p className="mt-3 text-xs text-ink-muted">Reference: {submitted.reference}</p>
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="mt-6"
          onClick={() => {
            setSubmitted(null);
            setError(null);
            setFieldErrors({});
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      aria-describedby={error ? statusId : undefined}
      className="flex flex-col gap-6"
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Input
          label="Full name"
          name="name"
          autoComplete="name"
          required
          maxLength={80}
          defaultValue={defaultName}
          error={fieldErrors.name}
        />
        <Input
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={320}
          defaultValue={defaultEmail}
          error={fieldErrors.email}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Input
          label="Order number (optional)"
          name="orderNumber"
          helpText="If your enquiry relates to an order, enter the order number."
          maxLength={64}
          error={fieldErrors.orderNumber}
        />
        <Input
          label="Phone (optional)"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={32}
          helpText="Bangladeshi mobile, e.g. 01XXXXXXXXX or +8801XXXXXXXXX."
          error={fieldErrors.phone}
        />
      </div>

      <Select
        label="Topic"
        name="topic"
        required
        defaultValue="product"
        error={fieldErrors.topic}
        options={contactCopy.topics}
      />

      <Textarea
        label="Message"
        name="message"
        rows={6}
        required
        maxLength={4000}
        helpText={`${(4000).toLocaleString()} characters max.`}
        error={fieldErrors.message}
      />

      {error ? (
        <p
          id={statusId}
          role="alert"
          className="text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        loading={submitting}
        disabled={submitting}
        className="self-start"
      >
        {submitting ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
