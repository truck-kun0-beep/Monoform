"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/ui";
import { MegaMenu } from "@/components/header/MegaMenu";
import { MobileNavigationDrawer } from "@/components/header/MobileNavigationDrawer";
import { SearchOverlay } from "@/components/header/SearchOverlay";
import { ShoppingBagDrawer } from "@/components/cart/ShoppingBagDrawer";
import { ShoppingBagButton } from "@/components/header/ShoppingBagButton";
import { AccountLink } from "@/components/header/AccountLink";
import { CountryCurrencySelector } from "@/components/global";
import {
  BagIcon,
  CloseIcon,
  MenuIcon,
  SearchIcon,
} from "@/components/ui/Icon";
import { primaryNav } from "@/config/navigation";
import { useFocusReturn } from "@/components/header/useFocusReturn";
import { cn } from "@/lib/utils";

/**
 * Full site header. Coordinates the announcement bar, primary nav,
 * mega-menus, mobile drawer, search overlay and shopping bag drawer.
 * Keeps a single source of truth for which overlay is open at any
 * time so the keyboard trap and scroll lock logic is shared.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);

  const { remember, restore } = useFocusReturn();

  // Close any open overlay on route change.
  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
    setSearchOpen(false);
    setBagOpen(false);
  }, [pathname]);

  // Close with Escape.
  useEffect(() => {
    if (!mobileOpen && !searchOpen && !bagOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        setSearchOpen(false);
        setBagOpen(false);
        setOpenMenu(null);
        restore();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mobileOpen, searchOpen, bagOpen, restore]);

  const openSearch = useCallback(() => {
    remember();
    setOpenMenu(null);
    setSearchOpen(true);
  }, [remember]);

  const openBag = useCallback(() => {
    remember();
    setOpenMenu(null);
    setBagOpen(true);
  }, [remember]);

  const openMobile = useCallback(() => {
    remember();
    setOpenMenu(null);
    setMobileOpen(true);
  }, [remember]);

  const closeOverlay = useCallback(() => {
    setSearchOpen(false);
    setBagOpen(false);
    setMobileOpen(false);
    restore();
  }, [restore]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-header border-b border-line bg-paper/95",
          "backdrop-blur supports-[backdrop-filter]:bg-paper/80",
        )}
      >
        <div className="container-bleed flex h-header-mobile items-center justify-between gap-4 lg:h-header">
          {/* Mobile menu trigger. */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={openMobile}
              className="inline-flex items-center gap-2 px-2 py-1 text-eyebrow uppercase text-ink transition-colors hover:text-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
            >
              <MenuIcon className="h-5 w-5" />
              <span>Menu</span>
            </button>
          </div>

          {/* Wordmark on the left (desktop & mobile). */}
          <div className="flex items-center lg:flex-none">
            <Link
              href="/"
              aria-label="Home"
              className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            >
              <Logo />
            </Link>
          </div>

          {/* Primary navigation (desktop only). */}
          <nav aria-label="Primary" className="hidden flex-1 justify-center lg:flex">
            <ul className="flex items-center gap-8">
              {primaryNav.map((section) => {
                const isOpen = openMenu === section.label;
                const hasMenu = Boolean(section.groups?.length);
                return (
                  <li
                    key={section.label}
                    className="relative"
                    onMouseEnter={() => {
                      if (hasMenu) setOpenMenu(section.label);
                    }}
                    onMouseLeave={() => {
                      if (hasMenu && openMenu === section.label) {
                        setOpenMenu(null);
                      }
                    }}
                  >
                    <Link
                      href={section.href}
                      className="link-underline inline-flex items-center py-2 text-eyebrow uppercase text-ink"
                      aria-haspopup={hasMenu ? "true" : undefined}
                      aria-expanded={hasMenu ? isOpen : undefined}
                      aria-controls={
                        hasMenu ? `mega-menu-${slugify(section.label)}` : undefined
                      }
                      onFocus={() => {
                        if (hasMenu) setOpenMenu(section.label);
                      }}
                      onClick={() => {
                        setOpenMenu(null);
                      }}
                    >
                      {section.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Utility actions. */}
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="hidden md:block">
              <CountryCurrencySelector />
            </div>
            <button
              type="button"
              onClick={openSearch}
              className="inline-flex items-center gap-2 px-2 py-1 text-eyebrow uppercase text-ink transition-colors hover:text-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              aria-label="Open search"
              aria-expanded={searchOpen}
              aria-controls="search-overlay"
            >
              <SearchIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Search</span>
            </button>
            <AccountLink />
            <ShoppingBagButton onClick={openBag} />
            {/* Mobile bag icon, kept compact. */}
            <button
              type="button"
              onClick={openBag}
              className="inline-flex items-center px-2 py-1 text-ink lg:hidden"
              aria-label="Open shopping bag"
            >
              <BagIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mega-menu strip — one panel per top-level section. */}
        <div
          className="relative hidden lg:block"
          onMouseLeave={() => setOpenMenu(null)}
        >
          {primaryNav.map((section) => {
            if (!section.groups?.length) return null;
            const isOpen = openMenu === section.label;
            return (
              <MegaMenu
                key={section.label}
                id={`mega-menu-${slugify(section.label)}`}
                section={section}
                open={isOpen}
                onClose={() => setOpenMenu(null)}
                onMouseEnter={() => setOpenMenu(section.label)}
              />
            );
          })}
        </div>
      </header>

      <MobileNavigationDrawer
        open={mobileOpen}
        onClose={closeOverlay}
      />
      <SearchOverlay
        open={searchOpen}
        onClose={closeOverlay}
      />
      <ShoppingBagDrawer
        open={bagOpen}
        onClose={closeOverlay}
      />

      {/* Persistent close-button hook for assistive tech. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onFocus={restore}
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </>
  );
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "-");
}
