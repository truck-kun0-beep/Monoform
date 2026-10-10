/**
 * Visually hidden until focused, then shown above all content. Lets
 * keyboard users skip the announcement + header.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-toast focus:bg-ink focus:px-4 focus:py-2 focus:text-eyebrow focus:uppercase focus:text-paper"
    >
      Skip to content
    </a>
  );
}
