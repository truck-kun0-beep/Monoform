import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { brand } from "@/config/brand";
import { activeMarket } from "@/config/market";
import type { Currency, Money } from "@/types";

/**
 * Combine class names with Tailwind-aware deduplication.
 *
 * @example
 *   cn("px-4", condition && "py-2", "px-6") // -> "py-2 px-6"
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as a localised currency string.
 *
 * BDT (৳) is rendered with the brand's currency symbol as a prefix
 * because the `bn-BD` locale is not always available in headless
 * runtimes; this keeps the storefront legible regardless of the
 * visitor's browser locale. The function never rounds the input
 * value — the caller is responsible for keeping accurate minor
 * units; presentation only affects the display string.
 */
export function formatPrice(
  value: number,
  currency: Currency = activeMarket.currency,
  locale = activeMarket.locale,
): string {
  const safe = Number.isFinite(value) ? value : 0;
  const number = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safe);

  if (currency === "BDT") {
    return `${brand.cartCurrencySymbol}${number}`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(safe);
  } catch {
    return `${currency} ${number}`;
  }
}

/** Convenience wrapper for `Money` values. */
export function formatMoney(money: Money, locale = activeMarket.locale): string {
  return formatPrice(money.amount, money.currency, locale);
}

/**
 * Convert a string to a URL-friendly slug.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/**
 * Conditional render helper that renders `children` only on the client.
 * Use sparingly — most components are RSC by default.
 */
export function isClient(): boolean {
  return typeof window !== "undefined";
}
