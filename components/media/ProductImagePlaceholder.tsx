import { MediaPlaceholder } from "./MediaPlaceholder";
import type { ImageSource } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  image: ImageSource;
  priority?: boolean;
  className?: string;
  /** Disable the in-development overlay label. */
  hideLabel?: boolean;
  /** Optional fixed height; otherwise the aspect ratio is used. */
  height?: string;
};

/**
 * Product-specific image placeholder.
 *
 * Reserves the exact aspect ratio of the eventual product photo and
 * uses a neutral warm background. When a real `src` is supplied later
 * the renderer will swap in an `<Image>` without changing layout.
 */
export function ProductImagePlaceholder({
  image,
  className,
  hideLabel = false,
  height,
}: Props) {
  return (
    <MediaPlaceholder
      label={image.alt}
      kind="image"
      aspectRatio={image.aspectRatio ?? 3 / 4}
      height={height}
      tone="warm"
      showLabel={!hideLabel}
      className={cn(className)}
    />
  );
}
