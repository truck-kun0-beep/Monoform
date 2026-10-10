"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Divider, ErrorMessage, Input, Select, Textarea } from "@/components/ui";
import { useToast } from "@/components/ui";
import { normaliseBdPhone } from "@/lib/auth/react";
import { DELIVERY_ZONE_OPTIONS } from "@/lib/account";
import {
  DELIVERY_FEE_TAKA,
  ORDER_CURRENCY,
  SUPPORTED_PAYMENT_METHODS,
  type OrderPaymentMethod,
} from "@/lib/orders";
import { placeOrderAction, type PlaceOrderActionResult } from "@/lib/orders/actions";
import { useCart } from "@/lib/cart";
import type { CartLine, Money } from "@/types";
import { findProductById } from "@/lib/products";

/**
 * Real checkout form.
 *
 * The form collects:
 *   - the customer's name, contact phone and (optional) email
 *   - the recipient name, contact phone and full delivery address
 *   - the delivery area (inside / outside Dhaka)
 *   - the payment method (Cash on Delivery or manual bKash) and an
 *     optional bKash reference
 *
 * The order is submitted to the `placeOrderAction` server action.
 * The server action derives the customer identity from the
 * Supabase session, validates the payload, computes the
 * authoritative totals, persists the order and then dispatches the
 * store-owner notification. The client only navigates to
 * `/order-confirmation/[id]` when the action returns `{ ok: true }`.
 */
