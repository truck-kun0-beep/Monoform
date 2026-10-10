"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserIcon } from "@/components/ui/Icon";
import { useAuth } from "@/lib/auth/react";
import { cn } from "@/lib/utils";

/**
 * Account entry in the header. Reads the live auth state and
 * either links to `/login` (unauthenticated) or `/account`
 * (authenticated). When the customer is signed in, a small popover
 * offers a `Sign out` action.
 */
export function AccountLink() {
  const { user, status, configured, signOut } = useAuth();
  const isAuthenticated = Boolean(user);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Close the popover when the user clicks outside.
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const onSignOut = async () => {
    setOpen(false);
    await signOut();
    router.push("/");
    router.refresh();
  };

  // While the auth state is being restored we render a neutral
  // placeholder so the header doesn't flash "Sign in" → "Account".
  if (status === "loading") {
    return (
      <span
        className="inline-flex items-center gap-2 px-2 py-1 text-eyebrow uppercase text-ink-muted"
        aria-busy="true"
      >
        <UserIcon className="h-5 w-5" />
        <span className="hidden sm:inline">Account</span>
      </span>
    );
  }

  if (!configured) {
    return (
      <Link
        href="/login"
        className={cn(
          "inline-flex items-center gap-2 px-2 py-1 text-eyebrow uppercase text-ink",
          "transition-colors hover:text-ink-soft",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        )}
        aria-label="Sign in"
      >
        <UserIcon className="h-5 w-5" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  if (!isAuthenticated) {
    return (
      <Link
        href="/login"
        className={cn(
          "inline-flex items-center gap-2 px-2 py-1 text-eyebrow uppercase text-ink",
          "transition-colors hover:text-ink-soft",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        )}
        aria-label="Sign in"
      >
        <UserIcon className="h-5 w-5" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open account menu"
        className={cn(
          "inline-flex items-center gap-2 px-2 py-1 text-eyebrow uppercase text-ink",
          "transition-colors hover:text-ink-soft",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        )}
      >
        <UserIcon className="h-5 w-5" />
        <span className="hidden sm:inline">Account</span>
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 z-overlay mt-2 w-56 border border-line bg-paper p-2 shadow-sm"
        >
          <p className="px-2 py-1 text-eyebrow uppercase text-ink-muted">
            Signed in
          </p>
          <p className="px-2 pb-2 text-sm text-ink" aria-label="Email address">
            {user?.email ?? ""}
          </p>
          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-2 py-1.5 text-sm text-ink hover:bg-paper-warm"
          >
            Account
          </Link>
          <Link
            href="/account/orders"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-2 py-1.5 text-sm text-ink hover:bg-paper-warm"
          >
            Orders
          </Link>
          <Link
            href="/account/addresses"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-2 py-1.5 text-sm text-ink hover:bg-paper-warm"
          >
            Addresses
          </Link>
          <Link
            href="/wishlist"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-2 py-1.5 text-sm text-ink hover:bg-paper-warm"
          >
            Wishlist
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            className="mt-1 block w-full px-2 py-1.5 text-left text-sm text-ink hover:bg-paper-warm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
