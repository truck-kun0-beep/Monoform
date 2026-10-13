"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { getSupabaseEnv } from "@/lib/auth/config";
import {
  normaliseBdPhone,
  validateName,
  validateRequiredBdPhone,
} from "@/lib/auth/validation";
import {
  addAddress,
  deleteAddress,
  isAccountBackendConfigured,
  setDefaultAddress,
  updateAddress,
  validateAddressInput,
} from "./address";
import {
  updateCustomerProfile,
  type ProfileInput,
} from "./profile-service";
import type { AddressInput, DeliveryZone } from "./types";

/**
 * Server actions for the account area.
 *
 * Every action:
 *   1. validates the form input on the server (the client is a hint,
 *      not a source of truth);
 *   2. derives the customer identity from the validated session;
 *   3. writes through the address / profile service, which is
 *      itself guarded by RLS;
 *   4. revalidates the affected routes so the next render shows the
 *      updated data.
 *
 * The browser never sees the service-role key. RLS refuses any
 * write whose `auth.uid()` does not match the row's owner.
 */

/* ------------------------------------------------------------------ *
 * Result discriminated union — used by the client components to
 * render inline errors without losing form state.
 * ------------------------------------------------------------------ */

export type AccountActionResult =
  | { ok: true; redirectTo?: string; message?: string }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string>;
    };

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function formString(form: FormData, key: string): string {
  const raw = form.get(key);
  return typeof raw === "string" ? raw : "";
}

function formOptional(form: FormData, key: string): string | undefined {
  const raw = form.get(key);
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function formBool(form: FormData, key: string): boolean {
  return form.get(key) === "on" || form.get(key) === "true";
}

function ensureBackend(): AccountActionResult | null {
  if (!isAccountBackendConfigured() || !getSupabaseEnv()) {
    return {
      ok: false,
      error:
        "Account data is not connected to a Supabase project. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or the legacy NEXT_PUBLIC_SUPABASE_ANON_KEY) to your environment, then run the migrations in /supabase.",
    };
  }
  return null;
}

function sanitiseAddressInput(form: FormData): AddressInput {
  const deliveryZoneRaw = formString(form, "deliveryZone") as DeliveryZone;
  return {
    recipientName: formString(form, "recipientName"),
    phone: formString(form, "phone"),
    district: formString(form, "district"),
    locality: formOptional(form, "locality"),
    addressLine: formString(form, "addressLine"),
    additionalDetails: formOptional(form, "additionalDetails"),
    postalCode: formOptional(form, "postalCode"),
    deliveryZone: (["inside_dhaka", "outside_dhaka"] as const).includes(
      deliveryZoneRaw,
    )
      ? deliveryZoneRaw
      : "inside_dhaka",
    deliveryInstructions: formOptional(form, "deliveryInstructions"),
    isDefault: formBool(form, "isDefault"),
  };
}

/* ------------------------------------------------------------------ *
 * Profile update
 * ------------------------------------------------------------------ */

export async function updateProfileAction(
  form: FormData,
): Promise<AccountActionResult> {
  const notReady = ensureBackend();
  if (notReady) return notReady;

  const input: ProfileInput = {
    fullName: formString(form, "fullName"),
    phone: formString(form, "phone"),
  };

  const result = await updateCustomerProfile(input);
  if (result.kind === "validation_error") {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: result.errors,
    };
  }
  if (result.kind === "error") {
    return { ok: false, error: result.message };
  }
  if (result.kind === "not_configured") {
    return {
      ok: false,
      error: "Account data is not connected to a Supabase project yet.",
    };
  }

  revalidatePath("/account");
  revalidatePath("/account/profile");
  return { ok: true, message: "Profile updated." };
}

/* ------------------------------------------------------------------ *
 * Add address
 * ------------------------------------------------------------------ */

