import {
  BrandStory,
  CampaignSection,
  CategoryDiscovery,
  FeaturedCollection,
  HomeHero,
  NewsletterSignup,
} from "@/components/home";
import { homepage } from "@/config/homepage";
import { listAllProducts } from "@/lib/products";

/**
 * Homepage. Renders the editorial sections declared in
 * `config/homepage.ts` in the configured order. Sections can be
 * hidden, reordered or retitled by editing that file — the page
 * itself does not need to change.
 *
 * All media sources are intentionally empty so the placeholder
 * components reserve the right dimensions until real assets are
 * supplied. No stock photos, external images or AI-generated
 * imagery is used.
 */
export default function HomePage() {
  // Pre-compute the products the homepage needs once, then pass the
  // relevant slice into each section. The product service is
  // deterministic so the same input always returns the same order,
  // which keeps the layout stable between renders.
  const catalogue = listAllProducts();

  return (
    <>
      <HomeHero config={homepage.hero} />
      <CategoryDiscovery config={homepage.categoryGroup} />

      <FeaturedCollection
        config={homepage.featured}
        products={pickProducts(catalogue, homepage.featured)}
      />

      <CampaignSection config={homepage.secondaryCampaign} />

      {homepage.collections
        .filter((section) => !section.hidden)
        .map((section) => (
          <FeaturedCollection
            key={section.id}
            config={section}
            products={pickProducts(catalogue, section)}
          />
        ))}

      <BrandStory config={homepage.brandStory} />

      <NewsletterSignup config={homepage.newsletter} />
    </>
  );
}

/**
 * Resolve a homepage section's product list. When the section
 * declares `productSlugs` we honour that order; otherwise we fall
 * back to the section's `source` (handled inside FeaturedCollection)
 * but the homepage pre-computes the catalogue once for clarity.
 */
function pickProducts(
  catalogue: ReturnType<typeof listAllProducts>,
  section: (typeof homepage.collections)[number] | (typeof homepage.featured),
) {
  if (section.productSlugs?.length) {
    const byId = new Map(catalogue.map((p) => [p.slug, p]));
    return section.productSlugs
      .map((slug) => byId.get(slug))
      .filter((product): product is NonNullable<typeof product> => Boolean(product));
  }
  return undefined;
}
