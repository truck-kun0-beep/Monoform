/**
 * Navigation structure for the main catalogue, mega-menu and footer.
 *
 * Categories that appear inside mega-menus live in this file so the
 * header, footer and any other surfaces that need them all read from
 * the same source. When the catalogue changes, edit here only.
 */

export type NavLink = {
  label: string;
  href: string;
  description?: string;
};

export type NavGroup = {
  title: string;
  links: NavLink[];
};

export type NavFeatured = {
  eyebrow: string;
  title: string;
  description?: string;
  href: string;
  /** Aspect ratio reserved for the editorial media slot. */
  aspectRatio?: number;
};

export type NavSection = {
  label: string;
  href: string;
  /** Mega-menu groups, when present. Sections without groups render
   * as plain links (e.g. New Arrivals, Sale). */
  groups?: NavGroup[];
  /** Optional editorial tile rendered inside the mega-menu. */
  featured?: NavFeatured;
};

export const primaryNav: NavSection[] = [
  {
    label: "Women",
    href: "/women",
    groups: [
      {
        title: "Clothing",
        links: [
          { label: "New Arrivals", href: "/new-arrivals" },
          { label: "Best Sellers", href: "/women" },
          { label: "T-Shirts", href: "/category/women-tops" },
          { label: "Shirts", href: "/category/women-tops" },
          { label: "Sweatshirts", href: "/category/women-knitwear" },
          { label: "Hoodies", href: "/category/women-knitwear" },
          { label: "Trousers", href: "/category/women-trousers" },
          { label: "Jeans", href: "/category/women-trousers" },
          { label: "Jackets", href: "/category/women-outerwear" },
        ],
      },
      {
        title: "Edits",
        links: [
          { label: "Dresses", href: "/category/women-dresses" },
          { label: "Knitwear", href: "/category/women-knitwear" },
          { label: "Outerwear", href: "/category/women-outerwear" },
          { label: "Tailoring", href: "/category/women-tailoring" },
          { label: "The Minimal Capsule", href: "/category/women-capsule" },
        ],
      },
    ],
    featured: {
      eyebrow: "Women",
      title: "The autumn edit",
      description: "Layered wool, soft tailoring and considered everyday pieces.",
      href: "/new-arrivals",
      aspectRatio: 4 / 5,
    },
  },
  {
    label: "Men",
    href: "/men",
    groups: [
      {
        title: "Clothing",
        links: [
          { label: "New Arrivals", href: "/new-arrivals" },
          { label: "Best Sellers", href: "/men" },
          { label: "T-Shirts", href: "/category/men-tshirts" },
          { label: "Shirts", href: "/category/men-shirts" },
          { label: "Sweatshirts", href: "/category/men-knitwear" },
          { label: "Hoodies", href: "/category/men-knitwear" },
          { label: "Trousers", href: "/category/men-trousers" },
          { label: "Jeans", href: "/category/men-trousers" },
          { label: "Jackets", href: "/category/men-outerwear" },
        ],
      },
      {
        title: "Edits",
        links: [
          { label: "Knitwear", href: "/category/men-knitwear" },
          { label: "Outerwear", href: "/category/men-outerwear" },
          { label: "Tailoring", href: "/category/men-suits" },
          { label: "Essentials", href: "/category/men-essentials" },
        ],
      },
    ],
    featured: {
      eyebrow: "Men",
      title: "Modern staples",
      description: "Refined everyday pieces, cut from natural materials.",
      href: "/men",
      aspectRatio: 4 / 5,
    },
  },
  {
    label: "Underwear",
    href: "/underwear",
    groups: [
      {
        title: "Shop",
        links: [
          { label: "New Arrivals", href: "/new-arrivals" },
          { label: "Best Sellers", href: "/underwear" },
          { label: "Briefs", href: "/category/underwear-briefs" },
          { label: "Boxers", href: "/category/underwear-boxers" },
          { label: "Loungewear", href: "/category/underwear-loungewear" },
          { label: "Accessories", href: "/category/men-essentials" },
        ],
      },
    ],
    featured: {
      eyebrow: "Underwear",
      title: "Soft, considered basics",
      description: "Breathable cotton essentials engineered for daily wear.",
      href: "/underwear",
      aspectRatio: 4 / 5,
    },
  },
  {
    label: "New Arrivals",
    href: "/new-arrivals",
  },
  {
    label: "Sale",
    href: "/sale",
  },
];

export const utilityNav: NavLink[] = [
  { label: "Search", href: "/search" },
  { label: "Account", href: "/account" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "Cart", href: "/cart" },
];

/**
 * Footer column groups. Order is rendered left-to-right. Each column
 * is collapsible on mobile via the `summary` / `details` element so
 * the footer stays compact on small screens.
 */
export const footerNav = {
  shop: {
    title: "Shop",
    links: [
      { label: "Women", href: "/women" },
      { label: "Men", href: "/men" },
      { label: "Underwear", href: "/underwear" },
      { label: "New Arrivals", href: "/new-arrivals" },
      { label: "Sale", href: "/sale" },
    ] satisfies NavLink[],
  },
  customerService: {
    title: "Customer Service",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Help Centre", href: "/help" },
      { label: "Shipping", href: "/help/shipping" },
      { label: "Returns", href: "/help/returns" },
      { label: "Size Guide", href: "/help/size-guide" },
      { label: "FAQs", href: "/help/faq" },
      { label: "Track Order", href: "/track-order" },
    ] satisfies NavLink[],
  },
  about: {
    title: "About",
    links: [
      { label: "About MONOFORM", href: "/about" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
    ] satisfies NavLink[],
  },
  newsletter: {
    title: "Newsletter",
    links: [
      { label: "Sign up to our newsletter", href: "/#newsletter" },
    ] satisfies NavLink[],
  },
} as const;

/** Legacy keys kept so existing imports keep working. */
export const footerNavLegacy = {
  help: footerNav.customerService,
  account: {
    title: "Account",
    links: [
      { label: "Sign In", href: "/login" },
      { label: "Create Account", href: "/register" },
      { label: "My Orders", href: "/account/orders" },
      { label: "Addresses", href: "/account/addresses" },
      { label: "Profile", href: "/account/profile" },
      { label: "Track Order", href: "/track-order" },
    ] satisfies NavLink[],
  },
  company: footerNav.about,
} as const;
