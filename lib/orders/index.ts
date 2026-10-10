/**
 * Order module — public surface.
 *
 * This file is safe to import from both server and client
 * components. The server-only services (the `service.ts` module
 * that touches the database) are kept in a separate entry point
 * (`@/lib/orders/server`) so they never end up in the client
 * bundle.
 *
 * Server components and server actions can either import the
 * server-side entry directly or use the re-exports below.
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

export {
  placeOrderAction,
  updateOrderStatusAction,
  updatePaymentStatusAction,
  retryNotificationAction,
  type PlaceOrderActionResult,
  type AdminOrderActionResult,
} from "./actions";

export { DELIVERY_ZONE_OPTIONS } from "@/lib/account/types";
export type { DeliveryZone } from "@/lib/account/types";
