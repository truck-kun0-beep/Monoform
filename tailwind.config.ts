import type { Config } from "tailwindcss";

/**
 * Design tokens are also exported as TypeScript constants from
 * `@/styles/tokens` so non-Tailwind code (metadata, scripts) can
 * reference the same source of truth.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.25rem",
        sm: "1.5rem",
        lg: "2rem",
        xl: "2.5rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
        // Neutral palette tuned for a premium fashion retailer.
        ink: {
          DEFAULT: "#0a0a0a",
          soft: "#1a1a1a",
          muted: "#5c5c5c",
          subtle: "#8a8a8a",
        },
        paper: {
          DEFAULT: "#ffffff",
          warm: "#f6f4f1",
          sand: "#ece8e1",
          stone: "#d8d3cb",
        },
        line: {
          DEFAULT: "#e5e1da",
          soft: "#efece6",
          strong: "#0a0a0a",
        },
        accent: {
          DEFAULT: "#0a0a0a",
          contrast: "#ffffff",
        },
        danger: "#a4262c",
        success: "#1f6b3a",
        warning: "#8a6a17",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: [
          "var(--font-display)",
          "ui-serif",
          "Georgia",
          "serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        // Editorial display scale.
        "display-2xl": ["clamp(2.75rem, 6vw, 5rem)", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
        "display-xl": ["clamp(2.25rem, 4.5vw, 3.75rem)", { lineHeight: "1.04", letterSpacing: "-0.015em" }],
        "display-lg": ["clamp(1.75rem, 3vw, 2.5rem)", { lineHeight: "1.08", letterSpacing: "-0.01em" }],
        "display-md": ["1.5rem", { lineHeight: "1.15", letterSpacing: "-0.005em" }],
        "display-sm": ["1.25rem", { lineHeight: "1.2", letterSpacing: "0" }],
        "eyebrow": ["0.75rem", { lineHeight: "1.2", letterSpacing: "0.18em" }],
      },
      spacing: {
        "header": "4rem",
        "header-mobile": "3.5rem",
        "announcement": "2.25rem",
        "section": "5rem",
        "section-lg": "7rem",
      },
      maxWidth: {
        "container": "1440px",
        "prose": "62ch",
      },
      borderRadius: {
        none: "0",
        xs: "2px",
        sm: "3px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
      },
      borderWidth: {
        hairline: "0.5px",
      },
      transitionDuration: {
        DEFAULT: "180ms",
        slow: "320ms",
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.22, 0.61, 0.36, 1)",
      },
      zIndex: {
        "announcement": "30",
        "header": "40",
        "overlay": "50",
        "drawer": "60",
        "modal": "70",
        "consent": "75",
        "toast": "80",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 220ms ease-out both",
        "slide-up": "slide-up 260ms cubic-bezier(0.22, 0.61, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
