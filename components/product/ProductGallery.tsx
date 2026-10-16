"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CampaignMediaPlaceholder, MediaPlaceholder, VideoPlaceholder } from "@/components/media";
import { cn } from "@/lib/utils";
import type { ProductMedia } from "@/types";

type Props = {
  /** Media slots in the order they should be rendered. */
  media: ProductMedia[];
  /** Optional product name used for accessible names. */
  productName: string;
  /** Optional override for the desktop default aspect ratio. */
  defaultAspectRatio?: number;
  className?: string;
};

/**
 * Product gallery.
 *
 * Desktop: a vertical column of media tiles, each with a small
 * `slot` caption. Mobile: a horizontally swipeable carousel with
 * scroll-snap. Empty media slots still render placeholders so the
 * layout dimensions are reserved until real assets are supplied.
 *
 * If a media slot is a video (`videoSrc` present or `slot === "video"`),
 * a `VideoPlaceholder` is used so the eventual `<video autoplay muted
 * loop playsInline>` element can be slotted in without changing the
 * surrounding layout.
 */
export function ProductGallery({
  media,
  productName,
  defaultAspectRatio = 3 / 4,
  className,
}: Props) {
  const items = media.length > 0 ? media : [];

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <DesktopColumn
        items={items}
        productName={productName}
        defaultAspectRatio={defaultAspectRatio}
      />
      <MobileScroller
        items={items}
        productName={productName}
        defaultAspectRatio={defaultAspectRatio}
      />
    </div>
  );
}

function DesktopColumn({
  items,
  productName,
  defaultAspectRatio,
}: {
  items: ProductMedia[];
  productName: string;
  defaultAspectRatio: number;
}) {
  if (items.length === 0) {
    return (
      <div className="hidden lg:block">
        <MediaPlaceholder
          label={productName}
          kind="image"
          aspectRatio={defaultAspectRatio}
        />
      </div>
    );
  }
  return (
    <div className="hidden flex-col gap-4 lg:flex">
      {items.map((item, index) => (
        <GalleryTile
          key={`${item.slot ?? "slot"}-${index}`}
          item={item}
          productName={productName}
          index={index}
        />
      ))}
    </div>
  );
}

function MobileScroller({
  items,
  productName,
  defaultAspectRatio,
}: {
  items: ProductMedia[];
  productName: string;
  defaultAspectRatio: number;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  const updateActive = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const tiles = el.querySelectorAll<HTMLElement>("[data-gallery-tile]");
    if (tiles.length === 0) return;
    const scrollCenter = el.scrollLeft + el.clientWidth / 2;
    let closest = 0;
    let closestDistance = Infinity;
    tiles.forEach((tile, index) => {
      const tileCenter = tile.offsetLeft + tile.offsetWidth / 2;
      const distance = Math.abs(tileCenter - scrollCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = index;
      }
    });
    setActive(closest);
  }, []);

  useEffect(() => {
    updateActive();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateActive, { passive: true });
    return () => el.removeEventListener("scroll", updateActive);
  }, [updateActive, items.length]);

  if (items.length === 0) {
    return (
      <div className="lg:hidden">
        <MediaPlaceholder
          label={productName}
          kind="image"
          aspectRatio={defaultAspectRatio}
        />
      </div>
    );
  }

  return (
    <div className="lg:hidden">
      <div
        ref={trackRef}
        className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:-mx-6 sm:px-6"
      >
        {items.map((item, index) => (
          <div
            key={`${item.slot ?? "slot"}-${index}`}
            data-gallery-tile
            className="w-[80vw] shrink-0 snap-center sm:w-[60vw]"
          >
            <GalleryTile
              item={item}
              productName={productName}
              index={index}
            />
          </div>
        ))}
      </div>
      {items.length > 1 ? (
        <p
          aria-live="polite"
          className="mt-3 text-center text-eyebrow uppercase text-ink-muted"
        >
          {String(active + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
        </p>
      ) : null}
    </div>
  );
}

function GalleryTile({
  item,
  productName,
  index,
}: {
  item: ProductMedia;
  productName: string;
  index: number;
}) {
  const aspectRatio = item.aspectRatio ?? 3 / 4;
  const isVideo = item.slot === "video" || Boolean(item.videoSrc);

  if (isVideo) {
    return (
      <figure className="flex flex-col gap-2">
        <VideoPlaceholder
          video={{ ...item, alt: item.alt || `${productName} — video` }}
          // Product videos keep the same portrait frame on every
          // viewport so the gallery grid stays uniform. We map the
          // numeric `aspectRatio` to one of the four supported
          // presets; the closest match wins.
          mobileAspectRatio={numberToPreset(aspectRatio)}
          desktopAspectRatio={numberToPreset(aspectRatio)}
        />
        <TileCaption item={item} index={index} />
      </figure>
    );
  }

  return (
    <figure className="flex flex-col gap-2">
      <CampaignMediaPlaceholder
        image={{ ...item, alt: item.alt || `${productName}` }}
        aspectRatio={aspectRatio}
      />
      <TileCaption item={item} index={index} />
    </figure>
  );
}

function TileCaption({ item, index }: { item: ProductMedia; index: number }) {
  if (!item.slot && !item.alt) return null;
  const label =
    item.slot ? item.slot.charAt(0).toUpperCase() + item.slot.slice(1) : null;
  return (
    <figcaption className="flex items-center justify-between text-eyebrow uppercase text-ink-muted">
      <span>{label ?? item.alt}</span>
      <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
    </figcaption>
  );
}

/**
 * Map a numeric `aspectRatio` (width/height) to the closest
 * supported `VideoPlaceholder` preset so the production CSS
 * always contains the same fixed utility set.
 */
function numberToPreset(
  ratio: number,
): "3/4" | "4/5" | "1/1" | "video" {
  if (Math.abs(ratio - 3 / 4) < 0.05) return "3/4";
  if (Math.abs(ratio - 4 / 5) < 0.05) return "4/5";
  if (Math.abs(ratio - 1) < 0.05) return "1/1";
  return "video";
}
