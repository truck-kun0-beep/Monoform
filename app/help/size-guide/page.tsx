import Link from "next/link";
import { HelpArticle } from "@/components/layout";
import { sizeGuide } from "@/config/content";

export const metadata = {
  title: "Size guide",
  description: "Size charts and fit guidance for MONOFORM clothing.",
};

const crumbs = [
  { label: "Home", href: "/" },
  { label: "Help", href: "/help" },
  { label: "Size guide" },
];

export default function SizeGuidePage() {
  const isAnySample = sizeGuide.categories.some((category) => category.isSample);
  return (
    <HelpArticle
      eyebrow="Help · Size guide"
      title="Size guide"
      description="Size charts and fit guidance for the categories the catalogue supports."
      crumbs={crumbs}
    >
      {isAnySample ? (
        <p className="mb-10 border border-line bg-paper-warm p-4 text-sm text-ink-muted">
          Some charts below are still placeholders. The store owner is
          finalising the garment measurements; the layout already accommodates
          real values so they can be entered without rewriting the page.
        </p>
      ) : null}

      <ul className="mb-10 list-disc space-y-1 pl-5 text-sm text-ink-muted">
        {sizeGuide.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>

      <div className="space-y-12">
        {sizeGuide.categories.map((category) => (
          <section key={category.label}>
            <h2 className="text-display-sm text-ink">{category.label}</h2>
            <p className="mt-3">{category.description}</p>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full border border-line text-left text-sm">
                <thead>
                  <tr className="bg-paper-warm text-eyebrow uppercase text-ink-muted">
                    <th scope="col" className="px-4 py-3 font-normal">
                      Measurement
                    </th>
                    {category.sizes.map((size) => (
                      <th
                        key={size}
                        scope="col"
                        className="px-4 py-3 text-center font-normal"
                      >
                        {size}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {category.rows.map((row) => (
                    <tr key={row.label} className="border-t border-line">
                      <th
                        scope="row"
                        className="px-4 py-3 text-left font-medium text-ink"
                      >
                        {row.label}
                      </th>
                      {category.sizes.map((size) => (
                        <td
                          key={size}
                          className="px-4 py-3 text-center text-ink"
                        >
                          {row.values[size] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 border-t border-line pt-8">
        <h2 className="text-display-sm text-ink">Between two sizes?</h2>
        <p className="mt-3">
          If you sit between two sizes we recommend ordering the larger size.
          If you need help choosing a size, please{" "}
          <Link href="/contact" className="link-underline text-ink">
            contact our team
          </Link>{" "}
          — the catalogue page links to this guide from each product.
        </p>
      </div>
    </HelpArticle>
  );
}
