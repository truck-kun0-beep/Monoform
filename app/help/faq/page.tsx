import Link from "next/link";
import { HelpArticle } from "@/components/layout";
import { Accordion } from "@/components/ui";
import { faqGroups } from "@/config/content";

export const metadata = {
  title: "FAQ",
  description: "Frequently asked questions about MONOFORM orders.",
};

const crumbs = [
  { label: "Home", href: "/" },
  { label: "Help", href: "/help" },
  { label: "FAQ" },
];

/**
 * `/help/faq` — Frequently asked questions. Each question is a
 * keyboard-accessible disclosure built on the shared `Accordion`
 * component. The answers reflect the application's actual
 * functionality rather than fabricated guarantees (see
 * `config/content.ts`).
 */
export default function FaqPage() {
  return (
    <HelpArticle
      eyebrow="Help · FAQ"
      title="Frequently asked questions"
      description="Quick answers about orders, delivery, payment and returns."
      crumbs={crumbs}
    >
      <div className="space-y-12">
        {faqGroups.map((group) => (
          <section key={group.title}>
            <h2 className="text-display-sm text-ink">{group.title}</h2>
            <Accordion
              className="mt-4"
              ariaLabel={`${group.title} questions`}
              items={group.entries.map((entry) => ({
                id: `${group.title}-${entry.question}`,
                title: entry.question,
                content: <p className="leading-relaxed">{entry.answer}</p>,
              }))}
            />
          </section>
        ))}
      </div>

      <div className="mt-12 border-t border-line pt-8">
        <h2 className="text-display-sm text-ink">Still need help?</h2>
        <p className="mt-3">
          If your question isn't covered above, please{" "}
          <Link href="/contact" className="link-underline text-ink">
            contact our support team
          </Link>{" "}
          and we will get back to you as soon as we can.
        </p>
      </div>
    </HelpArticle>
  );
}