export async function addAddressAction(
  form: FormData,
): Promise<AccountActionResult> {
  const notReady = ensureBackend();
  if (notReady) return notReady;

  const input = sanitiseAddressInput(form);
  const errors: Record<string, string> = { ...validateAddressInput(input) };

  // Phone must be valid for BD delivery.
  const phoneError = validateRequiredBdPhone(input.phone);
  if (phoneError) errors.phone = phoneError;
  // District must be a real place name.
  const districtError = validateName(input.district, "District");
  if (districtError) errors.district = districtError;

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: errors,
    };
  }

  // Server-side normalisation of the phone so storage stays consistent.
  const normalised = normaliseBdPhone(input.phone);
  if (!normalised) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: { phone: "Enter a valid Bangladeshi phone number." },
    };
  }
  const normalisedInput: AddressInput = {
    ...input,
    phone: normalised,
  };

  const result = await addAddress(normalisedInput);
  if (result.kind === "validation_error") {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: result.errors,
    };
  }
  if (result.kind === "error") {
    return { ok: false, error: result.message };
  }
  if (result.kind === "not_configured") {
    return {
      ok: false,
      error: "Account data is not connected to a Supabase project yet.",
    };
  }

  revalidatePath("/account/addresses");
  revalidatePath("/account");
  return { ok: true, message: "Address added." };
}

/* ------------------------------------------------------------------ *
 * Update address
 * ------------------------------------------------------------------ */

export async function updateAddressAction(
  form: FormData,
): Promise<AccountActionResult> {
  const notReady = ensureBackend();
  if (notReady) return notReady;

  const id = formString(form, "id");
  if (!id) {
    return { ok: false, error: "Address not found." };
  }

  const input = sanitiseAddressInput(form);
  const errors: Record<string, string> = { ...validateAddressInput(input) };
  const phoneError = validateRequiredBdPhone(input.phone);
  if (phoneError) errors.phone = phoneError;
  const districtError = validateName(input.district, "District");
  if (districtError) errors.district = districtError;

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: errors,
    };
  }

  const normalised = normaliseBdPhone(input.phone);
  if (!normalised) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: { phone: "Enter a valid Bangladeshi phone number." },
    };
  }
  const normalisedInput: AddressInput = {
    ...input,
    phone: normalised,
  };

  const result = await updateAddress(id, normalisedInput);
  if (result.kind === "validation_error") {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: result.errors,
    };
  }
  if (result.kind === "error") {
    return { ok: false, error: result.message };
  }
  if (result.kind === "not_configured") {
    return {
      ok: false,
      error: "Account data is not connected to a Supabase project yet.",
    };
  }

  revalidatePath("/account/addresses");
  revalidatePath("/account");
  return { ok: true, message: "Address updated." };
}

/* ------------------------------------------------------------------ *
 * Delete address
 * ------------------------------------------------------------------ */

export async function deleteAddressAction(
  form: FormData,
): Promise<AccountActionResult> {
  const notReady = ensureBackend();
  if (notReady) return notReady;

  const id = formString(form, "id");
  if (!id) return { ok: false, error: "Address not found." };

  const result = await deleteAddress(id);
  if (result.kind === "error") {
    return { ok: false, error: result.message };
  }

  revalidatePath("/account/addresses");
  revalidatePath("/account");
  return { ok: true, message: "Address removed." };
}

/* ------------------------------------------------------------------ *
 * Set default address
 * ------------------------------------------------------------------ */

export async function setDefaultAddressAction(
  form: FormData,
): Promise<AccountActionResult> {
  const notReady = ensureBackend();
  if (notReady) return notReady;

  const id = formString(form, "id");
  if (!id) return { ok: false, error: "Address not found." };

  const result = await setDefaultAddress(id);
  if (result.kind === "error") {
    return { ok: false, error: result.message };
  }

  revalidatePath("/account/addresses");
  revalidatePath("/account");
  return { ok: true, message: "Default updated." };
}

/* ------------------------------------------------------------------ *
 * Sign out (server action)
 * ------------------------------------------------------------------ */

export async function accountSignOutAction(): Promise<void> {
  const client = await createSupabaseServerClient();
  if (client) {
    await client.auth.signOut();
  }
  // The redirect happens from a client component to keep the
  // server bundle free of `next/navigation` redirects. This
  // action only invalidates the session.
}
