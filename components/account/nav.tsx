import type { ReactNode } from "react";

/**
 * Account navigation links. Centralised so the sidebar, mobile
 * nav and the dashboard quick-link card all read from the same
 * source. Add a new destination by editing this file only.
 */
export type AccountNavItem = {
  label: string;
  href: string;
  description?: string;
  match?: (pathname: string) => boolean;
};

export const ACCOUNT_NAV_ITEMS: ReadonlyArray<AccountNavItem> = [
  {
    label: "Overview",
    href: "/account",
    description: "Account dashboard and quick links.",
    match: (pathname) => pathname === "/account",
  },
  {
    label: "Personal Information",
    href: "/account/profile",
    description: "Name and contact phone.",
    match: (pathname) => pathname === "/account/profile",
  },
  {
    label: "Delivery Addresses",
    href: "/account/addresses",
    description: "Saved addresses for checkout.",
    match: (pathname) => pathname.startsWith("/account/addresses"),
  },
  {
    label: "My Orders",
    href: "/account/orders",
    description: "Order history and tracking.",
    match: (pathname) => pathname.startsWith("/account/orders"),
  },
];

/** Helper to find the currently active item for a given pathname. */
export function findActiveAccountItem(
  pathname: string,
): AccountNavItem | undefined {
  return ACCOUNT_NAV_ITEMS.find((item) =>
    item.match ? item.match(pathname) : item.href === pathname,
  );
}

/** Render a navigation list of `<li>` items for use inside a `<ul>`. */
export function renderAccountNavList(
  current: string,
  renderItem: (item: AccountNavItem, isCurrent: boolean, index: number) => ReactNode,
): ReactNode {
  return ACCOUNT_NAV_ITEMS.map((item, index) => {
    const isCurrent = item.match
      ? item.match(current)
      : item.href === current;
    return (
      <li key={item.href}>
        {renderItem(item, isCurrent, index)}
      </li>
    );
  });
}
