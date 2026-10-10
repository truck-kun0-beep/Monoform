/**
 * Homepage content configuration.
 *
 * The order, copy, media sources and call-to-action destinations for
 * every homepage section are declared here so the page itself is a
 * thin renderer. When merchandising or campaign copy changes, edit
 * this file only.
 *
 * Media sources (`imageSrc`, `videoSrc`) are intentionally empty.
 * They are wired through the same `ImageSource` shape used by the
 * product catalogue so future CMS or asset-pipeline integrations can
 * populate them without touching the page.
 */

import type { ImageSource } from "@/types";

export type HeroLayout = "full" | "split";
export type CampaignLayout =
  | "full"
  | "split-left"
  | "split-right"
  | "stacked"
  | "wide";

export type HomeHeroCta = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
};

export type HomeHero = {
  /** Layout mode. "full" is a single full-bleed media region with
   *  overlaid text. "split" is a media panel next to the copy. */
  layout: HeroLayout;
  eyebrow?: string;
  title: string;
  description?: string;
  primaryCta: HomeHeroCta;
  secondaryCta?: HomeHeroCta;
  /** Media source for the hero. Either an image or a video. */
  media: ImageSource & {
    /** Optional video configuration. When `videoSrc` is set the hero
     *  renders a video placeholder that supports autoplay-muted loop. */
    autoPlayLoop?: boolean;
  };
  /** Aspect ratio for the hero media. Defaults to 16/9 for full and
   *  4/5 for split. */
  mediaAspectRatio?: number;
};

export type HomeCategory = {
  label: string;
  href: string;
  image: ImageSource;
  /** Override the default 4/5 aspect ratio for this tile. */
  aspectRatio?: number;
  /** Optional eyebrow above the title. */
  eyebrow?: string;
};

export type HomeCategoryGroup = {
  /** Section id for anchor links. */
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  categories: HomeCategory[];
};

export type HomeCollection = {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  cta?: { label: string; href: string };
  /** Slugs to pull from the product service, in order. Falls back to
   *  the full `newArrivals` list when the slugs are missing. */
  productSlugs?: string[];
  /** Source of products when productSlugs is not supplied. */
  source?: "new-arrivals" | "sale" | "all";
  /** Optional layout: grid (default) or carousel. */
  layout?: "grid" | "carousel";
  /** Background tone for the section. */
  tone?: "paper" | "warm" | "sand" | "ink";
};

export type HomeCampaign = {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  cta?: { label: string; href: string };
  media: ImageSource;
  layout: CampaignLayout;
  mediaAspectRatio?: number;
  tone?: "paper" | "warm" | "sand" | "ink";
};

export type HomeBrandStory = {
  id: string;
  eyebrow?: string;
  title: string;
  description: string;
  media: ImageSource;
  mediaAspectRatio?: number;
  cta: { label: string; href: string };
};

export type HomeNewsletter = {
  id: string;
  eyebrow?: string;
  title: string;
  description: string;
  /** Brief inline note shown beneath the form, e.g. privacy. */
  legalNote?: string;
};

export type HomepageConfig = {
  hero: HomeHero;
  categoryGroup: HomeCategoryGroup;
  featured: HomeCollection;
  secondaryCampaign: HomeCampaign;
  /** Additional merchandising sections rendered after the secondary
   *  campaign. The renderer iterates them in order; mark `hidden:
   *  true` to omit a section without re-numbering. */
  collections: (HomeCollection & { hidden?: boolean })[];
  brandStory: HomeBrandStory;
  newsletter: HomeNewsletter;
};

/* ------------------------------------------------------------------ *
 * Hero
 * ------------------------------------------------------------------ */

const hero: HomeHero = {
  layout: "full",
  eyebrow: "Autumn / Winter",
  title: "Everyday, redefined.",
  description: "Considered essentials for wherever the day takes you.",
  primaryCta: { label: "Shop Women", href: "/women" },
  secondaryCta: { label: "Shop Men", href: "/men" },
  media: {
    alt: "MONOFORM — Autumn / Winter campaign",
    aspectRatio: 16 / 9,
    autoPlayLoop: true,
  },
  mediaAspectRatio: 16 / 9,
};

/* ------------------------------------------------------------------ *
 * Category discovery
 * ------------------------------------------------------------------ */

