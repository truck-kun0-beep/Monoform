import { CataloguePage } from "@/components/layout";
import { listProductsByCategory } from "@/lib/products";
import { getCatalogueConfig } from "@/config/catalogue";

export const metadata = {
  title: "Men",
  description:
    "Considered men's clothing — shirting, knitwear, tailoring, denim and everyday essentials.",
};

export default function MenPage() {
  const products = listProductsByCategory("men");
  const config = getCatalogueConfig("men");
  return (
    <CataloguePage
      config={config}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Men" },
      ]}
      products={products}
    />
  );
}
