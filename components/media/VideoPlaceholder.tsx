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
  const videoSrc = "/videos/cr7.mp4";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        className
      )}
      style={{ aspectRatio }}
    >
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={video.alt}
      >
        <source src={videoSrc} type="video/mp4" />
      </video>
    </div>
  );
}

