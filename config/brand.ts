/**
 * Centralised brand configuration.
 *
 * The brand name and any other identity tokens must live here so
 * individual components, layouts and metadata never hardcode them.
 * When the final brand identity is supplied, change values here only.
 */

export type SocialLink = {
  /** Platform name, e.g. "Instagram". */
  label: string;
  /** Full destination URL. Components render nothing if the href is empty. */
  href: string;
};

export const brand = {
  name: "MONOFORM",
  tagline: "Considered essentials, refined silhouettes.",
  description:
    "An online destination for considered, minimalist fashion — refined essentials, modern silhouettes and seasonal capsules.",
  // Replace these contact details with the real ones when supplied.
  email: "[email protected]",
  phone: "",
  address: "",
  // Localised currency defaults. Individual products can override.
  defaultCurrency: "USD",
  defaultLocale: "en-US",
  // Whether to display the "development placeholder" labels inside
  // empty media slots. Disable in production once real assets exist.
  showPlaceholderLabels: true,
  // Default currency used by the shopping bag and checkout previews.
  // The product service can override this per product.
  cartCurrency: "BDT",
  // Currency symbol used when rendering the cart. The cart itself
  // stores structured `Money` values, so this is purely cosmetic.
  cartCurrencySymbol: "৳",
  // Shipping price tiers used by the eventual checkout step. The
  // cart total intentionally stays as a subtotal until checkout.
  shipping: {
    insideDhaka: { amount: 70, currency: "BDT" },
    outsideDhaka: { amount: 120, currency: "BDT" },
  },
  // Country and currency label shown in the footer. Edit here to
  // reflect the active market without touching individual pages.
  market: {
    label: "Bangladesh",
    currency: "BDT",
    currencySymbol: "৳",
  },
  // Social link destinations. Each entry with an empty `href` is
  // omitted from the rendered footer.
  social: [
    { label: "Instagram", href: "" },
    { label: "Facebook", href: "" },
    { label: "TikTok", href: "" },
  ] as SocialLink[],
  // Whether the newsletter service is configured. When `false`, the
  // form still renders but the submission service reports an honest
  // "unconfigured" state instead of faking a successful sign-up.
  newsletterConfigured: false,
} as const;

export type Brand = typeof brand;
