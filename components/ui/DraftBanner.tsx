import type { ReactNode } from "react";
import type { DocumentMeta } from "@/config/content";

type Props = {
  meta: DocumentMeta;
  /** Optional additional context. */
  children?: ReactNode;
};

/**
 * Banner shown at the top of draft / unconfigured policy pages so
 * readers can never mistake the document for final business
 * policy. The store owner flips the publication flag in
 * `config/content.ts` when the document is approved.
 */
export function DraftBanner({ meta, children }: Props) {
  if (meta.status === "published") return null;
  const tone =
    meta.status === "unconfigured"
      ? "Configuration required"
      : "Working draft";
  const body =
    meta.status === "unconfigured"
      ? "The content for this page is not configured yet. The store owner needs to supply the final values before this page can be published."
      : "This page is a working draft. The final version will be published once the policy has been reviewed and the business contact details have been confirmed.";
  return (
    <aside
      role="note"
      aria-label="Document status"
      className="border border-line bg-paper-warm p-4 text-sm text-ink-muted"
    >
      <p className="eyebrow text-ink">{tone}</p>
      <p className="mt-2">{body}</p>
      {meta.lastUpdated ? (
        <p className="mt-2 text-xs text-ink-muted">
          Last updated: {meta.lastUpdated}
          {meta.version ? ` · ${meta.version}` : null}
          {meta.effectiveDate ? ` · Effective: ${meta.effectiveDate}` : null}
        </p>
      ) : null}
      {children}
    </aside>
  );
}
