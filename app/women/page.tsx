import { CataloguePage } from "@/components/layout";
import { listProductsByCategory } from "@/lib/products";
import { getCatalogueConfig } from "@/config/catalogue";

export const metadata = {
  title: "Women",
  description:
    "Considered women's clothing — dresses, tailoring, knitwear, outerwear and the new-season minimal capsule.",
};

export default function WomenPage() {
  const products = listProductsByCategory("women");
  const config = getCatalogueConfig("women");
  return (
    <CataloguePage
      config={config}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Women" },
      ]}
      products={products}
    />
  );
}
