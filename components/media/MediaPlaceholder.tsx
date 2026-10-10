import type { ReactNode } from "react";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * Generic media placeholder. Reserves the correct layout dimensions
 * for a media area while no real asset is wired in. Supports both
 * image and video sources when real media is supplied.
 *
 * The component deliberately renders a neutral background with an
 * optional subtle label so the layout is preserved without inserting
 * stock imagery or generating visual noise. Development labels are
 * driven by `brand.showPlaceholderLabels` so they can be turned off
 * once real assets are supplied.
 */
type BaseProps = {
  /** Optional label rendered as an overlay in development. */
  label?: string;
  /** Show a subtle indicator in the top-left corner (image/video). */
  kind?: "image" | "video";
  /** Aspect ratio (width / height). Defaults to 3/4. */
  aspectRatio?: number;
  /** Fixed height in any CSS unit. Overrides `aspectRatio` when set. */
  height?: string;
  /** Background tone for the empty slot. */
  tone?: "paper" | "warm" | "sand" | "stone" | "ink";
  /** Rounded corners. The site prefers minimal rounding by default. */
  rounded?: "none" | "sm" | "md" | "lg";
  /** Show the placeholder label. Falls back to the brand config flag. */
  showLabel?: boolean;
  className?: string;
  children?: ReactNode;
};

const toneStyles: Record<NonNullable<BaseProps["tone"]>, string> = {
  paper: "bg-paper-warm text-ink-subtle",
  warm: "bg-paper-warm text-ink-subtle",
  sand: "bg-paper-sand text-ink-subtle",
  stone: "bg-paper-stone text-ink-subtle",
  ink: "bg-ink text-paper",
};

const radiusStyles: Record<NonNullable<BaseProps["rounded"]>, string> = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
};

export function MediaPlaceholder({
  label,
  kind = "image",
  aspectRatio = 3 / 4,
  height,
  tone = "warm",
  rounded = "none",
  showLabel,
  className,
  children,
}: BaseProps) {
  const style: React.CSSProperties | undefined = height
    ? { height }
    : { aspectRatio: String(aspectRatio) };

  // When callers don't override `showLabel`, fall back to the brand
  // flag so production builds can disable the indicator entirely.
  const visible = showLabel ?? brand.showPlaceholderLabels;

  return (
    <div
      role="img"
      aria-label={label ?? "Media placeholder"}
      style={style}
      className={cn(
        "relative w-full overflow-hidden",
        toneStyles[tone],
        radiusStyles[rounded],
        className,
      )}
    >
      {visible ? (
        <div
          aria-hidden="true"
          className={cn(
            "absolute left-3 top-3 flex items-center gap-1.5",
            "text-eyebrow uppercase",
            tone === "ink" ? "text-paper" : "text-ink-subtle",
          )}
        >
          <span
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              tone === "ink" ? "bg-paper" : "bg-ink-subtle",
            )}
          />
          {kind === "video" ? "Video" : "Image"}
          {label ? <span className="opacity-70">— {label}</span> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
