import "server-only";

/**
 * Server-only order module.
 *
 * Server components, server actions and route handlers that need
 * the order backend (database reads, admin operations, status
 * updates, etc.) should import from this file. Client components
 * must use `@/lib/orders` instead.
 */
export {
  placeOrder,
  listOrdersForCurrentUser,
  getOrderForCurrentUser,
  getOrderConfirmationForCurrentUser,
  lookupOrderForTracking,
  listOrdersForAdmin,
  getOrderForAdmin,
  updateOrderStatus,
  updatePaymentStatus,
  retryNotification,
  requireAdmin,
  isOrderBackendConfigured,
  coerceOrderStatus,
  coercePaymentMethod,
  coercePaymentStatus,
  isValidOrderTransition,
  isValidPaymentTransition,
  type PlaceOrderInput,
  type PlaceOrderInputLine,
  type PlaceOrderResult,
  type AdminOrderListFilters,
  type AdminOrderListResult,
  type AdminOrderDetailResult,
  type OrderNotificationSummary,
  type UpdateOrderStatusInput,
  type UpdateOrderStatusResult,
  type UpdatePaymentStatusInput,
  type UpdatePaymentStatusResult,
  type RetryNotificationResult,
  type AdminGuardResult,
  type TrackingLookupOptions,
} from "./service";
export { resolveNotificationRecipient, type NotificationRecipient } from "./recipient";
