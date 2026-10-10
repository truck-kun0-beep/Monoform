"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteAddressAction,
  setDefaultAddressAction,
} from "@/lib/account";
import type { CustomerAddress } from "@/lib/account";

type Props = {
  address: CustomerAddress;
};

/**
 * The set-default and delete buttons for a saved address. Renders
 * inside the address card and posts to the corresponding server
 * action. The pending state disables the buttons to prevent
 * duplicate submissions.
 */
export function AddressActionButtons({ address }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <>
      {!address.isDefault ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const form = new FormData();
            form.set("id", address.id);
            startTransition(async () => {
              await setDefaultAddressAction(form);
              router.refresh();
            });
          }}
          className="inline-flex h-9 items-center justify-center border border-line px-4 text-eyebrow uppercase text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          Set as default
        </button>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (
            typeof window !== "undefined" &&
            !window.confirm(
              "Remove this address? This cannot be undone.",
            )
          ) {
            return;
          }
          const form = new FormData();
          form.set("id", address.id);
          startTransition(async () => {
            await deleteAddressAction(form);
            router.refresh();
          });
        }}
        aria-label={`Delete address for ${address.recipientName}`}
        className="inline-flex h-9 items-center justify-center border border-line px-4 text-eyebrow uppercase text-ink-muted transition-colors hover:border-danger hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:cursor-not-allowed disabled:opacity-60"
      >
        Delete
      </button>
    </>
  );
}
