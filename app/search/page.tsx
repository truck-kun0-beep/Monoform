import { CataloguePage } from "@/components/layout";
import { listAllProducts } from "@/lib/products";
import { getCatalogueConfig, type CatalogueFeature } from "@/config/catalogue";

export const metadata = {
  title: "Search",
  description: "Search across the catalogue.",
};

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const all = listAllProducts();
  const results = query
    ? all.filter((product) => {
        const haystack = `${product.name} ${product.category} ${product.subCategory ?? ""} ${product.description}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      })
    : [];

  const baseConfig = getCatalogueConfig("search");
  const config = {
    ...baseConfig,
    eyebrow: "Search",
    title: query ? `Results for “${query}”` : "Search",
    description: query
      ? `${results.length} ${results.length === 1 ? "result" : "results"} found.`
      : "Use the header search to find products across the catalogue.",
    features: ["category", "size", "color", "price"] satisfies CatalogueFeature[],
  };

  return (
    <CataloguePage
      config={config}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Search" },
      ]}
      products={results}
    />
  );
}
