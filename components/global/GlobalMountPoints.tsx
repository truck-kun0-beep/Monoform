"use client";

import { ConsentBanner } from "@/components/consent";

/**
 * Mount point for client-only, site-wide utilities that should
 * live at the top of the React tree so they can show on every
 * page (e.g. the cookie consent banner).
 */
export function GlobalMountPoints() {
  return <ConsentBanner />;
}
