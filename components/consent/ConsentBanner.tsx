"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Button, Modal } from "@/components/ui";
import {
  hasOptionalServices,
  CONSENT_INTERFACE_VERSION,
} from "@/config/consent";
import type { ConsentCategoryId } from "@/config/consent";
import {
  hasRecordedConsent,
  writeConsentRecord,
} from "@/lib/consent/storage";

/**
 * Site-wide cookie / privacy consent banner.
 *
 * The banner only mounts when:
 *  1. The site has at least one optional service configured
 *     (otherwise there is nothing to consent to), AND
 *  2. The user has not yet saved a consent record.
 *
 * Three actions are always visible and equally weighted:
 *  - Accept all
 *  - Reject optional
 *  - Customize preferences
 *
 * The banner sticks to the bottom of the viewport on mobile so
 * it does not push essential checkout controls out of view, and
 * is rendered as a centred strip on desktop.
 */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);

  useEffect(() => {
    if (!hasOptionalServices()) return;
    if (hasRecordedConsent()) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  function acceptAll() {
    writeConsentRecord({ essential: true, analytics: true, marketing: true });
    setVisible(false);
  }

  function rejectOptional() {
    writeConsentRecord({ essential: true, analytics: false, marketing: false });
    setVisible(false);
  }

  function openPrefs() {
    setPrefsOpen(true);
  }

  return (
    <>
      <div
        role="region"
        aria-label="Cookie preferences"
        className="fixed inset-x-0 bottom-0 z-consent border-t border-line bg-paper-warm px-4 py-4 shadow-sm sm:px-6"
      >
        <div className="container-bleed flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl text-sm text-ink-muted">
            <p className="text-ink">We use cookies.</p>
            <p className="mt-1">
              Essential cookies keep the store working. Optional cookies
              (analytics, marketing) are off by default. You can change
              your choice at any time.{" "}
              <Link href="/privacy" className="link-underline text-ink">
                Privacy policy
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={openPrefs}
            >
              Customize
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={rejectOptional}
            >
              Reject optional
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={acceptAll}
            >
              Accept all
            </Button>
          </div>
        </div>
      </div>
      <PreferencesDialog
        open={prefsOpen}
        onClose={() => setPrefsOpen(false)}
        onSaved={() => {
          setPrefsOpen(false);
          setVisible(false);
        }}
        version={CONSENT_INTERFACE_VERSION}
      />
    </>
  );
}

type PrefsProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  version: string;
};

function PreferencesDialog({ open, onClose, onSaved, version }: PrefsProps) {
  const headingId = useId();
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  function save(custom: Partial<Record<ConsentCategoryId, boolean>>) {
    writeConsentRecord({
      essential: true,
      analytics: custom.analytics ?? analytics,
      marketing: custom.marketing ?? marketing,
    });
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cookie preferences"
      description={`Manage how MONOFORM uses cookies. Interface version ${version}.`}
      size="md"
    >
      <div className="space-y-6 text-sm text-ink-muted">
        <CategoryRow
          id="essential"
          title="Essential"
          description="Required for the store to function — session, authentication, cart and security. Always on."
          checked
          disabled
        />
        {hasOptionalServices() ? (
          <>
            <CategoryRow
              id="analytics"
              title="Analytics"
              description="Help us understand how visitors use the store so we can improve it. Off by default."
              checked={analytics}
              onChange={setAnalytics}
            />
            <CategoryRow
              id="marketing"
              title="Marketing"
              description="Personalised content and offers. Off by default."
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
          Cancel
        </Button>
        {hasOptionalServices() ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => save({ analytics: false, marketing: false })}
          >
            Reject optional
          </Button>
        ) : null}
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => save({})}
        >
          Save preferences
        </Button>
      </div>
      <h2 id={headingId} className="sr-only">
        Cookie preferences
      </h2>
    </Modal>
  );
}

type RowProps = {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (next: boolean) => void;
};

function CategoryRow({ title, description, checked, disabled, onChange }: RowProps) {
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
