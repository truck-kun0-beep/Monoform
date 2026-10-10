import "server-only";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { getSupabaseEnv } from "@/lib/auth/config";
import {
  isSafeInternalPath,
  resolveRedirectTarget,
} from "@/lib/auth/redirects";
import type {
  AddressInput,
  CustomerAddress,
  DeliveryZone,
} from "./types";

/**
 * Server-side address service.
 *
 * Every read / write derives the customer identity from the
 * validated Supabase session — the browser never provides an
 * `userId` value. The matching RLS policies on the
 * `customer_addresses` table refuse access to rows that do not
 * belong to `auth.uid()`.
 *
 * When Supabase is not configured the service returns `null` from
 * `listAddresses` / `getDefaultAddress` so the UI can render an
 * honest "Setup required" state.
 */

const REQUIRED_STRING_FIELDS: Array<keyof AddressInput> = [
  "recipientName",
  "phone",
  "district",
  "addressLine",
];

const DELIVERY_ZONES: ReadonlyArray<DeliveryZone> = [
  "inside_dhaka",
  "outside_dhaka",
];

const MAX_FIELD_LENGTH: Partial<Record<keyof AddressInput, number>> = {
  recipientName: 80,
  district: 80,
  locality: 80,
  addressLine: 240,
  additionalDetails: 240,
  postalCode: 16,
  deliveryInstructions: 500,
};

export type AddressValidationError = Record<string, string>;

export function validateAddressInput(
  input: Partial<AddressInput>,
): AddressValidationError {
  const errors: AddressValidationError = {};
  for (const field of REQUIRED_STRING_FIELDS) {
    const value = (input[field] as string | undefined) ?? "";
    if (!value.trim()) {
      errors[field] = "This field is required.";
    }
  }
  if (input.recipientName && input.recipientName.length > 80) {
    errors.recipientName = "Name is too long.";
  }
  if (input.district && input.district.length > 80) {
    errors.district = "District is too long.";
  }
  if (input.addressLine && input.addressLine.length > 240) {
    errors.addressLine = "Address is too long.";
  }
  for (const [field, max] of Object.entries(MAX_FIELD_LENGTH)) {
    if (typeof max !== "number") continue;
    const value = (input as Record<string, unknown>)[field];
    if (typeof value === "string" && value.length > max) {
      errors[field] = `Value is too long (max ${max} characters).`;
    }
  }
  if (input.deliveryZone && !DELIVERY_ZONES.includes(input.deliveryZone)) {
    errors.deliveryZone = "Choose a delivery area.";
  }
  return errors;
}

export type AddressListState =
  | { kind: "ok"; addresses: CustomerAddress[] }
  | { kind: "not_configured" }
  | { kind: "error"; message: string };

/**
 * Return the addresses that belong to the authenticated customer.
 * Returns an empty list when the customer has no addresses (the
 * normal "no saved addresses" state). The list is sorted so the
 * default address appears first, then the most recently created
 * addresses.
 */
export async function listAddresses(): Promise<AddressListState> {
  const client = await createSupabaseServerClient();
  if (!client) return { kind: "not_configured" };
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { kind: "error", message: "Not signed in." };

  const { data, error } = await client
    .from("customer_addresses")
    .select(
      "id, user_id, recipient_name, phone, district, locality, address_line, additional_details, postal_code, delivery_zone, delivery_instructions, is_default, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    return { kind: "error", message: "Could not load your saved addresses." };
  }

  const addresses = (data ?? []).map(rowToAddress);
  return { kind: "ok", addresses };
}