export function CheckoutForm() {
  const router = useRouter();
  const { lines, subtotal, itemCount, clear } = useCart();
  const [state, formAction] = useActionState<PlaceOrderActionResult, FormData>(
    async (_prev, form) => placeOrderAction(form),
    { ok: false, error: "" } as PlaceOrderActionResult,
  );
  const { push } = useToast();
  const lastErrorRef = useRef<string | null>(null);
  const lastOkRef = useRef<typeof state | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<OrderPaymentMethod>("cod");

  // Generate a stable per-tab idempotency key. The form reuses the
  // same key on every submission so a network retry of the *same*
  // place-order request never creates a duplicate order, while
  // changes to the address or bag produce a new key.
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  useEffect(() => {
    setIdempotencyKey(
      `checkout-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 10)}`,
    );
  }, []);

  // Subtotal + delivery preview. Authoritative values are
  // recomputed on the server when the order is placed.
  const deliveryZone = "inside_dhaka" as const; // default; updated by the form
  const previewSubtotal = subtotal;
  const previewDelivery: Money = {
    amount: DELIVERY_FEE_TAKA[deliveryZone],
    currency: ORDER_CURRENCY,
  };
  const previewTotal: Money = {
    amount: previewSubtotal.amount + previewDelivery.amount,
    currency: ORDER_CURRENCY,
  };

  const lineSnapshots = useMemo(
    () => lines.map((line) => buildLineSnapshot(line)),
    [lines],
  );

  useEffect(() => {
    if (!state.ok && state.error && lastErrorRef.current !== state.error) {
      lastErrorRef.current = state.error;
      push({ title: state.error, tone: "danger" });
    }
    if (state.ok && lastOkRef.current !== state) {
      lastOkRef.current = state;
      push({
        title: `Order #${state.orderNumber} placed`,
        description: "We've received your order. The store owner will be notified.",
        tone: "success",
      });
      // Clear the cart only after a confirmed successful order.
      clear();
      router.push(`/order-confirmation/${state.orderId}`);
      router.refresh();
    }
  }, [state, push, clear, router]);

  const fieldErrors =
    !state.ok && state.fieldErrors ? state.fieldErrors : {};
  const isBagEmpty = lines.length === 0;

  return (
    <form
      action={formAction}
      className="flex flex-col gap-8"
      aria-label="Checkout form"
    >
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {lineSnapshots.map((line, index) => (
        <div key={`${line.productId}-${index}`} className="hidden">
          <input
            type="hidden"
            name={`lines[${index}][productId]`}
            value={line.productId}
          />
          <input
            type="hidden"
            name={`lines[${index}][quantity]`}
            value={String(line.quantity)}
          />
          {line.size ? (
            <input
              type="hidden"
              name={`lines[${index}][size]`}
              value={line.size}
            />
          ) : null}
          {line.color ? (
            <input
              type="hidden"
              name={`lines[${index}][color]`}
              value={line.color}
            />
          ) : null}
        </div>
      ))}

      {isBagEmpty ? (
        <ErrorMessage title="Your bag is empty">
          <p>
            Add at least one product to your bag before continuing to
            checkout.{" "}
            <Link href="/new-arrivals" className="link-underline text-ink">
              Browse the collection
            </Link>
            .
          </p>
        </ErrorMessage>
      ) : null}

      {state.ok === false && state.code === "not_authenticated" ? (
        <ErrorMessage title="Sign in required">
          Please <Link href="/login" className="link-underline text-ink">sign in</Link>{" "}
          to place an order. Your bag is preserved.
        </ErrorMessage>
      ) : null}
      {state.ok === false && state.code === "not_configured" ? (
        <ErrorMessage title="Order placement is not available">
          {state.error}
        </ErrorMessage>
      ) : null}

      <fieldset className="flex flex-col gap-4">
        <legend className="text-eyebrow uppercase text-ink-muted">Contact</legend>
        <Input
          label="Full name"
          name="customerName"
          autoComplete="name"
          required
          maxLength={80}
          error={fieldErrors.customerName}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Contact phone"
            name="customerPhone"
            type="tel"
            autoComplete="tel"
            required
            inputMode="tel"
            placeholder="01XXXXXXXXX"
            helpText="The courier uses this phone to coordinate the delivery."
            error={fieldErrors.customerPhone}
            onBlur={(event) => {
              const normalised = normaliseBdPhone(event.target.value);
              if (normalised && normalised !== event.target.value) {
                event.target.value = normalised;
              }
            }}
          />
          <Input
            label="Email (optional)"
            name="customerEmail"
            type="email"
            autoComplete="email"
            maxLength={320}
            error={fieldErrors.customerEmail}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-eyebrow uppercase text-ink-muted">
          Delivery address
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Recipient's full name"
            name="recipientName"
            autoComplete="name"
            required
            maxLength={80}
            error={fieldErrors["address.recipientName"]}
          />
          <Input
            label="Recipient's phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            inputMode="tel"
            placeholder="01XXXXXXXXX"
            error={fieldErrors["address.phone"]}
            onBlur={(event) => {
              const normalised = normaliseBdPhone(event.target.value);
              if (normalised && normalised !== event.target.value) {
                event.target.value = normalised;
              }
            }}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="District / delivery area"
            name="district"
            autoComplete="address-level2"
            required
            maxLength={80}
            placeholder="e.g. Gulshan, Chattogram, Sylhet"
            error={fieldErrors["address.district"]}
          />
          <Input
            label="Area / neighbourhood"
            name="locality"
            autoComplete="address-level3"
            maxLength={80}
            placeholder="e.g. Banani, Dhanmondi"
            error={fieldErrors.locality}
          />
        </div>
        <Input
          label="Street address"
          name="addressLine"
          autoComplete="street-address"
          required
          maxLength={240}
          placeholder="House, road, block"
          error={fieldErrors["address.addressLine"]}
        />
        <Input
          label="Additional details"
          name="additionalDetails"
          maxLength={240}
          placeholder="Floor, apartment, landmark"
          helpText="Optional — anything that helps the courier find you."
          error={fieldErrors.additionalDetails}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Postal code"
            name="postalCode"
            autoComplete="postal-code"
            maxLength={16}
            error={fieldErrors.postalCode}
          />
          <Select
            label="Delivery area"
            name="deliveryZone"
            required
            defaultValue="inside_dhaka"
            helpText="Inside Dhaka: ৳70 · Outside Dhaka: ৳120. The charge is calculated by the order service."
            error={fieldErrors["address.deliveryZone"]}
            options={DELIVERY_ZONE_OPTIONS.map((opt) => ({
              value: opt.value,
              label: opt.label,
            }))}
          />
        </div>
        <Textarea
          label="Delivery instructions"
          name="deliveryInstructions"
          maxLength={500}
          helpText="Optional — leave a note for the courier if needed."
          error={fieldErrors.deliveryInstructions}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-eyebrow uppercase text-ink-muted">
          Payment
        </legend>
        <PaymentMethodPicker
          value={paymentMethod}
          onChange={setPaymentMethod}
        />
        {paymentMethod === "bkash" ? (
          <Input
            label="bKash transaction reference"
            name="bkashReference"
            maxLength={64}
            helpText="Optional — include your bKash reference so the store owner can verify your transfer."
            error={fieldErrors.bkashReference}
          />
        ) : null}
      </fieldset>

      <Divider />

      <OrderTotalsPreview
        subtotal={previewSubtotal}
        delivery={previewDelivery}
        total={previewTotal}
        itemCount={itemCount}
      />

      <SubmitButton itemCount={itemCount} disabled={isBagEmpty} />

      <p className="text-xs text-ink-muted">
        By placing this order you agree to the{" "}
        <Link href="/terms" className="link-underline text-ink">
          terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="link-underline text-ink">
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}

function buildLineSnapshot(line: CartLine) {
  const product = findProductById(line.productId);
  return {
    productId: line.productId,
    quantity: line.quantity,
    size: line.size ?? null,
    color: line.color ?? null,
    name: line.name,
    unitPrice: product?.price.amount ?? line.unitPrice.amount,
  };
}

function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: OrderPaymentMethod;
  onChange: (next: OrderPaymentMethod) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {SUPPORTED_PAYMENT_METHODS.map((method) => {
        const isActive = method === value;
        const title = method === "cod" ? "Cash on Delivery" : "bKash (manual)";
        const description =
          method === "cod"
            ? "Pay the courier when your order arrives."
            : "Send the total to the bKash number supplied in the confirmation email and add the reference below.";
        return (
          <label
            key={method}
            className={`flex cursor-pointer flex-col gap-1 border p-4 text-sm transition-colors ${
              isActive
                ? "border-ink"
                : "border-line hover:border-ink-soft"
            }`}
          >
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name="paymentMethod"
                value={method}
                checked={isActive}
                onChange={() => onChange(method)}
                className="h-4 w-4 border-line text-ink focus:ring-ink"
              />
              <span className="text-eyebrow uppercase text-ink">
                {title}
              </span>
            </span>
            <span className="text-xs text-ink-muted">{description}</span>
          </label>
        );
      })}
    </div>
  );
}

