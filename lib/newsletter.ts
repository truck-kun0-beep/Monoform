/**
 * Backwards-compatible re-export of the newsletter domain types.
 *
 * The actual implementation now lives in `lib/newsletter/server.ts`
 * (server-only) and `lib/newsletter/actions.ts` (server action).
 * Older imports of `@/lib/newsletter` for types keep working.
 */

export type {
  NewsletterSubmitResult,
  UnsubscribeResult,
} from "./newsletter/server";
export type { NewsletterActionResult } from "./newsletter/actions";
