import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
};

const sizeStyles: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-3 w-3 border",
  md: "h-5 w-5 border-2",
  lg: "h-8 w-8 border-2",
};

/**
 * Inline loading indicator. The label is announced to assistive tech
 * via `role="status"`.
 */
export function Spinner({ className, label = "Loading", size = "md" }: Props) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center gap-2 text-ink-muted", className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block animate-spin rounded-full border-ink border-t-transparent",
          sizeStyles[size],
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
