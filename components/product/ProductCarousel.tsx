"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ProductCard } from "./ProductCard";
import { cn } from "@/lib/utils";
import type { ProductSummary } from "@/types";
import { ArrowRightIcon } from "@/components/ui/Icon";

type Props = {
  products: ProductSummary[];
  /** When true, each card exposes the "Quick add" action. */
  showQuickAdd?: boolean;
  /** Optional CTA rendered at the end of the carousel. */
  cta?: { label: string; href: string };
  className?: string;
};

/**
 * Horizontal product carousel.
 *
 * Touch-friendly scroll-snap carousel with prev / next buttons and
 * arrow-key support. The buttons are real `<button>`s that become
 * disabled at the scroll boundaries, so keyboard users can navigate
 * without trapping focus.
 *
 * All scroll behaviour is delegated to the browser via CSS
 * `scroll-snap-type` so the layout works without JavaScript.
 */
export function ProductCarousel({
  products,
  showQuickAdd = false,
  cta,
  className,
}: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  // Recalculate button state when products or layout change.
  const updateButtons = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    // Allow a 2px slop to avoid sub-pixel flicker.
    setCanPrev(scrollLeft > 2);
    setCanNext(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateButtons();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateButtons, { passive: true });
    window.addEventListener("resize", updateButtons);
    return () => {
      el.removeEventListener("scroll", updateButtons);
      window.removeEventListener("resize", updateButtons);
    };
  }, [updateButtons, products]);

  const scrollBy = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    // Scroll by roughly one card plus its gutter.
    const firstCard = el.querySelector<HTMLElement>("[data-carousel-item]");
    const step = firstCard
      ? firstCard.getBoundingClientRect().width + 24
      : el.clientWidth * 0.8;
    el.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollBy(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollBy(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      trackRef.current?.scrollTo({ left: 0, behavior: "smooth" });
    } else if (event.key === "End") {
      event.preventDefault();
      const el = trackRef.current;
      if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    }
  };

  if (products.length === 0) return null;

  return (
    <div className={cn("relative", className)}>
      <div
        ref={trackRef}
        role="region"
        aria-label="Product carousel"
        tabIndex={0}
        onKeyDown={onKeyDown}
        className={cn(
          "no-scrollbar -mx-5 flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 pb-2",
          "sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
        )}
      >
        {products.map((product, index) => (
          <div
            key={product.id}
            data-carousel-item
            className="w-[70vw] shrink-0 snap-start sm:w-[40vw] lg:w-[280px] xl:w-[300px]"
          >
            <ProductCard
              product={product}
              priority={index < 2}
              showQuickAdd={showQuickAdd}
            />
          </div>
        ))}
        {cta ? (
          <div
            data-carousel-item
            className="flex w-[180px] shrink-0 snap-start items-center"
          >
            <a
              href={cta.href}
              className={cn(
                "group inline-flex items-center gap-2 text-eyebrow uppercase text-ink",
                "link-underline",
              )}
            >
              {cta.label}
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div
          aria-hidden="true"
          className="text-eyebrow uppercase text-ink-muted"
        >
          {products.length} {products.length === 1 ? "piece" : "pieces"}
        </div>
        <div className="flex items-center gap-2">
          <CarouselButton
            direction="prev"
            disabled={!canPrev}
            onClick={() => scrollBy(-1)}
          />
          <CarouselButton
            direction="next"
            disabled={!canNext}
            onClick={() => scrollBy(1)}
          />
        </div>
      </div>
    </div>
  );
}

function CarouselButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Previous products" : "Next products"}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center border border-line text-ink",
        "transition-colors duration-base ease-out-soft",
        "hover:border-ink hover:bg-ink hover:text-paper",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line disabled:hover:bg-transparent disabled:hover:text-ink",
      )}
    >
      <ArrowRightIcon
        className={cn(
          "h-4 w-4",
          direction === "prev" && "rotate-180",
        )}
      />
    </button>
  );
}
