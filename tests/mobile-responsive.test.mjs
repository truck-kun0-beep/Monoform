/**
 * Regression tests for the mobile responsiveness fixes.
 *
 * The homepage had three layout problems on viewports between
 * 320–430px:
 *
 *  1. Horizontal page overflow (the visible white strip on the
 *     right). Root cause: the header's flex children (Menu button
 *     with the visible "Menu" label, wordmark with wide tracking,
 *     utility icons) could not shrink below their intrinsic
 *     width, pushing `container-bleed` past the viewport. The
 *     trigger row now uses `min-w-0` on every flex child, a
 *     smaller `gap-2` on mobile, and hides the redundant "Menu"
 *     label — the icon + `aria-label` still identify the control.
 *
 *  2. The FullHero used a 16:9 aspect ratio which gives only
 *     ~200px of height at 360px, but the text overlay
 *     (eyebrow + 2-line display heading + description + buttons)
 *     is ~210px tall. With `absolute inset-0` and `justify-end`,
 *     the overflowing text painted above the hero section and
 *     bled into the announcement bar / sticky header behind it.
 *     The hero now enforces a mobile-only minimum height
 *     (`min-h-[22rem] sm:min-h-0`) so the overlay always fits
 *     inside the hero without changing the desktop composition.
 *
 *  3. The MediaPlaceholder caption (`Image — Women — campaign`)
 *     overflowed narrow 2-up category cards on mobile, visually
 *     clipping at the card's right edge. The `— {label}` caption
 *     is now hidden below the `sm` breakpoint; the kind label
 *     (Image/Video) stays readable and the full label remains
 *     available to assistive tech via the container's
 *     `aria-label`.
 *
 * These tests assert the source-level invariants that prevent
 * regression. They are intentionally fast and do not need a
 * running dev server.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const headerSrc = readFileSync(
  new URL("../components/header/SiteHeader.tsx", import.meta.url),
  "utf8",
);
const logoSrc = readFileSync(
  new URL("../components/ui/Logo.tsx", import.meta.url),
  "utf8",
);
const heroSrc = readFileSync(
  new URL("../components/home/HomeHero.tsx", import.meta.url),
  "utf8",
);
const placeholderSrc = readFileSync(
  new URL("../components/media/MediaPlaceholder.tsx", import.meta.url),
  "utf8",
);
const videoSrc = readFileSync(
  new URL("../components/media/VideoPlaceholder.tsx", import.meta.url),
  "utf8",
);

test("SiteHeader trigger row uses min-w-0 so flex children can shrink on narrow viewports", () => {
  // The container-bleed row must allow its children to compress
  // at narrow widths. Without `min-w-0` the default `min-width:
  // auto` keeps each child at its intrinsic content size, which
  // is what produced the horizontal page overflow.
  assert.ok(
    /container-bleed[\s\S]*?flex[\s\S]*?min-w-0[\s\S]*?items-center[\s\S]*?justify-between/.test(
      headerSrc,
    ),
    "the header trigger row must include 'min-w-0' so flex children can compress on narrow viewports",
  );
  // The mobile menu trigger wrapper must also use min-w-0 for
  // the same reason.
  assert.ok(
    /lg:hidden[\s\S]*?flex[\s\S]*?min-w-0/.test(headerSrc),
    "the mobile menu trigger wrapper must include 'min-w-0'",
  );
  // The utility actions block must use min-w-0 too.
  assert.ok(
    /flex[\s\S]*?min-w-0[\s\S]*?items-center[\s\S]*?gap-1 sm:gap-2/.test(headerSrc),
    "the utility actions block must include 'min-w-0' so the icons row can compress",
  );
});

test("SiteHeader hides the visible 'Menu' label so the trigger fits at 320px", () => {
  // The Menu button contains an icon + a <span>Menu</span>. The
  // visible label must be hidden at all viewports because the
  // icon + aria-label is sufficient and the text pushed the
  // trigger row past the viewport on very narrow screens.
  assert.ok(
    /aria-label="Open menu"[\s\S]*?<span className="hidden">Menu<\/span>/.test(
      headerSrc,
    ),
    "the visible 'Menu' label must be hidden (className='hidden') so the trigger fits at 320px",
  );
});

test("SiteHeader uses a tighter mobile gap so the trigger row fits at 320px", () => {
  // The outer flex row must use `gap-2 sm:gap-4` — the previous
  // `gap-4` was too wide once the Menu label was visible.
  assert.ok(
    /justify-between gap-2 sm:gap-4/.test(headerSrc),
    "the trigger row must use 'gap-2 sm:gap-4' so the row fits at 320px without overflowing",
  );
});

test("Logo uses tighter tracking on mobile so the wordmark fits at 320px", () => {
  // The wordmark must use `tracking-[0.2em]` on mobile and
  // restore the wider `tracking-[0.3em]` on `sm` and up so the
  // desktop appearance is unchanged.
  assert.ok(
    /tracking-\[0\.2em\] sm:tracking-\[0\.3em\]/.test(logoSrc),
    "Logo must use 'tracking-[0.2em] sm:tracking-[0.3em]' so the wordmark is more compact on mobile",
  );
});

test("FullHero uses a portrait video aspect ratio on mobile so the video fills the screen", () => {
  // The hero video must use a portrait frame (3/4 or 4/5) on
  // mobile so it fills the phone viewport with no black band
  // above or below the player, and a 16/9 cinematic frame from
  // `sm` upward. The previous design forced a 16/9 video with a
  // tall `min-h` floor, which left ~280px of black under the
  // video on a 360px screen. Pinning the mobile aspect to
  // `aspect-[3/4]` (or `aspect-[4/5]`) gives the text overlay
  // somewhere to sit without forcing a tall `min-h`.
  assert.ok(
    /aspect-\[3\/4\]|aspect-\[4\/5\]/.test(videoSrc),
    "the video placeholder must use a portrait frame 'aspect-[3/4]' or 'aspect-[4/5]' on mobile so it fills the phone screen",
  );
  assert.ok(
    /sm:aspect-video/.test(videoSrc),
    "the video placeholder must switch to 'sm:aspect-video' (16/9) on tablet and up so the desktop hero stays cinematic",
  );
  // The hero title must use a responsive size so the heading
  // doesn't wrap into 3 lines on a 360px screen. The current
  // scale is `display-xl` on mobile (floor 2.25rem) and
  // `display-2xl` from `sm` upward (floor 2.75rem).
  assert.ok(
    /text-display-xl[\s\S]*?sm:text-display-2xl/.test(heroSrc),
    "the hero title must use a mobile-friendly size 'text-display-xl sm:text-display-2xl' so the heading fits on a 360px screen",
  );
  // The hero overlay container should also use a slightly
  // tighter mobile bottom padding so the text doesn't sit
  // flush against the section edge on very tall hero regions.
  assert.ok(
    /pb-\d+ sm:pb-16 lg:pb-20/.test(heroSrc),
    "the hero overlay container must use 'pb-8 sm:pb-16 lg:pb-20' for consistent mobile bottom padding",
  );
});

test("MediaPlaceholder hides the long '— {label}' caption below the sm breakpoint", () => {
  // The caption after the kind label must be hidden on mobile
  // (below the `sm` breakpoint) so it doesn't visually clip at
  // the right edge of narrow 2-up category cards. The full
  // label remains available to assistive tech via the
  // container's `aria-label`.
  assert.ok(
    /hidden truncate opacity-70 sm:inline/.test(placeholderSrc),
    "the '— {label}' caption must use 'hidden ... sm:inline' so it disappears on narrow cards",
  );
});
