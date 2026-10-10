/**
 * Announcement bar configuration.
 *
 * Edit the messages here to change the rotating announcement at the
 * top of every page. Avoid hardcoding promotional claims inside
 * individual components — the header reads from this file.
 */

export type AnnouncementMessage = {
  /** Text shown in the bar. Keep it short enough to fit one line. */
  text: string;
  /** Optional link the announcement navigates to when clicked. */
  href?: string;
};

export const announcements: AnnouncementMessage[] = [
  { text: "Discover the latest collection", href: "/new-arrivals" },
  { text: "New season, considered essentials", href: "/new-arrivals" },
];
