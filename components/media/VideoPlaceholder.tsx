import { MediaPlaceholder } from "./MediaPlaceholder";
import type { ImageSource } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  video: ImageSource;
  className?: string;
  /** Editorial aspect ratio override; defaults to 16/9. */
  aspectRatio?: number;
  tone?: "ink" | "warm";
  /** Whether real video should autoplay and loop when supplied. */
  autoPlayLoop?: boolean;
};

/**
 * Video placeholder.
 *
 * Reserves the eventual video dimensions with a darker tone, suitable
 * for a hero or campaign loop. When a real `videoSrc` is provided the
 * renderer can be swapped to a `<video autoPlay muted loop playsInline>`
 * element without changing the surrounding layout.
 */
export function VideoPlaceholder({
  video,
  aspectRatio = 16 / 9,
  className,
  tone = "ink",
}: Props) {
  return (
    <MediaPlaceholder
      label={video.alt}
      kind="video"
      aspectRatio={video.aspectRatio ?? aspectRatio}
      tone={tone}
      className={cn(className)}
    />
  );
}
