/**
 * Server-safe account module.
 *
 * Client components must import only the React-safe types and
 * actions. The data access services (profile, address, orders)
 * are server-only and must never be bundled into a client component.
 */
export type {
  AddressInput,
  AdminOrderSummary,
  CustomerAddress,
  CustomerProfile,
  DeliveryZone,
  OrderAddressSnapshot,
  OrderCourierTracking,
  OrderDetail,
  OrderItem,
  OrderListState,
  OrderLookupState,
  OrderNotificationSummary,
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderStatus,
  OrderSummary,
  OrderTimelineEvent,
  OrderTrackingResult,
  OrderTrackingState,
} from "./types";
export {
  DELIVERY_ZONE_OPTIONS,
  ORDER_PAYMENT_METHOD_LABEL,
  ORDER_PAYMENT_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  ORDER_TIMELINE_STAGES,
} from "./types";

export {
  accountSignOutAction,
  addAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
  updateAddressAction,
  updateProfileAction,
  type AccountActionResult,
} from "./actions";

export {
  trackOrderAction,
  type TrackOrderActionResult,
} from "./track-action";
