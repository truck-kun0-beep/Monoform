import { CataloguePage } from "@/components/layout";
import { listSaleProducts } from "@/lib/products";
import { getCatalogueConfig } from "@/config/catalogue";

export const metadata = {
  title: "Sale",
  description: "Selected pieces from past seasons at considered prices.",
};

export default function SalePage() {
  const products = listSaleProducts();
  const config = getCatalogueConfig("sale");
  return (
    <CataloguePage
      config={config}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Sale" },
      ]}
      products={products}
    />
  );
}
