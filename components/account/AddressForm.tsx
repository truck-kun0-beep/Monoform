"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Input, Select, Textarea } from "@/components/ui";
import {
  addAddressAction,
  updateAddressAction,
  type AccountActionResult,
} from "@/lib/account";
import { normaliseBdPhone } from "@/lib/auth/react";
import type { CustomerAddress, DeliveryZone } from "@/lib/account";
import { DELIVERY_ZONE_OPTIONS } from "@/lib/account";

type Props = {
  /** When provided the form edits an existing address, otherwise it adds. */
  address?: CustomerAddress | null;
  /** Called when the form has been persisted so the parent can close. */
  onSuccess?: (message: string) => void;
  /** Render the cancel button + handler. */
  onCancel?: () => void;
  /**
   * Show a "make default" checkbox. When false (e.g. during the
   * add flow with no addresses yet), the form always saves the
   * address as default.
   */
  showDefaultToggle?: boolean;
};

const initialState: AccountActionResult = { ok: true };

/**
 * Editable address form. Pure form: persists through the server
 * action and reports success through `onSuccess` so the parent
 * (typically a modal) can close.
 *
 * The form is intentionally a client component because it shows
 * inline error feedback and a pending state. The browser never
 * receives the service-role key — every write goes through the
 * server action which itself depends on the validated session.
 */
export function AddressForm({
  address,
  onSuccess,
  onCancel,
  showDefaultToggle = true,
}: Props) {
  const isEdit = Boolean(address);
  const action = isEdit ? updateAddressAction : addAddressAction;
  const [state, formAction] = useActionState<AccountActionResult, FormData>(
    async (_prev, form) => action(form),
    initialState,
  );

  // Track the last rendered "ok" state so we only call `onSuccess`
  // once per success — otherwise React StrictMode would fire the
  // callback twice in development.
  const lastOkRef = useRef<typeof state | null>(null);
  useEffect(() => {
    if (state.ok && state.message && lastOkRef.current !== state) {
      lastOkRef.current = state;
      onSuccess?.(state.message);
    }
  }, [state, onSuccess]);

  const fieldErrors = !state.ok ? state.fieldErrors ?? {} : {};
  const reactId = useId();
  const field = (name: string) => `${name}-${reactId}`;

  const recipientNameDefault = address?.recipientName ?? "";
  const phoneDefault = address?.phone ?? "";
  const districtDefault = address?.district ?? "";
  const localityDefault = address?.locality ?? "";
  const addressLineDefault = address?.addressLine ?? "";
  const additionalDefault = address?.additionalDetails ?? "";
  const postalDefault = address?.postalCode ?? "";
  const instructionsDefault = address?.deliveryInstructions ?? "";
  const zoneDefault: DeliveryZone = address?.deliveryZone ?? "inside_dhaka";
  const isDefaultChecked = address?.isDefault ?? false;

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5"
      aria-label={isEdit ? "Edit address form" : "Add address form"}
    >
      {isEdit && address ? (
        <input type="hidden" name="id" value={address.id} />
      ) : null}

      {state.ok === false ? (
        <div
          role="alert"
          className="border border-danger/40 bg-paper px-4 py-3 text-sm text-ink"
        >
          <p className="text-eyebrow uppercase text-danger">
            Could not save address
          </p>
          <p className="mt-1 text-ink-muted">{state.error}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          id={field("recipientName")}
          name="recipientName"
          label="Recipient's full name"
          autoComplete="name"
          required
          maxLength={80}
          defaultValue={recipientNameDefault}
          error={fieldErrors.recipientName}
        />
        <Input
          id={field("phone")}
          name="phone"
          type="tel"
          label="Recipient's phone"
          autoComplete="tel"
          required
          inputMode="tel"
          defaultValue={phoneDefault}
          placeholder="01XXXXXXXXX"
          helpText="We use this phone to coordinate the delivery."
          error={fieldErrors.phone}
          onBlur={(event) => {
            const normalised = normaliseBdPhone(event.target.value);
            if (normalised && normalised !== event.target.value) {
              event.target.value = normalised;
            }
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          id={field("district")}
          name="district"
          label="District / delivery area"
          autoComplete="address-level2"
          required
          maxLength={80}
          defaultValue={districtDefault}
          placeholder="e.g. Gulshan, Chattogram, Sylhet"
          error={fieldErrors.district}
        />
        <Input
          id={field("locality")}
          name="locality"
          label="Area / neighbourhood"
          autoComplete="address-level3"
          maxLength={80}
          defaultValue={localityDefault}
          placeholder="e.g. Banani, Dhanmondi"
          error={fieldErrors.locality}
        />
      </div>

      <Input
        id={field("addressLine")}
        name="addressLine"
        label="Street address"
        autoComplete="street-address"
        required
        maxLength={240}
        defaultValue={addressLineDefault}
        placeholder="House, road, block"
        error={fieldErrors.addressLine}
      />

      <Input
        id={field("additionalDetails")}
        name="additionalDetails"
        label="Additional details"
        helpText="Floor, apartment, landmark — anything that helps the courier find you."
        maxLength={240}
        defaultValue={additionalDefault}
        error={fieldErrors.additionalDetails}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          id={field("postalCode")}
          name="postalCode"
          label="Postal code"
          autoComplete="postal-code"
          maxLength={16}
          defaultValue={postalDefault}
          error={fieldErrors.postalCode}
        />
        <Select
          id={field("deliveryZone")}
          name="deliveryZone"
          label="Delivery area"
          required
          defaultValue={zoneDefault}
          helpText="Delivery inside Dhaka is ৳70, outside Dhaka ৳120. The exact charge is calculated at checkout."
          error={fieldErrors.deliveryZone}
          options={DELIVERY_ZONE_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
        />
      </div>

      <Textarea
        id={field("deliveryInstructions")}
        name="deliveryInstructions"
        label="Delivery instructions"
        helpText="Optional — leave a note for the courier if needed."
        maxLength={500}
        defaultValue={instructionsDefault}
        error={fieldErrors.deliveryInstructions}
      />

      {showDefaultToggle ? (
        <label className="flex items-center gap-3 text-sm text-ink-muted">
          <input
            type="checkbox"
            name="isDefault"
            defaultChecked={isDefaultChecked}
            className="h-4 w-4 border-line text-ink focus:ring-ink"
          />
          <span>Use as my default delivery address</span>
        </label>
      ) : (
        // Hidden fallback so the form action always receives a value.
        <input type="hidden" name="isDefault" value="on" />
      )}

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <SubmitButton
          pendingLabel={isEdit ? "Saving…" : "Adding…"}
          label={isEdit ? "Save Changes" : "Add Address"}
        />
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-eyebrow uppercase text-ink-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  // useFormStatus requires this component to be a child of a
  // <form>. The pending state is wired by React itself.
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="inline-flex h-11 items-center justify-center gap-2 border border-ink bg-ink px-6 text-eyebrow uppercase text-paper transition-colors hover:bg-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
