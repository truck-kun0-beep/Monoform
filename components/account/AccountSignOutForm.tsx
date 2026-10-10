"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { accountSignOutAction } from "@/lib/account";
import { cn } from "@/lib/utils";

/**
 * Sign-out form used inside the account sidebar and the mobile
 * navigation. The form posts to the `accountSignOutAction` server
 * action which invokes the real `supabase.auth.signOut()` before
 * the router navigates the customer back to the homepage.
 *
 * The button is disabled while the action is pending so the
 * customer cannot fire a second request before the first
 * completes.
 */
export function AccountSignOutForm({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(form) => {
        void form;
        startTransition(async () => {
          await accountSignOutAction();
          router.push("/");
          router.refresh();
        });
      }}
    >
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 border border-line-strong",
          "px-4 py-2 text-eyebrow uppercase text-ink transition-colors",
          "hover:bg-ink hover:text-paper",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
    </form>
  );
}
