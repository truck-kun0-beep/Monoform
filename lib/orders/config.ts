import { brand } from "@/config/brand";
import type { DeliveryZone } from "@/lib/account";

/**
 * Centralised delivery pricing for the order backend.
 *
 * The cart and the address manager must never compute a charge on
 * their own. The single source of truth is this module, which the
 * checkout, the order placement, the admin order detail and the
 * confirmation pages all import.
 */
export const DELIVERY_FEE_PAISA: Record<DeliveryZone, number> = {
  inside_dhaka: 7000, // ৳70.00
  outside_dhaka: 12000, // ৳120.00
};

export const DELIVERY_FEE_TAKA: Record<DeliveryZone, number> = {
  inside_dhaka: DELIVERY_FEE_PAISA.inside_dhaka / 100,
  outside_dhaka: DELIVERY_FEE_PAISA.outside_dhaka / 100,
};

/** The currency all orders are denominated in. */
export const ORDER_CURRENCY = brand.cartCurrency;

export const SUPPORTED_DELIVERY_ZONES: ReadonlyArray<DeliveryZone> = [
  "inside_dhaka",
  "outside_dhaka",
];

export const SUPPORTED_PAYMENT_METHODS = ["cod", "bkash"] as const;
export type OrderPaymentMethod = (typeof SUPPORTED_PAYMENT_METHODS)[number];

/** Convert a taka amount (BDT) to paisa (integer minor units). */
export function takaToPaisa(taka: number): number {
  if (!Number.isFinite(taka)) return 0;
  return Math.max(0, Math.round(taka * 100));
}

/** Convert a paisa amount back to taka (BDT). */
export function paisaToTaka(paisa: number): number {
  if (!Number.isFinite(paisa)) return 0;
  return Math.max(0, paisa) / 100;
}

/** Look up the delivery fee in paisa for a delivery zone. */
export function deliveryFeeForZone(zone: DeliveryZone): number {
  return DELIVERY_FEE_PAISA[zone] ?? 0;
}
