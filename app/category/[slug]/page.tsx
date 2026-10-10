import { notFound } from "next/navigation";
import { CataloguePage } from "@/components/layout";
import { listProductsByCategory } from "@/lib/products";
import { seedCategories } from "@/lib/seed/categories";
import { getCatalogueConfig } from "@/config/catalogue";

type RouteParams = { slug: string };
type Params = Promise<RouteParams>;

export const dynamicParams = false;

export function generateStaticParams(): RouteParams[] {
  return seedCategories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const category = seedCategories.find((entry) => entry.slug === slug);
  if (!category) {
    return { title: "Category Not Found" };
  }
  return {
    title: category.name,
    description: category.description ?? `Shop ${category.name}.`,
  };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { slug } = await params;
  const category = seedCategories.find((entry) => entry.slug === slug);
  if (!category) {
    notFound();
  }

  const products = listProductsByCategory(category.slug);
  const config = getCatalogueConfig(category.slug);

  return (
    <CataloguePage
      config={{
        ...config,
        eyebrow: category.parent ? `${category.parent}` : "Category",
        title: category.name,
        description: category.description,
      }}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: category.parent ?? "Shop", href: category.parent ? `/${category.parent}` : undefined },
        { label: category.name },
      ]}
      products={products}
    />
  );
}
