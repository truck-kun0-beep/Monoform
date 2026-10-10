import { Breadcrumbs } from "@/components/product";
import { CategoryHero } from "@/components/catalogue";
import { Container, PageHeader, Section, Spinner } from "@/components/ui";
import type { CatalogueConfig } from "@/config/catalogue";
import { getPageSize } from "@/config/catalogue";
import type { ProductSummary } from "@/types";
import { Suspense } from "react";
import { CatalogueView } from "@/components/catalogue";

type Crumb = { label: string; href?: string };

type Props = {
  config: CatalogueConfig;
  breadcrumbs: Crumb[];
  products: ProductSummary[];
  navigation?: "pagination" | "load-more";
};

/**
 * Reusable layout for `/women`, `/men`, `/underwear`, `/new-arrivals`,
 * `/sale`, `/category/[slug]` and `/search` routes.
 *
 * Each page is a server component that resolves its product list
 * through `lib/products` and passes the records to the shared
 * client `CatalogueView`. The view handles filters, sort, URL
 * state and pagination; this shell only renders the editorial
 * header, optional hero banner and breadcrumbs.
 */
export function CataloguePage({
  config,
  breadcrumbs,
  products,
  navigation = "pagination",
}: Props) {
  return (
    <>
      <Section spacing="md" tone="paper" className="border-b border-line">
        <Container>
          <Breadcrumbs items={breadcrumbs} className="mb-6" />
          <PageHeader
            eyebrow={config.eyebrow}
            title={config.title}
            description={config.description}
          />
        </Container>
      </Section>

      {config.hero ? <CategoryHero hero={config.hero} /> : null}

      <Section spacing="lg" tone="paper">
        <Container>
          <Suspense fallback={<CatalogueFallback />}>
            <CatalogueView
              config={config}
              products={products}
              pageSize={getPageSize(config)}
              navigation={navigation}
            />
          </Suspense>
        </Container>
      </Section>
    </>
  );
}

function CatalogueFallback() {
  return (
    <div className="flex min-h-[40dvh] items-center justify-center">
      <Spinner label="Loading catalogue" />
    </div>
  );
}
