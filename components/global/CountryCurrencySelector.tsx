"use client";

import { useEffect, useId, useState } from "react";
import { Modal } from "@/components/ui";
import { SUPPORTED_MARKETS, isSupportedMarket } from "@/config/market";
import type { SupportedMarket } from "@/config/market";

const STORAGE_KEY = "monoform.market.v1";

/**
 * Persistent market / currency preference. Stored in
 * `localStorage` so the browser preference does not ride on
 * every server request. The active market is always
 * `SUPPORTED_MARKETS[0]` (the only market actually
 * configured); the selector is a display that confirms the
 * choice rather than changing it.
 *
 * The selector never claims to change the order currency —
 * the authoritative currency is set by the server-side order
 * service. Persisting the choice is only useful for showing
 * the visitor the configured market.
 */
export function CountryCurrencySelector({ className }: { className?: string }) {
  const buttonId = useId();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string>(SUPPORTED_MARKETS[0]!.id);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw && isSupportedMarket(raw)) {
        setChosen(raw);
      }
    } catch {
      // localStorage may be unavailable.
    }
  }, []);

  const active = SUPPORTED_MARKETS.find((m) => m.id === chosen) ?? SUPPORTED_MARKETS[0]!;

  function select(market: SupportedMarket) {
    if (!isSupportedMarket(market.id)) return;
    setChosen(market.id);
    try {
      window.localStorage.setItem(STORAGE_KEY, market.id);
    } catch {
      // ignore
    }
    setOpen(false);
  }

  return (
    <>
      <button
        id={buttonId}
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex items-center gap-2 px-2 py-1 text-eyebrow uppercase text-ink transition-colors hover:text-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span aria-hidden="true">{active.countryCode}</span>
        <span>{active.currencySymbol} {active.currency}</span>
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Shipping country &amp; currency"
        description="MONOFORM is currently configured to ship within Bangladesh and accept payment in BDT."
        size="md"
      >
        <ul className="space-y-3">
          {SUPPORTED_MARKETS.map((market) => {
            const isActive = market.id === active.id;
            return (
              <li key={market.id}>
                <button
                  type="button"
                  onClick={() => select(market)}
                  aria-pressed={isActive}
                  className={
                    "flex w-full items-start justify-between gap-4 border border-line bg-paper p-4 text-left transition-colors hover:border-ink " +
                    (isActive ? "border-ink" : "")
                  }
                >
                  <span>
                    <span className="block text-ink">
                      {market.country} ({market.countryCode})
                    </span>
                    <span className="mt-1 block text-xs text-ink-muted">
                      {market.notes ?? "Default market."}
                    </span>
                  </span>
                  <span className="text-right text-xs uppercase tracking-[0.18em] text-ink-muted">
                    {market.currencySymbol} {market.currency}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 text-xs text-ink-muted">
          International checkout and additional currencies are not
          currently supported. The final delivery charge and order total
          are calculated by the order service — this selector changes the
          display label only.
        </p>
      </Modal>
    </>
  );
}
