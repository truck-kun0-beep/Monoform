import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Inline error message. Use for form-level errors or page-level error
 * banners; pair with the `error` copy in `config/messages`.
 */
export function ErrorMessage({
  title = "Something went wrong",
  children,
  className,
}: Props) {
  return (
    <div
      role="alert"
      className={cn(
        "border border-danger/30 bg-paper-warm p-6",
        "text-sm text-ink",
        className,
      )}
    >
      <p className="text-eyebrow uppercase text-danger">{title}</p>
      <div className="mt-2 text-ink-muted">{children}</div>
    </div>
  );
}
