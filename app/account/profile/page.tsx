import {
  AccountShell,
  AccountNotConfiguredNotice,
  ProfileForm,
} from "@/components/account";
import { ErrorMessage } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/auth";
import { getCustomerProfile } from "@/lib/account/profile";

export const metadata = {
  title: "Personal Information",
  description: "Edit your name and contact phone.",
};

/**
 * `/account/profile` — personal information editor.
 *
 * The full name is sourced from `customer_profiles.full_name` if
 * the row has one, otherwise from the auth metadata set during
 * registration. The email is read-only and always comes from the
 * authenticated identity (`auth.users.email`); changes to it are
 * the responsibility of the auth provider, not this form.
 */
export default async function ProfilePage() {
  const user = await requireUser("/account/profile");
  const configured = isSupabaseConfigured();
  const profile = await getCustomerProfile();

  const fullName =
    profile?.fullName?.trim() ||
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "");
  const email = user.email ?? "";
  const phone = profile?.phone ?? "";

  return (
    <AccountShell
      current="/account/profile"
      title="Personal information"
      description="Keep your name and contact phone up to date. The courier uses the contact phone to coordinate the delivery."
    >
      {!configured ? <AccountNotConfiguredNotice /> : null}
      {profile === null && configured ? (
        <ErrorMessage title="Profile unavailable">
          We couldn't read your profile right now. Please try again in a
          moment.
        </ErrorMessage>
      ) : null}

      <ProfileForm
        initialFullName={fullName}
        initialPhone={phone}
        email={email}
        readOnlyEmail
      />
    </AccountShell>
  );
}