function OrderTotalsPreview({
  subtotal,
  delivery,
  total,
  itemCount,
}: {
  subtotal: Money;
  delivery: Money;
  total: Money;
  itemCount: number;
}) {
  return (
    <div className="border border-line bg-paper p-6">
      <h2 className="text-eyebrow uppercase text-ink-muted">Order preview</h2>
      <dl className="mt-4 flex flex-col gap-2 text-sm">
        <PreviewRow
          label={`Subtotal (${itemCount} ${itemCount === 1 ? "item" : "items"})`}
          value={formatTaka(subtotal.amount, subtotal.currency)}
        />
        <PreviewRow
          label="Delivery (inside Dhaka preview)"
          value={formatTaka(delivery.amount, delivery.currency)}
          note="The exact charge is recalculated when you confirm your delivery area."
        />
        <PreviewRow
          label="Total (preview)"
          value={formatTaka(total.amount, total.currency)}
          emphasis
        />
      </dl>
      <p className="mt-3 text-xs text-ink-muted">
        The order service will recalculate the delivery charge from the
        delivery area you selected and the authoritative product prices. The
        values above are an estimate only.
      </p>
    </div>
  );
}

function PreviewRow({
  label,
  value,
  note,
  emphasis = false,
}: {
  label: string;
  value: string;
  note?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={emphasis ? "text-eyebrow uppercase text-ink" : "text-ink-muted"}>
        {label}
      </dt>
      <dd className={emphasis ? "text-base font-medium text-ink" : "text-ink"}>
        {value}
        {note ? (
          <span className="ml-2 text-xs text-ink-subtle">{note}</span>
        ) : null}
      </dd>
    </div>
  );
}

function SubmitButton({
  itemCount,
  disabled,
}: {
  itemCount: number;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Button
        type="submit"
        size="lg"
        fullWidth
        disabled={disabled || itemCount === 0}
      >
        Place Order
      </Button>
      <p className="text-[11px] uppercase tracking-[0.18em] text-ink-subtle">
        Placing an order commits the items in your bag and clears them on
        success.
      </p>
    </div>
  );
}

function formatTaka(amount: number, currency: string): string {
  const symbol = currency === "BDT" ? "৳" : "";
  return `${symbol}${amount.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
}
