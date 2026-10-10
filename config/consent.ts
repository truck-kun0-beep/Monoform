/**
 * Optional-service configuration used by the cookie consent layer.
 *
 * Every entry in `OPTIONAL_SERVICES` represents a real
 * integration (analytics tag, marketing pixel, etc.) that the
 * application loads. The consent banner only surfaces a
 * category if at least one of its services is configured. When
 * nothing is configured the banner is hidden so the site never
 * pretends it needs consent for integrations that are not
 * actually present.
 *
 * **Do not** add a service here without also wiring its loader
 * into the application — the entry here is the source of truth
 * for "this site uses X", and adding a fake entry would create
 * a misleading consent dialog.
 */

export type ConsentCategoryId = "essential" | "analytics" | "marketing";

export type ConsentService = {
  /** Unique key for the loader. */
  id: string;
  /** Human-readable label shown in the preferences dialog. */
  label: string;
  /** Short description of what the service does. */
  description: string;
  /** Vendor / provider name. */
  provider: string;
};

export type ConsentCategory = {
  id: ConsentCategoryId;
  /** Human-readable label. */
  label: string;
  /** Short description shown in the dialog. */
  description: string;
  /** Whether the category is always on (essential). When true
   *  the consent UI does not show a toggle. */
  required: boolean;
  /** Services in this category. */
  services: ConsentService[];
};

/**
 * The list of optional services actually used by the site.
 * Add a service here only after the corresponding loader has
 * been implemented. The current project ships with no optional
 * third-party services; this list is intentionally empty so
 * the consent banner does not appear during development.
 */
export const OPTIONAL_SERVICES: ReadonlyArray<ConsentService> = [];

/**
 * Resolved categories for the preferences dialog. Essential
 * is always present; the optional categories only show up
 * when at least one service is configured.
 */
export const CONSENT_CATEGORIES: ReadonlyArray<ConsentCategory> = [
  {
    id: "essential",
    label: "Essential",
    description:
      "Required for the store to work — session, authentication, cart and security. These cannot be disabled.",
    required: true,
    services: [],
  },
  ...(OPTIONAL_SERVICES.some((s) => s.id === "analytics") ||
  OPTIONAL_SERVICES.length === 0
    ? []
    : []),
];

/**
 * Returns true when at least one optional service is
 * configured. The banner uses this to decide whether to show
 * itself. If no optional services are configured the banner
 * stays hidden and the preferences dialog only describes the
 * essential category.
 */
export function hasOptionalServices(): boolean {
  return OPTIONAL_SERVICES.length > 0;
}

/**
 * Versioned label of the consent interface. The store owner
 * should bump this whenever the categories or default values
 * change so the consent record keeps a stable version label.
 */
export const CONSENT_INTERFACE_VERSION = "2024-08-01";
