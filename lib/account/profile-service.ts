import "server-only";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { getSupabaseEnv } from "@/lib/auth/config";
import { normaliseBdPhone, validateName } from "@/lib/auth/validation";
import type { CustomerProfile } from "./types";

/**
 * Update the authenticated customer's `full_name` and `phone` in
 * the `customer_profiles` table. The email is deliberately not
 * accepted — Supabase owns the identity and changes must go
 * through its `updateUserById` admin flow, which requires a
 * verification email.
 *
 * The `user_id` is always derived from the session.
 */
export type ProfileWriteResult =
  | { kind: "ok"; profile: CustomerProfile }
  | { kind: "not_configured" }
  | { kind: "validation_error"; errors: Record<string, string> }
  | { kind: "error"; message: string };

export type ProfileInput = {
  fullName: string;
  phone: string;
};

export function validateProfileInput(
  input: ProfileInput,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const nameError = validateName(input.fullName, "Full name");
  if (nameError) errors.fullName = nameError;
  const phone = (input.phone ?? "").trim();
  if (phone.length === 0) {
    // Phone is optional on the profile — the checkout flow asks
    // for a contact phone per order. An empty value is fine.
  } else if (normaliseBdPhone(phone) === null) {
    errors.phone =
      "Enter a valid Bangladeshi phone number (e.g. 01XXXXXXXXX).";
  }
  return errors;
}

export async function updateCustomerProfile(
  input: ProfileInput,
): Promise<ProfileWriteResult> {
  const errors = validateProfileInput(input);
  if (Object.keys(errors).length > 0) {
    return { kind: "validation_error", errors };
  }
  if (!getSupabaseEnv()) return { kind: "not_configured" };

  const client = await createSupabaseServerClient();
  if (!client) return { kind: "not_configured" };
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { kind: "error", message: "Not signed in." };

  const fullName = input.fullName.trim();
  const phoneRaw = input.phone.trim();
  const phone = phoneRaw.length === 0 ? null : normaliseBdPhone(phoneRaw);

  // We use upsert so the row exists after a brand new customer
  // signs up before the trigger has fired. The trigger is still
  // the preferred creation path; this is the recovery path.
  const { data, error } = await client
    .from("customer_profiles")
    .upsert(
      {
        id: user.id,
        full_name: fullName,
        email: user.email ?? null,
        phone,
        // `role` has a default and is protected by a restrictive
        // RLS policy, so we never write it from the client.
      },
      { onConflict: "id" },
    )
    .select("id, full_name, email, phone, created_at, updated_at")
    .single();

  if (error || !data) {
    return { kind: "error", message: "Could not save your changes." };
  }

  return {
    kind: "ok",
    profile: {
      id: (data.id as string) ?? user.id,
      fullName: (data.full_name as string | null) ?? null,
      email: (data.email as string | null) ?? user.email ?? null,
      phone: (data.phone as string | null) ?? null,
      createdAt: (data.created_at as string) ?? "",
      updatedAt: (data.updated_at as string) ?? "",
    },
  };
}
