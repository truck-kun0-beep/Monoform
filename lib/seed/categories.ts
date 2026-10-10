import type { CategorySummary } from "@/types";

/**
 * Seed category list used by the navigation and any catalogue page
 * until a real data source is wired in.
 */
export const seedCategories: CategorySummary[] = [
  { slug: "women-dresses", name: "Women — Dresses", parent: "women" },
  { slug: "women-tops", name: "Women — Tops", parent: "women" },
  { slug: "women-trousers", name: "Women — Trousers", parent: "women" },
  { slug: "women-knitwear", name: "Women — Knitwear", parent: "women" },
  { slug: "women-outerwear", name: "Women — Outerwear", parent: "women" },
  { slug: "women-tailoring", name: "Women — Tailoring", parent: "women" },
  { slug: "women-capsule", name: "Women — Minimal Capsule", parent: "women" },
  { slug: "women-resort", name: "Women — Resort", parent: "women" },
  { slug: "men-shirts", name: "Men — Shirts", parent: "men" },
  { slug: "men-tshirts", name: "Men — T-shirts & Polos", parent: "men" },
  { slug: "men-trousers", name: "Men — Trousers", parent: "men" },
  { slug: "men-knitwear", name: "Men — Knitwear", parent: "men" },
  { slug: "men-outerwear", name: "Men — Outerwear", parent: "men" },
  { slug: "men-suits", name: "Men — Tailoring", parent: "men" },
  { slug: "men-essentials", name: "Men — Essentials", parent: "men" },
  { slug: "underwear-briefs", name: "Underwear — Briefs", parent: "underwear" },
  { slug: "underwear-boxers", name: "Underwear — Boxers", parent: "underwear" },
  { slug: "underwear-loungewear", name: "Underwear — Loungewear", parent: "underwear" },
];
