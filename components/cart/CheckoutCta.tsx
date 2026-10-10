"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth/react";

type Props = {
  /** Where to send the user after a successful login. */
  redirectTo: string;
  /** Label rendered on the CTA. */
  label?: string;
  className?: string;
};

/**
 * Checkout CTA used in the cart summary and shopping-bag drawer.
 *
 * Customers must be signed in before placing an order. The button
 * is rendered as a plain link when the visitor is authenticated
 * (so it works without JavaScript) and switches to a programmatic
 * router redirect to `/login?redirect=…` otherwise.
 *
 * The component reads the live auth state from `useAuth` so the
 * destination updates immediately after a successful sign-in on
 * the same tab.
 */
export function CheckoutCta({
  redirectTo,
  label = "Proceed to Checkout",
  className,
}: Props) {
  const { user, status, configured } = useAuth();
  const router = useRouter();

  // Avoid flashing the wrong destination while the auth state is
  // still being restored. During that window we render a disabled
  // button so the visitor can't click through with stale state.
  if (status === "loading") {
    return (
      <Button size="lg" fullWidth disabled className={className}>
        {label}
      </Button>
    );
  }

  // When Supabase is not configured the integration cannot sign
  // anyone in. Keep the link live so the existing checkout shell
  // is reachable for the next prompt.
  if (!configured) {
    return (
      <Button
        href={redirectTo}
        size="lg"
        fullWidth
        className={className}
      >
        {label}
      </Button>
    );
  }

  if (user) {
    return (
      <Button
        href={redirectTo}
        size="lg"
        fullWidth
        className={className}
      >
        {label}
      </Button>
    );
  }

  const loginHref = `/login?redirect=${encodeURIComponent(redirectTo)}`;
  return (
    <Button
      size="lg"
      fullWidth
      className={className}
      onClick={(event) => {
        event.preventDefault();
        router.push(loginHref);
      }}
    >
      {label}
    </Button>
  );
}
