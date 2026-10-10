import { ContactForm } from "@/components/contact";
import { Container, PageHeader, Section } from "@/components/ui";
import { contactCopy } from "@/config/content";
import { support } from "@/config/support";
import { getCurrentUser } from "@/lib/auth/require";
import { getCustomerProfile } from "@/lib/account/profile";
import { isSupportMailConfigured } from "@/config/support";

export const metadata = {
  title: "Contact",
  description: "Get in touch with the MONOFORM support team.",
};

/**
 * `/contact` — customer support page. Renders a real working
 * contact form (server-side submission via
 * `submitContactAction`) plus the configured public contact
 * details. No values are invented; unconfigured fields are
 * omitted from the page rather than displaying a placeholder.
 */
export default async function ContactPage() {
  // Prefill name + email when the visitor is signed in. The
  // user is still able to review and correct the values.
  const user = await getCurrentUser();
  const profile = user ? await getCustomerProfile() : null;
  const defaultEmail = profile?.email ?? user?.email ?? "";
  const defaultName = profile?.fullName ?? "";

  const showPublicEmail = Boolean(support.publicEmail);
  const showPublicPhone = Boolean(support.publicPhone);
  const showPublicAddress = Boolean(support.publicAddress);
  const showHours = Boolean(support.hours);
  const hasAnySidePanel =
    showPublicEmail || showPublicPhone || showPublicAddress || showHours;

  return (
    <>
      <Section spacing="md" tone="paper" className="border-b border-line">
        <Container>
          <PageHeader
            eyebrow="Customer care"
            title={contactCopy.heading}
            description={contactCopy.description}
          />
        </Container>
      </Section>

      <Section spacing="lg" tone="paper">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.4fr_1fr]">
            <ContactForm defaultEmail={defaultEmail} defaultName={defaultName} />

            {hasAnySidePanel ? (
              <aside className="space-y-6 border border-line bg-paper-warm p-6">
                <h2 className="text-eyebrow uppercase text-ink-muted">
                  Reach us directly
                </h2>
                {showPublicEmail ? (
                  <div>
                    <p className="text-eyebrow uppercase text-ink-muted">Email</p>
                    <a
                      href={`mailto:${support.publicEmail}`}
                      className="link-underline mt-1 inline-block text-sm text-ink"
                    >
                      {support.publicEmail}
                    </a>
                  </div>
                ) : null}
                {showPublicPhone ? (
                  <div>
                    <p className="text-eyebrow uppercase text-ink-muted">Phone</p>
                    <a
                      href={`tel:${support.publicPhone.replace(/\s+/g, "")}`}
                      className="link-underline mt-1 inline-block text-sm text-ink"
                    >
                      {support.publicPhone}
                    </a>
                  </div>
                ) : null}
                {showPublicAddress ? (
                  <div>
                    <p className="text-eyebrow uppercase text-ink-muted">Address</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-ink">
                      {support.publicAddress}
                    </p>
                  </div>
                ) : null}
                {showHours && support.hours ? (
                  <div>
                    <p className="text-eyebrow uppercase text-ink-muted">Hours</p>
                    <p className="mt-1 text-sm text-ink">
                      {support.hours.days}, {support.hours.open} —{" "}
                      {support.hours.close}
                    </p>
                  </div>
                ) : null}
                {!isSupportMailConfigured() ? (
                  <p className="mt-4 text-xs text-ink-muted">
                    Note: support is not yet configured. The form will record
                    your message so the team can pick it up, but no email will
                    be sent.
                  </p>
                ) : null}
              </aside>
            ) : null}
          </div>
        </Container>
      </Section>
    </>
  );
}
