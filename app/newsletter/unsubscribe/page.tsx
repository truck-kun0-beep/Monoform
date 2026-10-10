import Link from "next/link";
import { Container, PageHeader, Section } from "@/components/ui";
import { unsubscribeByToken } from "@/lib/newsletter/server";

export const metadata = {
  title: "Unsubscribe",
  description: "Unsubscribe from the MONOFORM newsletter.",
};

type SearchParams = Promise<{ token?: string | string[] }>;

/**
 * `/newsletter/unsubscribe` — public unsubscribe route.
 *
 * The token in the query string is the only thing that authorises
 * the unsubscribe action. The token is rotated every time the
 * subscription state changes so a previously-leaked link cannot
 * be reused.
 *
 * The page reports honest outcomes:
 *  - ok: the subscription was marked unsubscribed.
 *  - already: the email is already unsubscribed.
 *  - not_found: the token is unknown (the link may have been
 *    rotated, or it never existed).
 *  - invalid_token: the token is missing or malformed.
 *  - unconfigured: the newsletter backend is not connected.
 *  - error: the unsubscribe service failed.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const raw = params.token;
  const token = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const result = await unsubscribeByToken(token);

  const title = (() => {
    switch (result.kind) {
      case "ok":
        return "You've been unsubscribed";
      case "already":
        return "You're already unsubscribed";
      case "not_found":
        return "We couldn't find that subscription";
      case "invalid_token":
        return "Invalid unsubscribe link";
      case "unconfigured":
        return "Unsubscribe is temporarily unavailable";
      case "error":
        return "We couldn't process that request";
      default:
        return "Unsubscribe";
    }
  })();

  const body = (() => {
    switch (result.kind) {
      case "ok":
        return `We've marked ${result.email} as unsubscribed. You won't receive any more newsletter emails from us.`;
      case "already":
        return `${result.email} is already on the unsubscribed list.`;
      case "not_found":
        return "The link you used is no longer valid. The subscription may have already been removed, or the link was rotated.";
      case "invalid_token":
        return "The unsubscribe link is missing its token. Please use the link in the footer of the most recent newsletter email.";
      case "unconfigured":
        return "The newsletter service is not configured yet. Please contact support if you would like to be removed from the list.";
      case "error":
        return result.message;
      default:
        return "";
    }
  })();

  return (
    <>
      <Section spacing="md" tone="paper" className="border-b border-line">
        <Container>
          <PageHeader
            eyebrow="Newsletter"
            title={title}
            description={body}
          />
        </Container>
      </Section>
      <Section spacing="lg" tone="paper">
        <Container className="max-w-prose">
          <p className="text-sm text-ink-muted">
            If you reached this page by mistake you can{" "}
            <Link href="/" className="link-underline text-ink">
              return to the homepage
            </Link>
            , or{" "}
            <Link href="/contact" className="link-underline text-ink">
              contact our support team
            </Link>
            .
          </p>
        </Container>
      </Section>
    </>
  );
}
