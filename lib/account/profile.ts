import "server-only";
import { getSupabaseEnv } from "@/lib/auth/config";
import { createSupabaseServerClient } from "@/lib/auth/server";
import type { CustomerProfile } from "./types";

/**
 * Read the current customer's profile. Returns `null` when the
 * customer is not signed in, when Supabase is not configured, or
 * when the row has not been provisioned yet. The caller is
 * responsible for handling the `null` case (typically by falling
 * back to the empty state).
 */
export async function getCustomerProfile(): Promise<CustomerProfile | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;

  const env = getSupabaseEnv();
  if (!env) return null;

  const { data, error } = await client
    .from("customer_profiles")
    .select("id, full_name, email, phone, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    // RLS denies a non-existent row, but `maybeSingle` already
    // returns `null` instead of throwing for missing rows.
    return null;
  }

  if (!data) {
    return {
      id: user.id,
      fullName: null,
      email: user.email ?? null,
      phone: null,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    };
  }

  return {
    id: (data.id as string) ?? user.id,
    fullName: (data.full_name as string | null) ?? null,
    email: (data.email as string | null) ?? user.email ?? null,
    phone: (data.phone as string | null) ?? null,
    createdAt: (data.created_at as string) ?? "",
    updatedAt: (data.updated_at as string) ?? "",
  };
}

/**
 * Sentinel value returned by the profile / address service when
 * Supabase is not configured. The UI uses it to render an honest
 * "Setup required" message rather than a fake empty state.
 */
export const NOT_CONFIGURED = Symbol.for("account.notConfigured");
export type DataState<T> =
  | { kind: "ok"; value: T }
  | { kind: "missing" }
  | { kind: "not_configured" }
  | { kind: "error"; message: string };
