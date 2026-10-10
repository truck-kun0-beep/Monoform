import { CataloguePage } from "@/components/layout";
import { listProductsByCategory } from "@/lib/products";
import { getCatalogueConfig } from "@/config/catalogue";

export const metadata = {
  title: "Underwear",
  description:
    "Underwear and loungewear — soft, breathable basics engineered for daily comfort.",
};

export default function UnderwearPage() {
  const products = listProductsByCategory("underwear");
  const config = getCatalogueConfig("underwear");
  return (
    <CataloguePage
      config={config}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Underwear" },
      ]}
      products={products}
    />
  );
}
