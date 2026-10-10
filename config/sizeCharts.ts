import type { SizeChart } from "@/types";

/**
 * Size chart configuration used by the size-guide modal on the PDP.
 *
 * Each chart is keyed by a product `category` value (or fall back to
 * the more general "apparel" chart). The `isSample` flag is set to
 * `true` so the modal can render the cells without inventing
 * specific body measurements — replace the values with real data
 * when the product team supplies them.
 */

const APPAREL_SIZES = ["XS", "S", "M", "L", "XL"] as const;

export const SAMPLE_SIZE_CHART: SizeChart = {
  title: "Apparel",
  description:
    "Sample measurements. Exact garment measurements will be published when the product specification is finalised.",
  sizes: APPAREL_SIZES as unknown as string[],
  isSample: true,
  rows: [
    { label: "Chest", values: { XS: "—", S: "—", M: "—", L: "—", XL: "—" } },
    { label: "Waist", values: { XS: "—", S: "—", M: "—", L: "—", XL: "—" } },
    { label: "Hip", values: { XS: "—", S: "—", M: "—", L: "—", XL: "—" } },
    { label: "Length", values: { XS: "—", S: "—", M: "—", L: "—", XL: "—" } },
  ],
};

export const FOOTWEAR_SIZES = ["39", "40", "41", "42", "43", "44", "45"] as const;

export const SAMPLE_FOOTWEAR_CHART: SizeChart = {
  title: "Footwear",
  description:
    "Sample EU sizes. UK and US conversions will be added when confirmed.",
  sizes: FOOTWEAR_SIZES as unknown as string[],
  isSample: true,
  rows: [
    {
      label: "EU",
      values: { "39": "39", "40": "40", "41": "41", "42": "42", "43": "43", "44": "44", "45": "45" },
    },
    {
      label: "UK",
      values: { "39": "—", "40": "—", "41": "—", "42": "—", "43": "—", "44": "—", "45": "—" },
    },
  ],
};

const charts: Record<string, SizeChart> = {
  apparel: SAMPLE_SIZE_CHART,
  footwear: SAMPLE_FOOTWEAR_CHART,
};

/**
 * Resolve the size chart for a product. Categories whose slug starts
 * with `shoe-` or `footwear-` get the footwear chart; everything
 * else gets the apparel chart. Returns `null` for products that
 * should not show a guide (e.g. accessories, underwear 3-packs).
 */
export function resolveSizeChart(category: string): SizeChart | null {
  const key = category.toLowerCase();
  if (key.includes("shoe") || key.includes("footwear")) {
    return charts.footwear ?? null;
  }
  if (
    key.includes("belt") ||
    key.includes("accessor") ||
    key.includes("underwear-briefs") ||
    key.includes("underwear-boxers")
  ) {
    return null;
  }
  return charts.apparel ?? null;
}
