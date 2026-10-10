import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  orientation?: "horizontal" | "vertical";
  weight?: "hairline" | "thin" | "strong";
};

const orientationStyles: Record<NonNullable<Props["orientation"]>, string> = {
  horizontal: "h-px w-full",
  vertical: "w-px h-full",
};

const weightStyles: Record<NonNullable<Props["weight"]>, string> = {
  hairline: "bg-line-soft",
  thin: "bg-line",
  strong: "bg-line-strong",
};

/**
 * Restrained divider. Use horizontally between sections and vertically
 * inside nav groups; never as decoration.
 */
export function Divider({
  className,
  orientation = "horizontal",
  weight = "thin",
}: Props) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(orientationStyles[orientation], weightStyles[weight], className)}
    />
  );
}
