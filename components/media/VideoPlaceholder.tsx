import { MediaPlaceholder } from "./MediaPlaceholder";
import type { ImageSource } from "@/types";
import { cn } from "@/lib/utils";

type Aspect = "3/4" | "4/5" | "1/1" | "video";

type Props = {
  video: ImageSource;
  className?: string;
  /**
   * Single aspect ratio for the video frame. Applies at every
   * viewport so the frame matches the actual `cr7.mp4` (16/9) and
   * there are no black bars on mobile or desktop. Defaults to
   * "video" (Tailwind's `aspect-video` = 16/9).
   *
   * For callers that need a different ratio below the `sm`
   * breakpoint, pass `mobileAspectRatio`. For callers that need
   * a different ratio on `sm` and up, pass `desktopAspectRatio`.
   * The pair (mobile, desktop) is then resolved by
   * `pickRatioClasses()` — every return is a static string
   * literal so Tailwind's content scanner always finds the
   * `aspect-[…]` and `sm:aspect-[…]` utilities in the source.
   */
  aspectRatio?: Aspect;
  /**
   * Mobile (< sm) aspect ratio override. If set, takes precedence
   * over `aspectRatio` below the `sm` breakpoint. PC (`sm:` and
   * up) still uses `desktopAspectRatio` or, as a fallback, the
   * top-level `aspectRatio` or "video".
   */
  mobileAspectRatio?: Aspect;
  /**
   * Desktop (sm and up) aspect ratio override. Defaults to
   * `aspectRatio` or "video".
   */
  desktopAspectRatio?: Aspect;
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
 * The aspect-ratio class string is built by `pickRatioClasses()` and
 * every return is a static string literal. Tailwind's content scanner
 * finds the `aspect-[…]` and `sm:aspect-[…]` utilities in this file's
 * source, so the production CSS always contains both classes and the
 * cascade is deterministic. A function that returns `"aspect-[3/4]"`
 * without the literal appearing in the source would be skipped by the
 * JIT and the wrapper would collapse to its content's intrinsic
 * height on mobile.
 */

export function VideoPlaceholder({
  video,
  aspectRatio = "video",
  mobileAspectRatio,
  desktopAspectRatio,
  className,
  tone = "ink",
}: Props) {
  const videoSrc = "/videos/cr7.mp4";
  const mobile = mobileAspectRatio ?? aspectRatio;
  const desktop = desktopAspectRatio ?? aspectRatio;
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        // Base class = mobile (no `sm:` prefix). `sm:` class
        // overrides it from 640px upward. Both are static
        // literals so Tailwind's JIT picks them up.
        pickRatioClasses(mobile, desktop),
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

/**
 * Build the aspect-ratio class string for the requested
 * (mobile, desktop) pair. Every return is a static literal so
 * Tailwind's content scanner finds the `aspect-[…]` and
 * `sm:aspect-[…]` utilities in the source — a literal that
 * only appears inside a function body that returns it is not
 * enough on its own; here every branch is a `return "..."`
 * with the class names written out, which is what the JIT
 * scans.
 */
function pickRatioClasses(mobile: Aspect, desktop: Aspect): string {
  if (mobile === "3/4" && desktop === "3/4") return "aspect-[3/4] sm:aspect-[3/4]";
  if (mobile === "3/4" && desktop === "4/5") return "aspect-[3/4] sm:aspect-[4/5]";
  if (mobile === "3/4" && desktop === "1/1") return "aspect-[3/4] sm:aspect-square";
  if (mobile === "3/4" && desktop === "video") return "aspect-[3/4] sm:aspect-video";
  if (mobile === "4/5" && desktop === "3/4") return "aspect-[4/5] sm:aspect-[3/4]";
  if (mobile === "4/5" && desktop === "4/5") return "aspect-[4/5] sm:aspect-[4/5]";
  if (mobile === "4/5" && desktop === "1/1") return "aspect-[4/5] sm:aspect-square";
  if (mobile === "4/5" && desktop === "video") return "aspect-[4/5] sm:aspect-video";
  if (mobile === "1/1" && desktop === "3/4") return "aspect-square sm:aspect-[3/4]";
  if (mobile === "1/1" && desktop === "4/5") return "aspect-square sm:aspect-[4/5]";
  if (mobile === "1/1" && desktop === "1/1") return "aspect-square sm:aspect-square";
  if (mobile === "1/1" && desktop === "video") return "aspect-square sm:aspect-video";
  if (mobile === "video" && desktop === "3/4") return "aspect-video sm:aspect-[3/4]";
  if (mobile === "video" && desktop === "4/5") return "aspect-video sm:aspect-[4/5]";
  if (mobile === "video" && desktop === "1/1") return "aspect-video sm:aspect-square";
  // mobile === "video" && desktop === "video" — the default.
  return "aspect-video sm:aspect-video";
}

