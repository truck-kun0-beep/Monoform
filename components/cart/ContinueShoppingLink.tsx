import Link from "next/link";
import { ArrowRightIcon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type Props = {
  href?: string;
  label?: string;
  /** Visual variant. `inline` is plain text; `button` is a CTA card. */
  variant?: "inline" | "button";
  className?: string;
};

/**
 * Reusable "Continue shopping" link. Default destination is the
 * New Arrivals catalogue. Rendered as a text link by default and
 * as a bordered button when used inside the empty state.
 */
export function ContinueShoppingLink({
  href = "/new-arrivals",
  label = "Continue Shopping",
  variant = "inline",
  className,
}: Props) {
  if (variant === "button") {
    return (
      <Link
        href={href}
        className={cn(
          "group inline-flex h-12 items-center justify-center gap-2 border border-ink bg-ink px-6 text-eyebrow uppercase tracking-[0.2em] text-paper",
          "transition-colors duration-base ease-out-soft hover:bg-ink-soft",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          className,
        )}
      >
        {label}
        <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2 link-underline text-eyebrow uppercase text-ink-muted",
        className,
      )}
    >
      {label}
      <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
