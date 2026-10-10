/**
 * Centralised market configuration.
 *
 * The current store targets a single market — Bangladesh, with BDT
 * pricing and a BDT-denominated checkout. This module is the single
 * place to add a second market; every consumer (header selector,
 * footer, shipping info, etc.) reads from here so the UI cannot
 * drift away from the actual supported checkout.
 *
 * **Do not** add a market without also adding the corresponding
 * delivery rules, payment methods and supported currencies to the
 * authoritative order service. A market that "looks supported" in
 * the UI but cannot actually be checked out is misleading.
 */

import type { Currency } from "@/types";

export type SupportedMarket = {
  /** Stable market id. */
  id: string;
  /** Public-facing country label, e.g. "Bangladesh". */
  country: string;
  /** ISO 3166-1 alpha-2 code, used as a stable key. */
  countryCode: "BD" | string;
  /** The currency used for pricing, delivery and order totals. */
  currency: Currency;
  /** Display symbol for the currency. */
  currencySymbol: string;
  /** BCP-47 locale used for formatting. */
  locale: string;
  /** Free-form notes shown in the country selector. Never
   *  fabricate delivery coverage or international availability. */
  notes?: string;
};

export const SUPPORTED_MARKETS: ReadonlyArray<SupportedMarket> = [
  {
    id: "bd",
    country: "Bangladesh",
    countryCode: "BD",
    currency: "BDT",
    currencySymbol: "৳",
    locale: "en-BD",
    notes: "Orders ship within Bangladesh only.",
  },
];

/** The default / currently active market. Single-market today. */
export const activeMarket: SupportedMarket = SUPPORTED_MARKETS[0]!;

/**
 * Returns true when the given market id is one of the markets
 * actually supported by the store. Used to validate any
 * persisted / submitted market preference so a stale browser
 * preference cannot pretend the order supports a market the
 * backend does not.
 */
export function isSupportedMarket(marketId: string | null | undefined): boolean {
  if (!marketId) return false;
  return SUPPORTED_MARKETS.some((market) => market.id === marketId);
}
