import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/product";
import {
  CompleteTheLook,
  MoreLikeThis,
  ProductMediaController,
  YouMayAlsoLike,
} from "@/components/product";
import { Container, Section } from "@/components/ui";
import { resolveSizeChart } from "@/config/sizeCharts";
import {
  findCategoryBySlug,
  findProductBySlug,
  getCategorySiblings,
  getRelatedProducts,
  getYouMayAlsoLike,
  listAllProducts,
} from "@/lib/products";

type RouteParams = { slug: string };
type Params = Promise<RouteParams>;

export const dynamicParams = false;

export function generateStaticParams(): RouteParams[] {
  return listAllProducts().map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const product = findProductBySlug(slug);
  if (!product) return { title: "Product Not Found" };
  return {
    title: product.name,
    description: product.description,
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = findProductBySlug(slug);
  if (!product) notFound();

  // Resolve the size chart from the configured category. Products
  // with no matching chart will simply hide the size guide button.
  const sizeChart = resolveSizeChart(product.category);

  // Build breadcrumbs from the product's category data.
  const breadcrumbs = buildBreadcrumbs(product);

  // The "Complete the look" tiles pull from the first few
  // configured related products.
  const completeTheLook = getRelatedProducts(product, 4);

  // The "You may also like" carousel uses a deterministic,
  // category-aware ranking. We exclude anything already shown in
  // the Complete the Look tiles.
  const completeIds = new Set(completeTheLook.map((p) => p.id));
  const alsoLike = getYouMayAlsoLike(product, 8).filter(
    (p) => !completeIds.has(p.id) && p.id !== product.id,
  );

  // "More like this" surfaces products in the same category (or
  // sub-category as a fallback). We further exclude the current
  // product and anything already shown above to keep the two
  // carousels distinct when there are enough products.
  const seenIds = new Set<string>([product.id, ...completeIds, ...alsoLike.map((p) => p.id)]);
  const siblings = getCategorySiblings(product, 8).filter(
    (p) => !seenIds.has(p.id),
  );
  // If there aren't enough siblings, fall back to the next items
  // from the broader recommendations so the section still renders.
  const moreLikeThis =
    siblings.length > 0
      ? siblings
      : getYouMayAlsoLike(product, 8).filter(
          (p) => p.id !== product.id && !completeIds.has(p.id),
        );

  return (
    <>
      <Section
        spacing="md"
        tone="paper"
        className="border-b border-line"
      >
        <Container>
          <Breadcrumbs items={breadcrumbs} />
        </Container>
      </Section>

      <Section spacing="lg" tone="paper" className="pt-0">
        <Container>
          <ProductMediaController product={product} sizeChart={sizeChart} />
        </Container>
      </Section>

      <CompleteTheLook products={completeTheLook} />

      <YouMayAlsoLike products={alsoLike} />

      <MoreLikeThis products={moreLikeThis} />
    </>
  );
}

type Crumb = { label: string; href?: string };

function buildBreadcrumbs(
  product: ReturnType<typeof findProductBySlug>,
): Crumb[] {
  if (!product) return [];
  const items: Crumb[] = [{ label: "Home", href: "/" }];

  if (product.subCategory) {
    items.push({
      label: titleCase(product.subCategory),
      href: `/${product.subCategory}`,
    });
  }

  // If the category differs from the sub-category (e.g. sub=men,
  // category=men-shirts), add a category crumb. We prefer the
  // dedicated category route when one exists.
  const categorySlug = product.categorySlug ?? product.category;
  if (product.category && product.category !== product.subCategory) {
    const category = findCategoryBySlug(categorySlug);
    items.push({
      label: category?.name ?? titleCase(product.category),
      href: `/category/${categorySlug}`,
    });
  }

  items.push({ label: product.name });
  return items;
}

function titleCase(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
