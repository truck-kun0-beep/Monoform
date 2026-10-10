import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  /** Removes the default horizontal padding when edge-to-edge content. */
  bleed?: boolean;
  as?: "div" | "section" | "header" | "footer" | "main" | "nav";
};

const tagStyles = {
  div: "div",
  section: "section",
  header: "header",
  footer: "footer",
  main: "main",
  nav: "nav",
} as const;

/**
 * Page-level container that enforces the site max width and consistent
 * horizontal padding. Use `bleed` for full-bleed editorial sections.
 */
export function Container({ children, className, bleed, as = "div" }: Props) {
  const Tag = tagStyles[as];
  return (
    <Tag
      className={cn(
        bleed ? "w-full" : "mx-auto w-full max-w-container px-5 sm:px-6 lg:px-8 xl:px-10",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
