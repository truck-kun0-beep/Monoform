import Link from "next/link";
import { AuthShell, ForgotPasswordForm } from "@/components/auth";

export const metadata = {
  title: "Forgot Password",
  description:
    "Request a password reset link. We will email you a secure link to choose a new password.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      footer={
        <p>
          Remembered it?{" "}
          <Link href="/login" className="link-underline text-ink">
            Back to sign in
          </Link>
        </p>
      }
    >
      <header className="mb-6">
        <p className="eyebrow">Account</p>
        <h1 className="mt-2 text-display-md text-ink">Forgot password</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Enter the email address associated with your account. We will send
          you a secure link to choose a new password.
        </p>
      </header>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
