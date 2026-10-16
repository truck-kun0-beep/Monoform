
import Image from "next/image";
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

export function CampaignMediaPlaceholder({
  image,
  aspectRatio = 16 / 9,
  className,
  tone = "warm",
}: Props) {
  const ratio = image.aspectRatio ?? aspectRatio;

  if (image.src) {
    return (
      <div
        className={cn("relative w-full overflow-hidden", className)}
        style={{ aspectRatio: ratio }}
      >
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <MediaPlaceholder
      label={image.alt}
      kind="image"
      aspectRatio={ratio}
      tone={tone}
      className={cn(className)}
    />
  );
}
