"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui";
import { ChevronDownIcon } from "@/components/ui/Icon";
import { primaryNav } from "@/config/navigation";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Accessible mobile navigation drawer. Each section with a mega-menu
 * expands inline to expose its category groups without leaving the
 * drawer. Sections without groups are simple links.
 */
export function MobileNavigationDrawer({ open, onClose }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Reset the expanded section whenever the drawer opens.
  useEffect(() => {
    if (open) setExpanded(null);
  }, [open]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="left"
      title="Menu"
      className="max-w-full sm:max-w-sm"
    >
      <nav aria-label="Mobile navigation" className="flex flex-col">
        <ul className="flex flex-col">
          {primaryNav.map((section) => {
            const hasMenu = Boolean(section.groups?.length);
            const isExpanded = expanded === section.label;
            return (
              <li key={section.label} className="border-b border-line">
                {hasMenu ? (
                  <>
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={`mobile-group-${slug(section.label)}`}
                      onClick={() =>
                        setExpanded((current) =>
                          current === section.label ? null : section.label,
                        )
                      }
                      className="flex w-full items-center justify-between py-4 text-left text-eyebrow uppercase text-ink transition-colors hover:text-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      <span>{section.label}</span>
                      <ChevronDownIcon
                        className={cn(
                          "h-4 w-4 transition-transform duration-base",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </button>
                    {isExpanded ? (
                      <div
                        id={`mobile-group-${slug(section.label)}`}
                        className="pb-4"
                      >
                        {section.groups?.map((group) => (
                          <div key={group.title} className="mt-2">
                            <p className="text-eyebrow uppercase text-ink-muted">
                              {group.title}
                            </p>
                            <ul className="mt-2 space-y-1.5">
                              {group.links.map((link) => (
                                <li key={`${group.title}-${link.label}`}>
                                  <Link
                                    href={link.href}
                                    onClick={onClose}
                                    className="block py-1.5 text-sm text-ink hover:text-ink-soft"
                                  >
                                    {link.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                        <Link
                          href={section.href}
                          onClick={onClose}
                          className="link-underline mt-4 inline-block text-eyebrow uppercase text-ink"
                        >
                          Shop all {section.label}
                        </Link>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <Link
                    href={section.href}
                    onClick={onClose}
                    className="block py-4 text-eyebrow uppercase text-ink hover:text-ink-soft"
                  >
                    {section.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        <ul className="mt-6 flex flex-col gap-3 text-sm">
          <li>
            <Link
              href="/account"
              onClick={onClose}
              className="link-underline text-ink-muted hover:text-ink"
            >
              Account
            </Link>
          </li>
          <li>
            <Link
              href="/wishlist"
              onClick={onClose}
              className="link-underline text-ink-muted hover:text-ink"
            >
              Wishlist
            </Link>
          </li>
          <li>
            <Link
              href="/track-order"
              onClick={onClose}
              className="link-underline text-ink-muted hover:text-ink"
            >
              Track order
            </Link>
          </li>
        </ul>
      </nav>
    </Drawer>
  );
}

function slug(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "-");
}
