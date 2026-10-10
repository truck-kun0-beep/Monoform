/**
 * Design tokens — single source of truth for non-Tailwind code.
 *
 * The Tailwind theme in `tailwind.config.ts` mirrors these values, so
 * any change here should be reflected there and vice versa.
 *
 * Avoid importing this file from React components that just need class
 * names — prefer the Tailwind classes directly. This module is intended
 * for inline styles, metadata and configuration.
 */

export const colors = {
  ink: "#0a0a0a",
  inkSoft: "#1a1a1a",
  inkMuted: "#5c5c5c",
  inkSubtle: "#8a8a8a",
  paper: "#ffffff",
  paperWarm: "#f6f4f1",
  paperSand: "#ece8e1",
  paperStone: "#d8d3cb",
  line: "#e5e1da",
  lineSoft: "#efece6",
  danger: "#a4262c",
  success: "#1f6b3a",
  warning: "#8a6a17",
} as const;

export const typography = {
  fontFamily: {
    sans: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
    display: "var(--font-display), ui-serif, Georgia, serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
} as const;

export const layout = {
  maxWidthContainer: "1440px",
  maxWidthProse: "62ch",
  headerHeight: "4rem",
  headerHeightMobile: "3.5rem",
  announcementHeight: "2.25rem",
  sectionPadding: "5rem",
  sectionPaddingLg: "7rem",
} as const;

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1440,
} as const;

export const motion = {
  duration: {
    fast: 120,
    base: 180,
    slow: 320,
  },
  easing: {
    standard: "cubic-bezier(0.22, 0.61, 0.36, 1)",
  },
} as const;

export const zIndex = {
  announcement: 30,
  header: 40,
  overlay: 50,
  drawer: 60,
  modal: 70,
  toast: 80,
} as const;
