/**
 * Shared domain types.
 *
 * These are intentionally framework-agnostic. They can be reused by
 * services, components and seed data without any React or Next.js
 * dependencies leaking into the business layer.
 */

export type Currency = "USD" | "EUR" | "GBP" | "JPY" | "BDT";

export type Money = {
  amount: number;
  currency: Currency;
};

export type ImageSource = {
  /** Local path under /public, e.g. "/media/women/dress-01.jpg". */
  src?: string;
  /** Approved video URL (mp4 / webm) used by the VideoPlaceholder. */
  videoSrc?: string;
  /** Optional accessible label for the asset. */
  alt: string;
  width?: number;
  height?: number;
  /** Aspect ratio expressed as width / height (e.g. 3 / 4). */
  aspectRatio?: number;
};

/**
 * Named media slot. The product gallery renders these in the order
 * they appear. A product can declare any number of slots; empty
 * slots still reserve their layout dimensions through the
 * `MediaPlaceholder` family.
 */
export type ProductMedia = ImageSource & {
  /** Optional slot label used as a caption / data attribute. */
  slot?:
    | "front"
    | "back"
    | "full"
    | "detail"
    | "lifestyle"
    | "video"
    | "other";
};

export type ProductBadge = {
  label: string;
  tone?: "neutral" | "sale" | "new" | "low-stock";
};

export type ProductColor = {
  /** Human-readable colour name, e.g. "Camel". */
  name: string;
  /** Hex / CSS colour used for the swatch. */
  value: string;
  /** Optional media overrides for this colour. */
  media?: ProductMedia[];
};

export type ProductSize = {
  /** Size code, e.g. "XS", "S", "M", "L", "XL" or "32", "34". */
  code: string;
  /** Optional human label, e.g. "Small". */
  label?: string;
  /**
   * Optional availability hint. `true` means available, `false`
   * means out of stock. `undefined` means unknown — the variant is
   * rendered without an explicit disabled state.
   */
  available?: boolean;
};

export type ProductAvailability =
  | "in-stock"
  | "low-stock"
  | "out-of-stock"
  | "backorder"
  | "unknown";

export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  /** Short marketing subtitle, e.g. "Italian wool overcoat". */
  subtitle?: string;
  category: string;
  /** URL-friendly category slug for breadcrumbs. */
  categorySlug?: string;
  /** Optional sub-category used for filters and breadcrumbs. */
  subCategory?: string;
  description: string;
  price: Money;
  compareAtPrice?: Money;
  badges?: ProductBadge[];
  /** Available colours, used to drive swatches on the PLP. */
  colors?: ProductColor[];
  /** Configured sizes; if omitted the product is one-size. */
  sizes?: ProductSize[];
  /** Configured media slots for the gallery. */
  media?: ProductMedia[];
  /** Primary image shown in product cards. */
  image: ImageSource;
  /** Hover image shown on the product card (still a placeholder for now). */
  hoverImage?: ImageSource;
  /** Optional slug slugs of related products, used by PDP carousels. */
  relatedProductIds?: string[];
  /** Top-level availability hint for the product. */
  availability?: ProductAvailability;
  /** When true the product cannot be added to the bag. */
  isUnavailable?: boolean;
  /** Whether the product should be flagged as new this season. */
  isNew?: boolean;
  /** Whether the product is on sale (or part of the sale catalogue). */
  isOnSale?: boolean;
  /** Bullet list of additional product details. */
  details?: string[];
  /** Free-form fit and sizing copy. */
  fitInformation?: string;
  /** Bullet list of fabric composition and care instructions. */
  fabricAndCare?: string[];
};

export type ProductDetail = ProductSummary & {
  images: ProductMedia[];
  /** Optional long-form description. */
  details?: string[];
  composition?: string;
  careInstructions?: string[];
  sizeAndFit?: string;
  /** SKU used by the cart / checkout flow when added. */
  sku: string;
};

export type SizeChartRow = {
  /** Row label, e.g. a body measurement. */
  label: string;
  /** One value per size code, keyed by the size code. */
  values: Record<string, string>;
};

export type SizeChart = {
  /** Optional heading rendered above the chart. */
  title?: string;
  /** Optional explanatory note. */
  description?: string;
  /** Ordered list of size codes, e.g. ["XS", "S", "M", "L", "XL"]. */
  sizes: string[];
  rows: SizeChartRow[];
  /** Whether the chart is a sample / unverified copy. */
  isSample?: boolean;
};

export type CartLine = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  image: ImageSource;
  size?: string;
  color?: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
};

/**
 * Identity for a specific product variant. Two lines with the same
 * `productId` but a different size or colour are treated as separate
 * lines in the cart.
 */
export type CartItemKey = {
  productId: string;
  size?: string;
  color?: string;
};

/**
 * Payload accepted by `addItem`. Quantity defaults to 1; unit price
 * and image are stored as the product was at the moment of adding so
 * later price changes do not retroactively rewrite the bag.
 */
export type AddToCartInput = {
  productId: string;
  slug: string;
  name: string;
  image: ImageSource;
  size?: string;
  color?: string;
  quantity?: number;
  unitPrice: Money;
};

export type CategorySummary = {
  slug: string;
  name: string;
  parent?: string;
  description?: string;
};

export type OrderStatus =
  | "processing"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export type Address = {
  id: string;
  label?: string;
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
};

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
};
