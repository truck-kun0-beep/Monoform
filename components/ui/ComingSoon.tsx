import { EmptyState } from "./EmptyState";
import { messages } from "@/config/messages";

/**
 * Consistent development placeholder for routes whose full
 * implementation will follow in a dedicated prompt. Renders the
 * standard empty-state with the "coming soon" copy.
 */
export function ComingSoon({ title }: { title?: string }) {
  return (
    <EmptyState
      title={title ?? messages.comingSoon.title}
      body={messages.comingSoon.body}
    />
  );
}
