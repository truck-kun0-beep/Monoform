import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "new" | "sale" | "low-stock" | "ink";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-paper-warm text-ink-muted border border-line",
  new: "bg-ink text-paper border border-ink",
  sale: "bg-paper text-danger border border-danger",
  "low-stock": "bg-paper-warm text-warning border border-warning",
  ink: "bg-ink text-paper border border-ink",
};

type Props = {
  children: ReactNode;
  tone?: Tone;
  className?: string;
};

/**
 * Small editorial label used on product cards, the cart and order
 * states. No rounded corners by default; the tone drives the colour.
 */
export function Badge({ children, tone = "neutral", className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1",
        "text-eyebrow uppercase",
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
