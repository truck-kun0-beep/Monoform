import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  /** Choose the vertical rhythm for the section. */
  spacing?: "md" | "lg" | "xl";
  /** Background tone. */
  tone?: "paper" | "warm" | "sand" | "ink";
  as?: "section" | "div";
};

const spacingStyles: Record<NonNullable<Props["spacing"]>, string> = {
  md: "py-12 sm:py-16",
  lg: "py-16 sm:py-20 lg:py-24",
  xl: "py-20 sm:py-24 lg:py-section lg:py-section-lg",
};

const toneStyles: Record<NonNullable<Props["tone"]>, string> = {
  paper: "bg-paper text-ink",
  warm: "bg-paper-warm text-ink",
  sand: "bg-paper-sand text-ink",
  ink: "bg-ink text-paper",
};

/**
 * Vertical-rhythm section wrapper. Use on every page between major
 * blocks to keep spacing consistent across the site.
 */
export function Section({
  children,
  className,
  spacing = "lg",
  tone = "paper",
  as = "section",
  ...rest
}: Props) {
  const Tag = as;
  return (
    <Tag
      className={cn(spacingStyles[spacing], toneStyles[tone], className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
