"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ProductImagePlaceholder } from "@/components/media";
import { Modal } from "@/components/ui";
import { CloseIcon, SearchIcon } from "@/components/ui/Icon";
import { listAllProducts } from "@/lib/products";
import { formatPrice } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
};

const MAX_RESULTS = 6;

/**
 * Search overlay. Built on the shared `Modal` primitive so focus
 * trapping, scroll lock and Escape behaviour are inherited. The
 * overlay is purely a search shortcut — the canonical results page
 * remains `/search?q=…`.
 */
export function SearchOverlay({ open, onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const titleId = useId();

  // Autofocus the input when the overlay opens.
  useEffect(() => {
    if (open) {
      // Defer to allow the modal to mount.
      const id = window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 30);
      return () => window.clearTimeout(id);
    }
    setQuery("");
  }, [open]);

  const products = useMemo(() => listAllProducts(), []);
  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    return products
      .filter((product) => {
        const haystack = `${product.name} ${product.category} ${product.subCategory ?? ""} ${product.description}`.toLowerCase();
        return haystack.includes(term);
      })
      .slice(0, MAX_RESULTS);
  }, [products, query]);

  const categoryMatches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    return Array.from(
      new Set(products.map((product) => product.category)),
    )
      .filter((category) => category.toLowerCase().includes(term))
      .slice(0, 4);
  }, [products, query]);

  const hasQuery = query.trim().length >= 2;
  const showEmpty = hasQuery && results.length === 0 && categoryMatches.length === 0;

  const submit = (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    const term = query.trim();
    if (!term) return;
    onClose();
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Search"
      size="lg"
      className="max-w-2xl"
    >
      <form
        onSubmit={submit}
        role="search"
        aria-label="Site search"
        className="flex flex-col gap-6"
      >
        <label htmlFor={titleId} className="sr-only">
          Search the store
        </label>
        <div className="flex items-center gap-3 border-b border-line-strong pb-3">
          <SearchIcon className="h-5 w-5 text-ink" />
          <input
            ref={inputRef}
            id={titleId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKey}
            placeholder="Search for products, categories…"
            className="block w-full bg-transparent text-base text-ink placeholder:text-ink-subtle focus:outline-none"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="inline-flex items-center gap-1 text-eyebrow uppercase text-ink-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              aria-label="Clear search"
            >
              <CloseIcon className="h-4 w-4" />
              Clear
            </button>
          ) : null}
        </div>

        {hasQuery ? (
          <div className="flex flex-col gap-6">
            {results.length > 0 ? (
              <div>
                <p className="text-eyebrow uppercase text-ink-muted">
                  Products
                </p>
                <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {results.map((product) => (
                    <li key={product.id}>
                      <Link
                        href={`/product/${product.slug}`}
                        onClick={onClose}
                        className="flex items-center gap-3 border border-line p-2 transition-colors hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                      >
                        <div className="h-16 w-16 shrink-0 overflow-hidden">
                          <ProductImagePlaceholder
                            image={product.image}
                            hideLabel
                            height="64px"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-ink">
                            {product.name}
                          </p>
                          <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-ink-muted">
                            {product.subCategory ?? product.category}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm text-ink">
                          {formatPrice(
                            product.price.amount,
                            product.price.currency,
                          )}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {categoryMatches.length > 0 ? (
              <div>
                <p className="text-eyebrow uppercase text-ink-muted">
                  Categories
                </p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {categoryMatches.map((category) => (
                    <li key={category}>
                      <Link
                        href={`/category/${category}`}
                        onClick={onClose}
                        className="link-underline text-sm text-ink"
                      >
                        {category.replace(/-/g, " ")}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {showEmpty ? (
              <p className="border border-line p-6 text-sm text-ink-muted">
                No matches for &ldquo;{query}&rdquo;. Try a different keyword or
                browse the latest{" "}
                <Link
                  href="/new-arrivals"
                  onClick={onClose}
                  className="link-underline text-ink"
                >
                  new arrivals
                </Link>
                .
              </p>
            ) : null}

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center justify-center bg-ink px-6 py-3 text-xs uppercase tracking-[0.2em] text-paper transition-colors hover:bg-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                See all results
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            Search the catalogue by name or category. Press Enter to open the
            full results page.
          </p>
        )}
      </form>
    </Modal>
  );
}
