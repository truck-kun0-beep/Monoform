import { CataloguePage } from "@/components/layout";
import { listNewArrivals } from "@/lib/products";
import { getCatalogueConfig } from "@/config/catalogue";

export const metadata = {
  title: "New Arrivals",
  description: "The latest pieces from the studio.",
};

export default function NewArrivalsPage() {
  const products = listNewArrivals();
  const config = getCatalogueConfig("new-arrivals");
  return (
    <CataloguePage
      config={config}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "New Arrivals" },
      ]}
      products={products}
    />
  );
}
