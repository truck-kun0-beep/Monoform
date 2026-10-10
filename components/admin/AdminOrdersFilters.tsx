"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Input, Select } from "@/components/ui";
import type {
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderStatus,
} from "@/lib/account";

const STATUS_OPTIONS: ReadonlyArray<{ value: OrderStatus; label: string }> = [
  { value: "pending_confirmation", label: "Pending confirmation" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_METHOD_OPTIONS: ReadonlyArray<{
  value: OrderPaymentMethod;
  label: string;
}> = [
  { value: "cod", label: "Cash on Delivery" },
  { value: "bkash", label: "bKash" },
];

const PAYMENT_STATUS_OPTIONS: ReadonlyArray<{
  value: OrderPaymentStatus;
  label: string;
}> = [
  { value: "pending", label: "Pending" },
  { value: "awaiting_verification", label: "Awaiting verification" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

/**
 * Client-side filter form for the admin order list. Submits via
 * the URL search params so the result is shareable and the
 * server-side query reads the same canonical source.
 */
export function AdminOrdersFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [paymentMethod, setPaymentMethod] = useState(
    params.get("paymentMethod") ?? "",
  );
  const [paymentStatus, setPaymentStatus] = useState(
    params.get("paymentStatus") ?? "",
  );
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");

  useEffect(() => {
    setSearch(params.get("q") ?? "");
    setStatus(params.get("status") ?? "");
    setPaymentMethod(params.get("paymentMethod") ?? "");
    setPaymentStatus(params.get("paymentStatus") ?? "");
    setFrom(params.get("from") ?? "");
    setTo(params.get("to") ?? "");
  }, [params]);

  function applyFilters(next: {
    q?: string;
    status?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    from?: string;
    to?: string;
  }) {
    const merged = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value && value.length > 0) {
        merged.set(key, value);
      } else {
        merged.delete(key);
      }
    }
    const query = merged.toString();
    router.push(`/admin/orders${query ? `?${query}` : ""}`);
  }

  function reset() {
    setSearch("");
    setStatus("");
    setPaymentMethod("");
    setPaymentStatus("");
    setFrom("");
    setTo("");
    router.push("/admin/orders");
  }

  return (
    <form
      className="grid grid-cols-1 gap-4 border border-line bg-paper p-4 sm:grid-cols-2 lg:grid-cols-6"
      onSubmit={(event) => {
        event.preventDefault();
        applyFilters({
          q: search,
          status,
          paymentMethod,
          paymentStatus,
          from,
          to,
        });
      }}
      aria-label="Filter orders"
    >
      <Input
        label="Search"
        name="q"
        placeholder="Order #, name or phone"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        autoComplete="off"
      />
      <Select
        label="Status"
        name="status"
        value={status}
        onChange={(event) => setStatus(event.target.value)}
        options={[
          { value: "", label: "All statuses" },
          ...STATUS_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
        ]}
      />
      <Select
        label="Payment method"
        name="paymentMethod"
        value={paymentMethod}
        onChange={(event) => setPaymentMethod(event.target.value)}
        options={[
          { value: "", label: "All methods" },
          ...PAYMENT_METHOD_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
          })),
        ]}
      />
      <Select
        label="Payment status"
        name="paymentStatus"
        value={paymentStatus}
        onChange={(event) => setPaymentStatus(event.target.value)}
        options={[
          { value: "", label: "All payment states" },
          ...PAYMENT_STATUS_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
          })),
        ]}
      />
      <Input
        label="From"
        name="from"
        type="date"
        value={from}
        onChange={(event) => setFrom(event.target.value)}
      />
      <Input
        label="To"
        name="to"
        type="date"
        value={to}
        onChange={(event) => setTo(event.target.value)}
      />
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center border border-ink bg-ink px-6 text-eyebrow uppercase text-paper transition-colors hover:bg-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Apply filters
        </button>
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center justify-center border border-line-strong px-6 text-eyebrow uppercase text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Reset
        </button>
      </div>
    </form>
  );
}
