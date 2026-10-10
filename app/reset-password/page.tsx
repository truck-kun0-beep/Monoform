import Link from "next/link";
import { AuthShell, ResetPasswordForm } from "@/components/auth";

export const metadata = {
  title: "Reset Password",
  description: "Choose a new password for your MONOFORM account.",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      footer={
        <p>
          Need help?{" "}
          <Link href="/contact" className="link-underline text-ink">
            Contact us
          </Link>
        </p>
      }
    >
      <header className="mb-6">
        <p className="eyebrow">Account</p>
        <h1 className="mt-2 text-display-md text-ink">Reset password</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Choose a new password for your account. You will be returned to
          sign in once the update is complete.
        </p>
      </header>
      <ResetPasswordForm />
    </AuthShell>
  );
}
