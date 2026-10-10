import type { ImageSource } from "@/types";

/**
 * Catalogue route configuration.
 *
 * Every catalogue page (the top-level edits plus the dynamic
 * /category/[slug] pages) reads from this module. Filters and the
 * optional hero banner are toggled per route, and the parent slug
 * is used to drive breadcrumbs and the navigation hierarchy.
 *
 * Hero media sources are intentionally empty until the studio
 * supplies imagery; the layout still reserves the correct aspect
 * ratio through the `MediaPlaceholder` family.
 */

export type CatalogueFeature =
  | "category"
  | "size"
  | "color"
  | "price"
  | "availability";

export type CatalogueHero = {
  eyebrow: string;
  title: string;
  description?: string;
  cta?: { label: string; href: string };
  /** Editorial media area. Source may be empty. */
  media: ImageSource & {
    autoPlayLoop?: boolean;
  };
  /** Aspect ratio for the hero media. Defaults to 16/9. */
  mediaAspectRatio?: number;
  tone?: "paper" | "warm" | "sand" | "ink";
};

export type CatalogueConfig = {
  /** Stable key for the route, used as a React key. */
  id: string;
  /** Eyebrow shown above the page title. */
  eyebrow: string;
  /** Page title. */
  title: string;
  /** Optional supporting description. */
  description?: string;
  /** Filter groups enabled for this catalogue. */
  features: CatalogueFeature[];
  /** Whether to render the editorial hero banner above the grid. */
  hero?: CatalogueHero;
  /** Number of products per page. Defaults to 12. */
  pageSize?: number;
};

export const DEFAULT_PAGE_SIZE = 12;

export const FEATURED_CATALOGUES: Record<string, CatalogueConfig> = {
  women: {
    id: "women",
    eyebrow: "Catalogue",
    title: "Women",
    description:
      "Considered women's clothing — dresses, tailoring, knitwear, outerwear and the new-season minimal capsule.",
    features: ["category", "size", "color", "price", "availability"],
    hero: {
      eyebrow: "Autumn / Winter",
      title: "Layered, considered, refined.",
      description:
        "Soft tailoring, fluid dresses and natural knits — designed to be worn together, season after season.",
      cta: { label: "Shop the edit", href: "/new-arrivals" },
      media: { alt: "MONOFORM — Women's catalogue", aspectRatio: 16 / 9 },
      mediaAspectRatio: 16 / 9,
      tone: "warm",
    },
  },
  men: {
    id: "men",
    eyebrow: "Catalogue",
    title: "Men",
    description:
      "Considered men's clothing — shirting, knitwear, tailoring, denim and everyday essentials.",
    features: ["category", "size", "color", "price", "availability"],
    hero: {
      eyebrow: "Autumn / Winter",
      title: "Refined everyday staples.",
      description:
        "Shirting, denim and knitwear — natural materials, considered details, built to last.",
      cta: { label: "Shop the edit", href: "/new-arrivals" },
      media: { alt: "MONOFORM — Men's catalogue", aspectRatio: 16 / 9 },
      mediaAspectRatio: 16 / 9,
      tone: "warm",
    },
  },
  underwear: {
    id: "underwear",
    eyebrow: "Catalogue",
    title: "Underwear",
    description:
      "Soft, breathable underwear and loungewear in natural fibres.",
    features: ["category", "size", "color", "price", "availability"],
    hero: {
      eyebrow: "Daily essentials",
      title: "Engineered for daily comfort.",
      description:
        "Soft combed cotton briefs, breathable modal loungewear and tonal basics — the foundation of every wardrobe.",
      media: { alt: "MONOFORM — Underwear catalogue", aspectRatio: 16 / 9 },
      mediaAspectRatio: 16 / 9,
      tone: "paper",
    },
  },
  "new-arrivals": {
    id: "new-arrivals",
    eyebrow: "New",
    title: "New Arrivals",
    description: "The latest pieces from the studio — refreshed weekly.",
    features: ["category", "size", "color", "price"],
    hero: {
      eyebrow: "Just in",
      title: "The new-season drop.",
      description:
        "A small, considered set of new arrivals. Browse the full list or refine by category below.",
      media: { alt: "MONOFORM — New Arrivals", aspectRatio: 16 / 9 },
      mediaAspectRatio: 16 / 9,
      tone: "warm",
    },
  },
  sale: {
    id: "sale",
    eyebrow: "Sale",
    title: "Sale",
    description: "Selected pieces from past seasons at considered prices.",
    features: ["category", "size", "color", "price"],
    hero: {
      eyebrow: "Considered reductions",
      title: "Pieces from past seasons.",
      description:
        "Hand-picked pieces from previous edits at a discount. Final sale — no restocks.",
      media: { alt: "MONOFORM — Sale", aspectRatio: 16 / 9 },
      mediaAspectRatio: 16 / 9,
      tone: "paper",
    },
  },
};

export type FeaturedCatalogueKey = keyof typeof FEATURED_CATALOGUES;

/**
 * Resolve a catalogue config by its route key. Falls back to a
 * minimal default when the key is unknown so the dynamic
 * /category/[slug] page can still render the new template.
 */
export function getCatalogueConfig(key: string): CatalogueConfig {
  const match = (FEATURED_CATALOGUES as Record<string, CatalogueConfig>)[key];
  if (match) {
    return match;
  }
  return {
    id: key,
    eyebrow: "Category",
    title: key
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    features: ["category", "size", "color", "price", "availability"],
  };
}

export function getPageSize(config: CatalogueConfig): number {
  return config.pageSize ?? DEFAULT_PAGE_SIZE;
}
