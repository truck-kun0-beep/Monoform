import { HelpArticle } from "@/components/layout";
import { Button, DraftBanner } from "@/components/ui";
import { returnsPage } from "@/config/content";

export const metadata = {
  title: "Returns & exchanges",
  description: "Returns, exchanges and refunds information.",
};

const crumbs = [
  { label: "Home", href: "/" },
  { label: "Help", href: "/help" },
  { label: "Returns" },
];

/**
 * `/help/returns` — returns, exchanges and refunds.
 *
 * The full policy body is sourced from `config/content.ts`. While
 * the policy status is `draft` or `unconfigured` the page renders
 * a clear banner so customers can never mistake the draft text
 * for an approved business policy. Real values (time limits,
 * non-returnable categories, refund timing) must be supplied by
 * the store owner before the page is published.
 */
export default function ReturnsPage() {
  const meta = {
    status: returnsPage.status,
    lastUpdated: returnsPage.lastUpdated,
  };

  return (
    <HelpArticle
      eyebrow="Help · Returns"
      title="Returns & exchanges"
      description={returnsPage.summary}
      crumbs={crumbs}
    >
      <DraftBanner meta={meta} />

      {returnsPage.sections && returnsPage.sections.length > 0 ? (
        <div className="mt-10 space-y-8">
          {returnsPage.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-display-sm text-ink">{section.title}</h2>
              <p className="mt-3">{section.body}</p>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-10 space-y-6 text-sm text-ink-muted">
          <p>
            Until the final terms are published this page lists the sections
            the returns policy will cover. The store owner needs to enter the
            real values in <code className="font-mono">config/content.ts</code>{" "}
            before the policy can go live.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Return eligibility</li>
            <li>Time limit for requesting a return</li>
            <li>Product condition</li>
            <li>Items that may be excluded</li>
            <li>Exchange availability</li>
            <li>Refund method and timing</li>
            <li>Shipping charges for returns</li>
            <li>Damaged or incorrect items</li>
            <li>How to submit a request</li>
            <li>How to obtain assistance</li>
          </ul>
        </div>
      )}

      <div className="mt-12 border-t border-line pt-8">
        <h2 className="text-display-sm text-ink">Need help with a return?</h2>
        <p className="mt-3">
          For any return-related question, please reach out using the contact
          form. The team will guide you through the current process.
        </p>
        <Button
          href={returnsPage.contactCta.href}
          variant="primary"
          size="md"
          className="mt-6"
        >
          {returnsPage.contactCta.label}
        </Button>
      </div>
    </HelpArticle>
  );
}
