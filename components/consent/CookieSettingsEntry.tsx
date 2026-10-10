"use client";

import { useId, useState } from "react";
import { Button, Modal } from "@/components/ui";
import { hasOptionalServices, CONSENT_INTERFACE_VERSION } from "@/config/consent";
import type { ConsentCategoryId } from "@/config/consent";
import {
  hasRecordedConsent,
  readConsentRecord,
  writeConsentRecord,
} from "@/lib/consent/storage";

/**
 * Footer entry that opens the cookie preferences dialog. When
 * no optional services are configured the entry is still
 * shown so visitors can see what the store does (and does not)
 * use — but the dialog reflects that no optional cookies are
 * currently in use.
 */
export function CookieSettingsEntry({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "link-underline text-xs text-ink-muted hover:text-ink"
        }
      >
        Cookie settings
      </button>
      <SettingsDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

type DialogProps = {
  open: boolean;
  onClose: () => void;
};

function SettingsDialog({ open, onClose }: DialogProps) {
  const headingId = useId();
  const initial = readConsentRecord();
  const [analytics, setAnalytics] = useState<boolean>(
    initial?.categories.analytics ?? false,
  );
  const [marketing, setMarketing] = useState<boolean>(
    initial?.categories.marketing ?? false,
  );

  function save() {
    writeConsentRecord({
      essential: true,
      analytics,
      marketing,
    });
    onClose();
  }

  const recorded = hasRecordedConsent();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cookie preferences"
      description={`Manage how MONOFORM uses cookies. Interface version ${CONSENT_INTERFACE_VERSION}.`}
      size="md"
    >
      <div className="space-y-6 text-sm text-ink-muted">
        <p>
          {recorded
            ? "Your current preferences are loaded below. Save to update them."
            : "You have not recorded a preference yet. Use the controls below to choose which optional cookies the store can use."}
        </p>
        <Row
          title="Essential"
          description="Required for the store to function — session, authentication, cart and security. Always on."
          checked
          disabled
        />
        {hasOptionalServices() ? (
          <>
            <Row
              title="Analytics"
              description="Help us understand how visitors use the store."
              checked={analytics}
              onChange={setAnalytics}
            />
            <Row
              title="Marketing"
              description="Personalised content and offers."
              checked={marketing}
              onChange={setMarketing}
            />
          </>
        ) : (
          <p className="text-xs text-ink-muted">
            No optional services are currently configured. Only essential
            cookies are in use.
          </p>
        )}
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            writeConsentRecord({ essential: true, analytics: false, marketing: false });
            onClose();
          }}
        >
          Reject optional
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={save}>
          Save preferences
        </Button>
      </div>
      <h2 id={headingId} className="sr-only">
        Cookie preferences
      </h2>
    </Modal>
  );
}

function Row({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-line pt-4 first:border-t-0 first:pt-0">
      <div className="max-w-md">
        <p className="text-ink">{title}</p>
        <p className="mt-1 text-xs text-ink-muted">{description}</p>
      </div>
      <label className="inline-flex shrink-0 items-center gap-2 text-xs text-ink-muted">
        <span className="sr-only">Toggle {title}</span>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.checked)}
          className="h-4 w-4 border border-line-strong bg-paper text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
        />
        {disabled ? "Always on" : checked ? "On" : "Off"}
      </label>
    </div>
  );
}

export const __consentCategoryIds: ConsentCategoryId[] = [
  "essential",
  "analytics",
  "marketing",
];
