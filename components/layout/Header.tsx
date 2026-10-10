import Link from "next/link";
import { Logo } from "@/components/ui";
import { primaryNav, utilityNav } from "@/config/navigation";
import { cn } from "@/lib/utils";

/**
 * Foundation header.
 *
 * The full implementation (mega-menu, search overlay, mini cart drawer,
 * account menu, mobile menu) is intentionally deferred to a dedicated
 * prompt. This shell establishes the layout, sticky behaviour and the
 * navigation links so every page renders a usable, accessible header.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-header border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      <div className="container-bleed flex h-header-mobile items-center justify-between gap-4 lg:h-header">
        {/* Mobile: primary nav trigger placeholder. */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            className="px-2 py-1 text-eyebrow uppercase text-ink transition-colors hover:text-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            aria-label="Open menu"
          >
            Menu
          </button>
        </div>

        {/* Primary navigation (desktop). */}
        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {primaryNav.map((section) => (
              <li key={section.href}>
                <Link
                  href={section.href}
                  className="link-underline text-eyebrow uppercase text-ink"
                >
                  {section.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Brand wordmark (centre on desktop, left on mobile). */}
        <div className="flex flex-1 items-center justify-center lg:flex-none">
          <Link
            href="/"
            aria-label="Home"
            className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
          >
            <Logo />
          </Link>
        </div>

        {/* Utility navigation. */}
        <nav aria-label="Utility">
          <ul className="flex items-center gap-2 sm:gap-4">
            {utilityNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "px-2 py-1 text-eyebrow uppercase text-ink",
                    "transition-colors hover:text-ink-soft",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
