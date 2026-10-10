"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { announcements } from "@/config/announcement";
import { cn } from "@/lib/utils";

/**
 * Slim black announcement bar at the very top of the site. Cycles
 * through the messages defined in `config/announcement.ts` so the
 * content stays editable in one place.
 */
export function AnnouncementBar() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % announcements.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, []);

  const message = announcements[index] ?? announcements[0];
  if (!message) return null;

  return (
    <div className="bg-ink text-paper">
      <div className="container-bleed flex h-announcement items-center justify-center">
        {message.href ? (
          <Link
            href={message.href}
            className={cn(
              "truncate text-center text-eyebrow uppercase",
              "transition-opacity hover:opacity-80",
            )}
          >
            {message.text}
          </Link>
        ) : (
          <p className="truncate text-center text-eyebrow uppercase">
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
