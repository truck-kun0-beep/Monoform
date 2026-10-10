import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Force light text for use on dark backgrounds. */
  tone?: "ink" | "paper";
};

/**
 * Wordmark used in the header and footer. Renders the brand name in
 * uppercase display type; the actual logomark / wordmark will be
 * supplied by the brand team.
 */
export function Logo({ className, tone = "ink" }: Props) {
  return (
    <span
      className={cn(
        "font-display text-lg uppercase tracking-[0.3em]",
        tone === "paper" ? "text-paper" : "text-ink",
        className,
      )}
    >
      {brand.name}
    </span>
  );
}
