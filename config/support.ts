/**
 * Centralised customer-support configuration.
 *
 * All public-facing contact details (support email, support hours,
 * business address, etc.) live in this module so the Contact, Help,
 * FAQ and footer surfaces cannot drift apart. Every field is
 * optional — when a value has not been supplied, callers should
 * omit it from the rendered page rather than fall back to a
 * fabricated placeholder.
 *
 * The store owner updates this file when real values are confirmed.
 */

export type SupportHours = {
  /** Short day-range label, e.g. "Monday — Friday". */
  days: string;
  /** Opening time in 24-hour format, e.g. "09:00". */
  open: string;
  /** Closing time in 24-hour format, e.g. "18:00". */
  close: string;
};

export type SupportConfig = {
  /**
   * The address the contact form sends customer enquiries to. Read
   * by the server-side submission service. Empty until configured.
   */
  toEmail: string;
  /** Public-facing support email shown on the Contact page. Empty
   *  until configured. When empty, the page omits the field. */
  publicEmail: string;
  /** Optional public-facing phone number. Empty until configured. */
  publicPhone: string;
  /** Optional public business address. Empty until configured. */
  publicAddress: string;
  /** Optional support hours. Empty until configured. */
  hours: SupportHours | null;
  /** Typical customer-facing response time. Set to `null` when the
   *  real SLA is not known so the UI can say "we'll respond as soon
   *  as we can" instead of inventing a number. */
  responseSla: string | null;
};

/**
 * Default support configuration. Everything is empty / unconfigured
 * so the public pages render honest placeholders during development.
 */
export const support: SupportConfig = {
  toEmail: process.env.STORE_SUPPORT_EMAIL ?? "",
  publicEmail: process.env.STORE_PUBLIC_SUPPORT_EMAIL ?? "",
  publicPhone: process.env.STORE_PUBLIC_SUPPORT_PHONE ?? "",
  publicAddress: process.env.STORE_PUBLIC_ADDRESS ?? "",
  hours: null,
  responseSla: null,
};

/** Returns true when the contact form can actually deliver mail. */
export function isSupportMailConfigured(): boolean {
  return Boolean(
    support.toEmail && process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL,
  );
}

/**
 * Human-friendly delivery fee labels. The numbers themselves come
 * from the order backend (the single source of truth) so this
 * config is purely presentational.
 */
export const supportCopy = {
  insideDhakaLabel: "Inside Dhaka",
  outsideDhakaLabel: "Outside Dhaka",
  insideDhakaFee: "৳70",
  outsideDhakaFee: "৳120",
};