const categoryGroup: HomeCategoryGroup = {
  id: "categories",
  eyebrow: "Shop by category",
  title: "Built for the everyday.",
  description:
    "Four considered edits, each cut from natural materials and made to be worn for seasons to come.",
  categories: [
    {
      label: "Women",
      href: "/women",
      eyebrow: "01",
      image: { alt: "Women — campaign", aspectRatio: 4 / 5 },
      aspectRatio: 4 / 5,
    },
    {
      label: "Men",
      href: "/men",
      eyebrow: "02",
      image: { alt: "Men — campaign", aspectRatio: 4 / 5 },
      aspectRatio: 4 / 5,
    },
    {
      label: "Underwear",
      href: "/underwear",
      eyebrow: "03",
      image: { alt: "Underwear — campaign", aspectRatio: 4 / 5 },
      aspectRatio: 4 / 5,
    },
    {
      label: "New Arrivals",
      href: "/new-arrivals",
      eyebrow: "04",
      image: { alt: "New Arrivals — campaign", aspectRatio: 4 / 5 },
      aspectRatio: 4 / 5,
    },
  ],
};

/* ------------------------------------------------------------------ *
 * Featured collection — driven by the shared product data layer
 * ------------------------------------------------------------------ */

const featured: HomeCollection = {
  id: "the-latest-edit",
  eyebrow: "The Latest Edit",
  title: "New, considered and ready to wear.",
  description:
    "A curated selection of recent arrivals across women's, men's and underwear.",
  cta: { label: "Shop New Arrivals", href: "/new-arrivals" },
  source: "new-arrivals",
  layout: "grid",
  tone: "paper",
};

/* ------------------------------------------------------------------ *
 * Secondary campaign
 * ------------------------------------------------------------------ */

const secondaryCampaign: HomeCampaign = {
  id: "made-for-everyday",
  eyebrow: "Made for everyday",
  title: "Versatile pieces. Effortless combinations.",
  description:
    "A small, considered collection of essentials that work as hard as you do — from the morning meeting to the weekend away.",
  cta: { label: "Explore the Collection", href: "/new-arrivals" },
  media: {
    alt: "MONOFORM — Made for everyday campaign",
    aspectRatio: 4 / 5,
  },
  layout: "split-right",
  mediaAspectRatio: 4 / 5,
  tone: "warm",
};

/* ------------------------------------------------------------------ *
 * Additional merchandising collections
 * ------------------------------------------------------------------ */

const collections: (HomeCollection & { hidden?: boolean })[] = [
  {
    id: "essential-layers",
    eyebrow: "Essential Layers",
    title: "Soft knits, considered weight.",
    description: "Cashmere, merino and cotton — built to be layered all year.",
    cta: { label: "Shop Knitwear", href: "/category/men-knitwear" },
    source: "all",
    layout: "grid",
    tone: "paper",
  },
  {
    id: "everyday-tees",
    eyebrow: "Everyday Tees",
    title: "Heavyweight cotton, refined fit.",
    description: "T-shirts designed to last — the simplest pieces, considered.",
    cta: { label: "Shop T-Shirts", href: "/category/men-tshirts" },
    source: "all",
    layout: "grid",
    tone: "warm",
  },
  {
    id: "denim",
    eyebrow: "Denim",
    title: "One cut. Endless outfits.",
    description: "Selvage denim, washed to wear in — not out.",
    cta: { label: "Shop Denim", href: "/category/men-trousers" },
    source: "all",
    layout: "grid",
    tone: "paper",
  },
  {
    id: "underwear-essentials",
    eyebrow: "Underwear Essentials",
    title: "Soft, breathable basics.",
    description: "Daily essentials, engineered for comfort.",
    cta: { label: "Shop Underwear", href: "/underwear" },
    source: "all",
    layout: "grid",
    tone: "warm",
  },
];

/* ------------------------------------------------------------------ *
 * Brand story
 * ------------------------------------------------------------------ */

const brandStory: HomeBrandStory = {
  id: "less-but-better",
  eyebrow: "The studio",
  title: "Less, but better.",
  description:
    "Everyday essentials, considered in detail. Built around versatility, comfort and a more intentional approach to getting dressed.",
  media: {
    alt: "MONOFORM — studio portrait",
    aspectRatio: 3 / 4,
  },
  mediaAspectRatio: 3 / 4,
  cta: { label: "About MONOFORM", href: "/about" },
};

/* ------------------------------------------------------------------ *
 * Newsletter
 * ------------------------------------------------------------------ */

const newsletter: HomeNewsletter = {
  id: "newsletter",
  eyebrow: "Newsletter",
  title: "Studio notes, sent occasionally.",
  description:
    "Receive private previews, seasonal edits and studio updates. We email only when there is something worth saying.",
  legalNote: "By subscribing you agree to receive marketing emails from MONOFORM.",
};

/* ------------------------------------------------------------------ *
 * Final configuration
 * ------------------------------------------------------------------ */

export const homepage: HomepageConfig = {
  hero,
  categoryGroup,
  featured,
  secondaryCampaign,
  collections,
  brandStory,
  newsletter,
};
