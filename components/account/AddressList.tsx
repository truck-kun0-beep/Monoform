"use client";

import { useCallback, useState } from "react";
import { Modal, useToast } from "@/components/ui";
import { Button } from "@/components/ui";
import { AddressForm } from "./AddressForm";
import { AddressCard } from "./AddressCard";
import type { CustomerAddress } from "@/lib/account";

type Props = {
  addresses: CustomerAddress[];
  /**
   * When `true`, the first save is forced to set the new address
   * as the customer's default. Set when the customer has no
   * addresses yet.
   */
  forceFirstDefault?: boolean;
};

/**
 * The full address manager. Combines the "Add address" button,
 * the modal-based editor and the list of saved address cards.
 *
 * The page server component hydrates this island with the
 * owner's addresses; everything else (modal state, error toasts,
 * success announcements) is handled here.
 */
export function AddressList({ addresses, forceFirstDefault = false }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerAddress | null>(null);
  const { push } = useToast();

  const openAdd = useCallback(() => {
    setEditing(null);
    setOpen(true);
  }, []);

  const openEdit = useCallback((address: CustomerAddress) => {
    setEditing(address);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setEditing(null);
  }, []);

  const onSuccess = useCallback(
    (message: string) => {
      push({ title: message, tone: "success" });
      close();
    },
    [push, close],
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-display-md text-ink">Saved addresses</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {addresses.length === 0
              ? "You have no saved addresses yet. Add one to make checkout faster."
              : `${addresses.length} ${addresses.length === 1 ? "address" : "addresses"} saved. The default address is pre-selected at checkout.`}
          </p>
        </div>
        <Button onClick={openAdd}>Add Address</Button>
      </div>

      {addresses.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={openEdit}
            />
          ))}
        </div>
      ) : null}

      <Modal
        open={open}
        onClose={close}
        title={editing ? "Edit address" : "Add address"}
        description={
          editing
            ? "Update the saved address. The changes are saved to your account immediately."
            : "Add a delivery address. You can edit or remove it at any time."
        }
        size="lg"
      >
        <AddressForm
          address={editing}
          onSuccess={onSuccess}
          onCancel={close}
          showDefaultToggle={!forceFirstDefault && addresses.length > 0}
        />
      </Modal>
    </div>
  );
}
