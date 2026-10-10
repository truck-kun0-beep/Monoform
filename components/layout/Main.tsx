import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  as?: "main" | "div";
};

/**
 * Wraps page content. Reserves consistent vertical rhythm and ensures
 * focus skips to the main region on every navigation.
 */
export function Main({ children, className, as = "main" }: Props) {
  const Tag = as;
  return (
    <Tag
      id="main"
      tabIndex={-1}
      className={cn("flex-1 focus:outline-none", className)}
    >
      {children}
    </Tag>
  );
}
