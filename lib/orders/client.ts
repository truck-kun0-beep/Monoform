/**
 * Client-safe order types and constants.
 *
 * Client components must import from this file rather than from
 * `@/lib/orders` because the main module is marked
 * `server-only` (it pulls in the service-role Supabase client and
 * the Resend dependency).
 */

export {
  DELIVERY_FEE_PAISA,
  DELIVERY_FEE_TAKA,
  ORDER_CURRENCY,
  SUPPORTED_DELIVERY_ZONES,
  SUPPORTED_PAYMENT_METHODS,
  deliveryFeeForZone,
  paisaToTaka,
  takaToPaisa,
  type OrderPaymentMethod,
} from "./config";

export type {
  PlaceOrderActionResult,
  AdminOrderActionResult,
} from "./actions";

export { DELIVERY_ZONE_OPTIONS } from "@/lib/account/types";
export type { DeliveryZone } from "@/lib/account/types";