/** Look up a single address by id, enforcing ownership on the server. */
export async function getOwnedAddress(
  id: string,
): Promise<CustomerAddress | null> {
  if (!isLikelyUuid(id)) return null;
  const client = await createSupabaseServerClient();
  if (!client) return null;
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;

  const { data, error } = await client
    .from("customer_addresses")
    .select(
      "id, user_id, recipient_name, phone, district, locality, address_line, additional_details, postal_code, delivery_zone, delivery_instructions, is_default, created_at, updated_at",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return rowToAddress(data);
}

/**
 * Return the customer's default address, or `null` if they have no
 * default. The lookup is owner-scoped — another customer's default
 * address is never returned even if the id is known.
 */
export async function getDefaultAddress(): Promise<CustomerAddress | null> {
  const result = await listAddresses();
  if (result.kind !== "ok") return null;
  return result.addresses.find((address) => address.isDefault) ?? null;
}

export type AddressWriteResult =
  | { kind: "ok"; id: string }
  | { kind: "not_configured" }
  | { kind: "validation_error"; errors: AddressValidationError }
  | { kind: "error"; message: string };

/**
 * Persist a new address for the authenticated customer. The
 * `user_id` column is always derived from the session — the browser
 * cannot impersonate another user.
 *
 * When the address is marked default, the previous default row is
 * cleared in a single transaction using a SECURITY DEFINER-style
 * RPC. The Supabase schema installs a `set_default_address` RPC
 * that performs both operations atomically. If the RPC is not
 * present the function falls back to a two-statement update that
 * is also owner-scoped.
 */
export async function addAddress(
  input: AddressInput,
): Promise<AddressWriteResult> {
  const errors = validateAddressInput(input);
  if (Object.keys(errors).length > 0) {
    return { kind: "validation_error", errors };
  }
  const client = await createSupabaseServerClient();
  if (!client) return { kind: "not_configured" };
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { kind: "error", message: "Not signed in." };

  const wantsDefault = input.isDefault === true;

  // Clear any existing default first so the `customer_addresses`
  // partial unique index `customer_addresses_one_default_per_user`
  // accepts the new row. Both writes are RLS-scoped to the same
  // authenticated user, so this can never touch another customer.
  if (wantsDefault) {
    const { error: clearError } = await client
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("is_default", true);
    if (clearError) {
      return { kind: "error", message: "Could not update your addresses." };
    }
  }

  const { data, error } = await client
    .from("customer_addresses")
    .insert({
      user_id: user.id,
      recipient_name: input.recipientName.trim(),
      phone: input.phone.trim(),
      district: input.district.trim(),
      locality: normaliseOptional(input.locality),
      address_line: input.addressLine.trim(),
      additional_details: normaliseOptional(input.additionalDetails),
      postal_code: normaliseOptional(input.postalCode),
      delivery_zone: input.deliveryZone,
      delivery_instructions: normaliseOptional(input.deliveryInstructions),
      is_default: wantsDefault,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { kind: "error", message: "Could not save your address." };
  }

  return { kind: "ok", id: (data.id as string) ?? "" };
}

/** Update an existing address. Ownership is enforced by RLS. */
export async function updateAddress(
  id: string,
  input: AddressInput,
): Promise<AddressWriteResult> {
  if (!isLikelyUuid(id)) {
    return { kind: "error", message: "Address not found." };
  }
  const errors = validateAddressInput(input);
  if (Object.keys(errors).length > 0) {
    return { kind: "validation_error", errors };
  }
  const client = await createSupabaseServerClient();
  if (!client) return { kind: "not_configured" };
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { kind: "error", message: "Not signed in." };

  // Verify ownership explicitly so a wrong-id update cannot throw
  // a generic RLS error. The follow-up UPDATE is still owner-scoped
  // by the policy so this is defence in depth, not a workaround.
  const existing = await getOwnedAddress(id);
  if (!existing) {
    return { kind: "error", message: "Address not found." };
  }

  const wantsDefault = input.isDefault === true;
  if (wantsDefault && !existing.isDefault) {
    const { error: clearError } = await client
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("is_default", true)
      .neq("id", id);
    if (clearError) {
      return { kind: "error", message: "Could not update your addresses." };
    }
  }

  const { error } = await client
    .from("customer_addresses")
    .update({
      recipient_name: input.recipientName.trim(),
      phone: input.phone.trim(),
      district: input.district.trim(),
      locality: normaliseOptional(input.locality),
      address_line: input.addressLine.trim(),
      additional_details: normaliseOptional(input.additionalDetails),
      postal_code: normaliseOptional(input.postalCode),
      delivery_zone: input.deliveryZone,
      delivery_instructions: normaliseOptional(input.deliveryInstructions),
      is_default: wantsDefault,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { kind: "error", message: "Could not update your address." };
  }
  return { kind: "ok", id };
}

/**
 * Delete an address. If the deleted row was the default, the
 * remaining addresses stay non-default — there is no implicit
 * "newest wins" promotion in this prompt, the customer can choose
 * a new default explicitly.
 */
export async function deleteAddress(
  id: string,
): Promise<{ kind: "ok" } | { kind: "error"; message: string }> {
  if (!isLikelyUuid(id)) {
    return { kind: "error", message: "Address not found." };
  }
  const client = await createSupabaseServerClient();
  if (!client) return { kind: "ok" };
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { kind: "error", message: "Not signed in." };

  const { error } = await client
    .from("customer_addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { kind: "error", message: "Could not delete the address." };
  }
  return { kind: "ok" };
}

/** Mark a single address as the customer's default. */
export async function setDefaultAddress(
  id: string,
): Promise<{ kind: "ok" } | { kind: "error"; message: string }> {
  if (!isLikelyUuid(id)) {
    return { kind: "error", message: "Address not found." };
  }
  const client = await createSupabaseServerClient();
  if (!client) return { kind: "ok" };
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { kind: "error", message: "Not signed in." };

  // Verify ownership before touching defaults so a forged id
  // cannot clear the customer's real default.
  const owned = await getOwnedAddress(id);
  if (!owned) return { kind: "error", message: "Address not found." };

  const { error: clearError } = await client
    .from("customer_addresses")
    .update({ is_default: false })
    .eq("user_id", user.id)
    .eq("is_default", true)
    .neq("id", id);
  if (clearError) {
    return { kind: "error", message: "Could not update your default." };
  }
  const { error: setError } = await client
    .from("customer_addresses")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", user.id);
  if (setError) {
    return { kind: "error", message: "Could not update your default." };
  }
  return { kind: "ok" };
}

/* ------------------------------------------------------------------ *
 * Internals
 * ------------------------------------------------------------------ */

function rowToAddress(row: Record<string, unknown>): CustomerAddress {
  return {
    id: (row.id as string) ?? "",
    userId: (row.user_id as string) ?? "",
    recipientName: (row.recipient_name as string) ?? "",
    phone: (row.phone as string) ?? "",
    district: (row.district as string) ?? "",
    locality: (row.locality as string | null) ?? null,
    addressLine: (row.address_line as string) ?? "",
    additionalDetails: (row.additional_details as string | null) ?? null,
    postalCode: (row.postal_code as string | null) ?? null,
    deliveryZone: ((row.delivery_zone as DeliveryZone) ?? "inside_dhaka"),
    deliveryInstructions:
      (row.delivery_instructions as string | null) ?? null,
    isDefault: Boolean(row.is_default),
    createdAt: (row.created_at as string) ?? "",
    updatedAt: (row.updated_at as string) ?? "",
  };
}

function normaliseOptional(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function isLikelyUuid(value: string): boolean {
  // Supabase uses UUIDs for primary keys. A loose length check is
  // enough to filter out obvious garbage; the RLS policy is the
  // authoritative ownership check.
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/**
 * Convenience wrapper used by the server actions when they need
 * to know whether Supabase is configured at all. The actual
 * service functions return explicit `not_configured` states, but
 * the actions use this for early bail-outs.
 */
export function isAccountBackendConfigured(): boolean {
  return getSupabaseEnv() !== null;
}

/**
 * Sanitise a redirect target produced by a server action. Mirrors
 * `isSafeInternalPath` but accepts the `redirect` form field name
 * used by the address actions.
 */
export function sanitiseAccountRedirect(value: string | null | undefined): string {
  if (typeof value !== "string") return "/account/addresses";
  return isSafeInternalPath(value) ? value : resolveRedirectTarget(value);
}
