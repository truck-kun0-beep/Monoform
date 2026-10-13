"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
 * Grace period before a hover-driven mega-menu closes. Long enough
 * to cover the brief moment the pointer spends travelling from the
 * trigger into the panel, short enough that the menu still feels
 * responsive when the user truly leaves the navigation region.
 */
const MEGA_MENU_CLOSE_DELAY_MS = 140;

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

  // Pending close for the hover-driven mega-menu. Held in a ref so
  // the timer handle is read by the latest callback without forcing
  // a re-render and so we can cancel it from anywhere.
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { remember, restore } = useFocusReturn();

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  // Open a menu immediately, cancelling any pending close. Used by
  // pointer-enter and keyboard-focus on the trigger.
  const openMenuNow = useCallback(
    (label: string) => {
      clearCloseTimer();
      setOpenMenu((current) => (current === label ? current : label));
    },
    [clearCloseTimer],
  );

  // Schedule a close after a short grace period. Reusing the same
  // handle means a rapid exit / entry never stacks pending closes.
  const scheduleCloseMenu = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setOpenMenu(null);
    }, MEGA_MENU_CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  // Immediate close — used when the user navigates, presses Escape
  // or clicks a destination link.
  const closeMenuNow = useCallback(() => {
    clearCloseTimer();
    setOpenMenu(null);
  }, [clearCloseTimer]);

  // Close any open overlay on route change.
  useEffect(() => {
    closeMenuNow();
    setMobileOpen(false);
    setSearchOpen(false);
    setBagOpen(false);
  }, [pathname, closeMenuNow]);

  // Clear any pending close on unmount.
  useEffect(() => {
    return () => clearCloseTimer();
  }, [clearCloseTimer]);

  // Close with Escape.
  useEffect(() => {
    if (!openMenu && !mobileOpen && !searchOpen && !bagOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenuNow();
        setMobileOpen(false);
        setSearchOpen(false);
        setBagOpen(false);
        restore();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openMenu, mobileOpen, searchOpen, bagOpen, restore, closeMenuNow]);

  const openSearch = useCallback(() => {
    clearCloseTimer();
    remember();
    closeMenuNow();
    setSearchOpen(true);
  }, [remember, clearCloseTimer, closeMenuNow]);

  const openBag = useCallback(() => {
    clearCloseTimer();
    remember();
    closeMenuNow();
    setBagOpen(true);
  }, [remember, clearCloseTimer, closeMenuNow]);

  const openMobile = useCallback(() => {
    clearCloseTimer();
    remember();
    closeMenuNow();
    setMobileOpen(true);
  }, [remember, clearCloseTimer, closeMenuNow]);

  const closeOverlay = useCallback(() => {
    clearCloseTimer();
    setSearchOpen(false);
    setBagOpen(false);
    setMobileOpen(false);
    setOpenMenu(null);
    restore();
  }, [restore, clearCloseTimer]);

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
                      if (hasMenu) openMenuNow(section.label);
                    }}
                    onMouseLeave={() => {
                      if (hasMenu && openMenu === section.label) {
                        scheduleCloseMenu();
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
                        if (hasMenu) openMenuNow(section.label);
                      }}
                      onBlur={(event) => {
                        if (!hasMenu) return;
                        const next = event.relatedTarget as Node | null;
                        if (next && event.currentTarget.contains(next)) return;
                        if (openMenu === section.label) scheduleCloseMenu();
                      }}
                      onClick={() => {
                        closeMenuNow();
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

        {/* Mega-menu strip — one panel per top-level section.
            Wrapped in a single hover region that also covers the
            gap between the trigger row and the panel itself. */}
        <div
          className="relative hidden lg:block"
          onMouseEnter={() => clearCloseTimer()}
          onMouseLeave={() => scheduleCloseMenu()}
        >
          {/* Invisible vertical bridge so the pointer can travel from
              the bottom of the trigger row into the top of the panel
              without losing the hover region. The bridge receives
              pointer events so the wrapper's onMouseEnter fires the
              moment the cursor enters the gap, cancelling the
              pending close. */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-3 -translate-y-full"
          />
          {primaryNav.map((section) => {
            if (!section.groups?.length) return null;
            const isOpen = openMenu === section.label;
            return (
              <MegaMenu
                key={section.label}
                id={`mega-menu-${slugify(section.label)}`}
                section={section}
                open={isOpen}
                onClose={closeMenuNow}
                onMouseEnter={() => openMenuNow(section.label)}
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
