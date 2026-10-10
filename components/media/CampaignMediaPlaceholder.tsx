import { MediaPlaceholder } from "./MediaPlaceholder";
import type { ImageSource } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  image: ImageSource;
  className?: string;
  /** Editorial aspect ratio override; defaults to 16/9. */
  aspectRatio?: number;
  /** Use a darker tone for high-impact editorial panels. */
  tone?: "warm" | "ink" | "sand" | "stone";
};

/**
 * Campaign / hero media placeholder.
 *
 * Larger format than the product placeholder, intended for editorial
 * tiles on the homepage, category pages and campaign landings.
 */
export function CampaignMediaPlaceholder({
  image,
  aspectRatio = 16 / 9,
  className,
  tone = "warm",
}: Props) {
  return (
    <MediaPlaceholder
      label={image.alt}
      kind="image"
      aspectRatio={image.aspectRatio ?? aspectRatio}
      tone={tone}
      className={cn(className)}
    />
  );
}
