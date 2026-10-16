import { MediaPlaceholder } from "./MediaPlaceholder";
import type { ImageSource } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  video: ImageSource;
  className?: string;
  /**
   * Editorial aspect ratio used on mobile (below the `sm`
   * breakpoint). Defaults to 3/4 so the video fills a typical
   * phone viewport with no black band above or below the player.
   * On tablet and up the frame switches to 16/9 (Tailwind's
   * `aspect-video`).
   *
   * For product-page videos the caller can override either or
   * both ratios with `mobileAspectRatio` / `desktopAspectRatio`.
   * Accepts "3/4", "4/5", "1/1" or "video" (16/9).
   */
  mobileAspectRatio?: "3/4" | "4/5" | "1/1" | "video";
  /**
   * Optional aspect ratio override used at the `sm` breakpoint
   * and up. Useful for product videos that should keep a
   * portrait frame on desktop too. Defaults to Tailwind's
   * `sm:aspect-video` (16/9).
   */
  desktopAspectRatio?: "3/4" | "4/5" | "1/1" | "video";
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
 *
 * The aspect ratio is responsive: a portrait frame (default 3/4) on
 * mobile so the video fills the screen and a cinematic 16/9 on
 * tablet and up. The choice is hard-coded in the className rather
 * than driven by a prop so the production CSS always contains the
 * same two utilities — Tailwind's tree-shaker is happy and the
 * cascade is deterministic.
 */

export function VideoPlaceholder({
  video,
  mobileAspectRatio = "3/4",
  desktopAspectRatio = "video",
  className,
  tone = "ink",
}: Props) {
  const videoSrc = "/videos/cr7.mp4";
  const mobileClass = ratioToClass(mobileAspectRatio);
  const desktopClass = ratioToClass(desktopAspectRatio);
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        // Mobile: portrait so the video fills the screen.
        // Tablet+: cinematic 16/9 by default. Both are class-
        // based so the `sm:` variant wins by cascade order at
        // the breakpoint, no inline-style specificity wars.
        mobileClass,
        desktopClass,
        className,
      )}
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

function ratioToClass(ratio: "3/4" | "4/5" | "1/1" | "video"): string {
  // The desktop ratio is always emitted with a `sm:` prefix so it
  // only applies from the `sm` breakpoint upward. The mobile ratio
  // (emitted by the caller) is the base class.
  switch (ratio) {
    case "3/4":
      return "sm:aspect-[3/4]";
    case "4/5":
      return "sm:aspect-[4/5]";
    case "1/1":
      return "sm:aspect-square";
    case "video":
      return "sm:aspect-video";
  }
}

