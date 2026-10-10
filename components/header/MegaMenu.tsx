"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CampaignMediaPlaceholder } from "@/components/media";
import { cn } from "@/lib/utils";
import type { NavSection } from "@/config/navigation";

type Props = {
  section: NavSection;
  open: boolean;
  onClose: () => void;
  onMouseEnter?: () => void;
  id: string;
};

/**
 * Desktop mega-menu. The panel is always present in the DOM so
 * transitions stay smooth; visibility is toggled via opacity +
 * pointer-events to keep keyboard and screen-reader behaviour
 * predictable.
 */
export function MegaMenu({ section, open, onClose, onMouseEnter, id }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on outside click — the link element in the parent <li>
  // already closes on click, so we only need to react to clicks
  // outside the entire panel.
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (ref.current && !ref.current.contains(target)) {
        // Only close if the click was outside both the panel and the
        // nav list item (handled by the parent).
        const parentLi = (ref.current.parentElement ?? null)?.parentElement;
        if (parentLi && !parentLi.contains(target)) {
          onClose();
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!section.groups?.length) return null;

  return (
    <div
      ref={ref}
      id={id}
      role="region"
      aria-label={`${section.label} menu`}
      onMouseEnter={onMouseEnter}
      className={cn(
        "absolute inset-x-0 top-full bg-paper",
        "border-b border-line shadow-sm",
        "transition-all duration-slow ease-out-soft",
        open
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-1 opacity-0",
      )}
    >
      <div className="container-bleed grid grid-cols-12 gap-10 py-10">
        <div className="col-span-12 lg:col-span-3">
          <p className="text-eyebrow uppercase text-ink-muted">{section.label}</p>
          <h2 className="mt-3 text-display-md text-ink">
            {section.label} at MONOFORM
          </h2>
          <Link
            href={section.href}
            className="link-underline mt-4 inline-block text-eyebrow uppercase text-ink"
            onClick={onClose}
          >
            Shop all {section.label}
          </Link>
        </div>

        {section.groups.map((group) => (
          <div
            key={group.title}
            className="col-span-6 sm:col-span-4 lg:col-span-3"
          >
            <h3 className="text-eyebrow uppercase text-ink-muted">
              {group.title}
            </h3>
            <ul className="mt-4 space-y-2">
              {group.links.map((link) => (
                <li key={`${group.title}-${link.label}`}>
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className="link-underline text-sm text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {section.featured ? (
          <Link
            href={section.featured.href}
            onClick={onClose}
            className="col-span-12 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink lg:col-span-3"
          >
            <CampaignMediaPlaceholder
              image={{
                alt: `${section.featured.title} — ${section.featured.eyebrow}`,
                aspectRatio: section.featured.aspectRatio ?? 4 / 5,
              }}
              aspectRatio={section.featured.aspectRatio ?? 4 / 5}
            />
            <div className="mt-3">
              <p className="text-eyebrow uppercase text-ink-muted">
                {section.featured.eyebrow}
              </p>
              <p className="mt-1 text-sm text-ink">{section.featured.title}</p>
              {section.featured.description ? (
                <p className="mt-1 text-xs text-ink-muted">
                  {section.featured.description}
                </p>
              ) : null}
            </div>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
