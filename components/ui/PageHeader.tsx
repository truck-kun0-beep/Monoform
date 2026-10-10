import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  children?: ReactNode;
};

/**
 * Standard editorial page header. Combines an optional eyebrow line,
 * a display title and supporting description.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  children,
}: Props) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 className="text-display-xl text-ink">{title}</h1>
      {description ? (
        <p className="max-w-prose text-sm text-ink-muted">{description}</p>
      ) : null}
      {children}
    </header>
  );
}
