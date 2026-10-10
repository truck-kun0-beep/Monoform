import type { ProductSummary } from "@/types";

/**
 * Seed product list used by the catalogue pages until a real data
 * source is wired in. All prices are expressed in Bangladeshi taka
 * to match the active market. All image and video sources are
 * intentionally empty so the placeholder UI takes over without
 * inserting random stock photos.
 *
 * Each product also declares its `media[]` slots so the PDP gallery
 * has named, configurable media positions to render.
 */
const STANDARD_SIZES = [
  { code: "XS", label: "Extra Small" },
  { code: "S", label: "Small" },
  { code: "M", label: "Medium" },
  { code: "L", label: "Large" },
  { code: "XL", label: "Extra Large" },
];

export const seedProducts: ProductSummary[] = [
  {
    id: "p-001",
    slug: "wool-overcoat-camel",
    name: "Wool Overcoat",
    subtitle: "Single-breasted, Italian wool",
    category: "women-outerwear",
    categorySlug: "women-outerwear",
    subCategory: "women",
    description:
      "A long, single-breasted overcoat in Italian wool with a relaxed shoulder and dropped lapel.",
    details: [
      "Single-breasted front with tonal horn buttons",
      "Notched lapel with buttonhole detail",
      "Two flap pockets and a chest welt pocket",
      "Back vent for ease of movement",
    ],
    fabricAndCare: [
      "100% Italian wool, woven in Biella",
      "Dry clean only",
      "Cool iron if needed",
      "Store on a wide hanger to preserve the shoulder",
    ],
    fitInformation:
      "Cut for a relaxed, oversized fit. Take your usual size for an everyday silhouette or size down for a closer fit.",
    price: { amount: 24500, currency: "BDT" },
    badges: [{ label: "New", tone: "new" }],
    colors: [
      {
        name: "Camel",
        value: "#a4896b",
        media: [
          { alt: "Wool overcoat — Camel, front", aspectRatio: 3 / 4, slot: "front" },
          { alt: "Wool overcoat — Camel, back", aspectRatio: 3 / 4, slot: "back" },
          { alt: "Wool overcoat — Camel, full length", aspectRatio: 3 / 4, slot: "full" },
          { alt: "Wool overcoat — Camel, fabric detail", aspectRatio: 1, slot: "detail" },
        ],
      },
      {
        name: "Charcoal",
        value: "#2b2b2b",
        media: [
          { alt: "Wool overcoat — Charcoal, front", aspectRatio: 3 / 4, slot: "front" },
          { alt: "Wool overcoat — Charcoal, back", aspectRatio: 3 / 4, slot: "back" },
          { alt: "Wool overcoat — Charcoal, full length", aspectRatio: 3 / 4, slot: "full" },
        ],
      },
    ],
    sizes: STANDARD_SIZES,
    media: [
      { alt: "Wool overcoat, front view", aspectRatio: 3 / 4, slot: "front" },
      { alt: "Wool overcoat, back view", aspectRatio: 3 / 4, slot: "back" },
      { alt: "Wool overcoat, full length", aspectRatio: 3 / 4, slot: "full" },
      { alt: "Wool overcoat, fabric detail", aspectRatio: 1, slot: "detail" },
      { alt: "Wool overcoat, lifestyle", aspectRatio: 4 / 5, slot: "lifestyle" },
    ],
    image: { alt: "Wool overcoat, front view", aspectRatio: 3 / 4 },
    isNew: true,
    relatedProductIds: ["p-002", "p-003", "p-004"],
  },
  {
    id: "p-002",
    slug: "silk-slip-dress-ivory",
    name: "Silk Slip Dress",
    subtitle: "Bias-cut, heavyweight silk satin",
    category: "women-dresses",
    categorySlug: "women-dresses",
    subCategory: "women",
    description:
      "A bias-cut slip dress in heavyweight silk satin with adjustable straps and a low back.",
    price: { amount: 11500, currency: "BDT" },
    colors: [
      {
        name: "Ivory",
        value: "#efe6d6",
        media: [
          { alt: "Silk slip dress — Ivory, front", aspectRatio: 3 / 4, slot: "front" },
          { alt: "Silk slip dress — Ivory, back", aspectRatio: 3 / 4, slot: "back" },
        ],
      },
      {
        name: "Black",
        value: "#0a0a0a",
        media: [
          { alt: "Silk slip dress — Black, front", aspectRatio: 3 / 4, slot: "front" },
        ],
      },
    ],
    sizes: STANDARD_SIZES,
    media: [
      { alt: "Silk slip dress, front", aspectRatio: 3 / 4, slot: "front" },
      { alt: "Silk slip dress, back", aspectRatio: 3 / 4, slot: "back" },
      { alt: "Silk slip dress, full length", aspectRatio: 3 / 4, slot: "full" },
    ],
    image: { alt: "Silk slip dress in ivory", aspectRatio: 3 / 4 },
    relatedProductIds: ["p-001", "p-003"],
  },
  {
    id: "p-003",
    slug: "tailored-trousers-black",
    name: "Tailored Trousers",
    subtitle: "High-rise, single pleat",
    category: "women-trousers",
    categorySlug: "women-trousers",
    subCategory: "women",
    description:
      "High-rise straight-leg trousers cut from a lightweight wool blend with a single pleat.",
    price: { amount: 8800, currency: "BDT" },
    colors: [
      {
        name: "Black",
        value: "#0a0a0a",
        media: [
          { alt: "Tailored trousers — Black, front", aspectRatio: 3 / 4, slot: "front" },
        ],
      },
    ],
    sizes: STANDARD_SIZES,
    media: [
      { alt: "Tailored trousers, front", aspectRatio: 3 / 4, slot: "front" },
      { alt: "Tailored trousers, back", aspectRatio: 3 / 4, slot: "back" },
      { alt: "Tailored trousers, fabric detail", aspectRatio: 1, slot: "detail" },
    ],
    image: { alt: "Tailored trousers in black", aspectRatio: 3 / 4 },
    relatedProductIds: ["p-001", "p-002"],
  },
  {
    id: "p-004",
    slug: "cashmere-knit-cream",
    name: "Cashmere Knit",
    subtitle: "Fine-gauge, ribbed hem",
    category: "women-knitwear",
    categorySlug: "women-knitwear",
    subCategory: "women",
    description:
      "A fine-gauge crewneck in 100% cashmere, finished with a ribbed hem and cuffs.",
    fabricAndCare: [
      "100% cashmere",
      "Hand wash cold with a delicate detergent",
      "Lay flat to dry",
      "Store folded to avoid stretching the shoulder",
    ],
    price: { amount: 14500, currency: "BDT" },
    badges: [{ label: "Low Stock", tone: "low-stock" }],
    availability: "low-stock",
    colors: [
      {
        name: "Cream",
        value: "#e6dccb",
        media: [
          { alt: "Cashmere knit — Cream, front", aspectRatio: 3 / 4, slot: "front" },
        ],
      },
    ],
    sizes: STANDARD_SIZES.map((size) =>
      size.code === "XS" || size.code === "XL"
        ? { ...size, available: false }
        : size,
    ),
    media: [
      { alt: "Cashmere knit, front", aspectRatio: 3 / 4, slot: "front" },
      { alt: "Cashmere knit, detail", aspectRatio: 1, slot: "detail" },
    ],
    image: { alt: "Cashmere crewneck in cream", aspectRatio: 3 / 4 },
    relatedProductIds: ["p-001", "p-003"],
  },
  {
    id: "p-005",
    slug: "cotton-shirt-white",
    name: "Cotton Shirt",
    subtitle: "Camp collar, poplin",
    category: "men-shirts",
    categorySlug: "men-shirts",
    subCategory: "men",
    description:
      "A relaxed-fit poplin shirt with a camp collar and mother-of-pearl buttons.",
    details: [
      "Camp collar",
      "Single chest pocket",
      "Mother-of-pearl buttons",
      "Straight hem with side vents",
    ],
    fabricAndCare: [
      "100% cotton poplin",
      "Machine wash cold",
      "Tumble dry low",
      "Iron warm",
    ],
    fitInformation: "Relaxed fit through the body with a straight hem.",
    price: { amount: 6500, currency: "BDT" },
    colors: [
      {
        name: "White",
        value: "#f4f1ec",
        media: [
          { alt: "Cotton shirt — White, front", aspectRatio: 3 / 4, slot: "front" },
        ],
      },
    ],
    sizes: STANDARD_SIZES,
    media: [
      { alt: "Cotton shirt, front", aspectRatio: 3 / 4, slot: "front" },
      { alt: "Cotton shirt, back", aspectRatio: 3 / 4, slot: "back" },
    ],
    image: { alt: "Cotton shirt in white", aspectRatio: 3 / 4 },
    relatedProductIds: ["p-006", "p-007", "p-008"],
  },
  {
    id: "p-006",
    slug: "selvage-denim-indigo",
    name: "Selvage Denim",
    subtitle: "13oz Japanese selvage",
    category: "men-trousers",
    categorySlug: "men-trousers",
    subCategory: "men",
    description:
      "A straight-leg jean cut from 13oz Japanese selvage denim with a button fly.",
    price: { amount: 7800, currency: "BDT" },
    colors: [
      {
        name: "Indigo",
        value: "#2c3a5a",
        media: [
          { alt: "Selvage denim — Indigo, front", aspectRatio: 3 / 4, slot: "front" },
        ],
      },
    ],
    sizes: STANDARD_SIZES,
    media: [
      { alt: "Selvage denim, front", aspectRatio: 3 / 4, slot: "front" },
      { alt: "Selvage denim, back", aspectRatio: 3 / 4, slot: "back" },
      { alt: "Selvage denim, fabric detail", aspectRatio: 1, slot: "detail" },
    ],
    image: { alt: "Selvage denim in indigo", aspectRatio: 3 / 4 },
    relatedProductIds: ["p-005", "p-008"],
  },
  {
    id: "p-007",
    slug: "merino-crewneck-charcoal",
    name: "Merino Crewneck",
    subtitle: "Extra-fine merino, set-in sleeves",
    category: "men-knitwear",
    categorySlug: "men-knitwear",
    subCategory: "men",
    description:
      "A medium-gauge crewneck in extra-fine merino wool with set-in sleeves.",
    price: { amount: 9200, currency: "BDT" },
    colors: [
      {
        name: "Charcoal",
        value: "#2b2b2b",
        media: [
          { alt: "Merino crewneck — Charcoal, front", aspectRatio: 3 / 4, slot: "front" },
        ],
      },
    ],
    sizes: STANDARD_SIZES,
    media: [
      { alt: "Merino crewneck, front", aspectRatio: 3 / 4, slot: "front" },
      { alt: "Merino crewneck, detail", aspectRatio: 1, slot: "detail" },
    ],
    image: { alt: "Merino crewneck in charcoal", aspectRatio: 3 / 4 },
    isNew: true,
    relatedProductIds: ["p-005", "p-008"],
  },
  {
    id: "p-008",
    slug: "cotton-tshirt-black",
    name: "Heavyweight T-Shirt",
    subtitle: "240gsm cotton, ribbed neckline",
    category: "men-tshirts",
    categorySlug: "men-tshirts",
    subCategory: "men",
    description:
      "A heavyweight 240gsm cotton t-shirt with a relaxed body and ribbed crew neckline.",
    price: { amount: 2500, currency: "BDT" },
    colors: [
      {
        name: "Black",
        value: "#0a0a0a",
        media: [
          { alt: "Heavyweight t-shirt — Black, front", aspectRatio: 3 / 4, slot: "front" },
        ],
      },
      {
        name: "White",
        value: "#f4f1ec",
      },
    ],
    sizes: STANDARD_SIZES,
    media: [
      { alt: "Heavyweight t-shirt, front", aspectRatio: 3 / 4, slot: "front" },
      { alt: "Heavyweight t-shirt, detail", aspectRatio: 1, slot: "detail" },
    ],
    image: { alt: "Heavyweight t-shirt in black", aspectRatio: 3 / 4 },
    relatedProductIds: ["p-005", "p-007"],
  },
  {
    id: "p-009",
    slug: "cotton-brief-3-pack",
    name: "Cotton Brief — 3 Pack",
    subtitle: "Mid-rise, combed cotton",
    category: "underwear-briefs",
    categorySlug: "underwear-briefs",
    subCategory: "underwear",
    description:
      "Mid-rise briefs in soft combed cotton with a tonal elastic waistband.",
    price: { amount: 1700, currency: "BDT" },
    colors: [
      { name: "Mixed", value: "#a3a3a3" },
    ],
    sizes: [
      { code: "S", label: "Small" },
      { code: "M", label: "Medium" },
      { code: "L", label: "Large" },
      { code: "XL", label: "Extra Large" },
    ],
    media: [
      { alt: "Cotton briefs, three pack", aspectRatio: 1, slot: "front" },
    ],
    image: { alt: "Cotton briefs, three pack", aspectRatio: 3 / 4 },
    relatedProductIds: ["p-010"],
  },
  {
    id: "p-010",
    slug: "modal-lounge-pant",
    name: "Modal Lounge Pant",
    subtitle: "Modal-cotton blend, elastic waist",
    category: "underwear-loungewear",
    categorySlug: "underwear-loungewear",
    subCategory: "underwear",
    description:
      "A straight-cut lounge pant in a soft modal-cotton blend with an elastic waist.",
    price: { amount: 3100, currency: "BDT" },
    colors: [
      { name: "Stone", value: "#c8bca8" },
    ],
    sizes: [
      { code: "S", label: "Small" },
      { code: "M", label: "Medium" },
      { code: "L", label: "Large" },
      { code: "XL", label: "Extra Large" },
    ],
    media: [
      { alt: "Modal lounge pant, front", aspectRatio: 3 / 4, slot: "front" },
    ],
    image: { alt: "Modal lounge pant in stone", aspectRatio: 3 / 4 },
    relatedProductIds: ["p-009"],
  },
  {
    id: "p-011",
    slug: "linen-shirt-sand",
    name: "Linen Shirt",
    subtitle: "Lightweight, single pocket",
    category: "men-shirts",
    categorySlug: "men-shirts",
    subCategory: "men",
    description:
      "A lightweight linen shirt with a camp collar and a single chest pocket.",
    price: { amount: 5900, currency: "BDT" },
    compareAtPrice: { amount: 7800, currency: "BDT" },
    badges: [{ label: "Sale", tone: "sale" }],
    isOnSale: true,
    colors: [
      { name: "Sand", value: "#d6c2a0" },
    ],
    sizes: STANDARD_SIZES,
    media: [
      { alt: "Linen shirt, front", aspectRatio: 3 / 4, slot: "front" },
      { alt: "Linen shirt, back", aspectRatio: 3 / 4, slot: "back" },
    ],
    image: { alt: "Linen shirt in sand", aspectRatio: 3 / 4 },
    relatedProductIds: ["p-005", "p-008"],
  },
  {
    id: "p-012",
    slug: "leather-belt-black",
    name: "Leather Belt",
    subtitle: "Vegetable-tanned, brushed nickel",
    category: "men-essentials",
    categorySlug: "men-essentials",
    subCategory: "men",
    description:
      "A 3cm vegetable-tanned leather belt with a brushed nickel buckle.",
    price: { amount: 4200, currency: "BDT" },
    colors: [
      { name: "Black", value: "#0a0a0a" },
    ],
    // No sizes for belts.
    media: [
      { alt: "Leather belt, front", aspectRatio: 1, slot: "front" },
      { alt: "Leather belt, detail", aspectRatio: 1, slot: "detail" },
    ],
    image: { alt: "Leather belt in black", aspectRatio: 3 / 4 },
    relatedProductIds: ["p-005"],
  },
];
