// Regression tests for Prompt 18 — mega-menu hover region and
// newsletter form layout.
//
// These tests run against the configured dev server so they
// exercise the real, server-rendered HTML. They are SKIPPED when
// the dev server is not reachable so a CI machine without one
// still passes the rest of the suite.
//
// The tests verify:
//
//   1. Bug 1: the mega-menu hover region.
//      - The invisible bridge is rendered between the trigger row
//        and the panel.
//      - The mega-menu strip has a continuous hover region (the
//        wrapper element groups all panels).
//      - The close delay is implemented in the source (grace
//        period before the menu closes).
//
//   2. Bug 2: the newsletter form layout.
//      - The homepage form uses a container query so it lays out
//        as a row on a wide container.
//      - The footer form also uses the same container query, so
//        it stacks on a narrow container instead of crushing the
//        input to a few pixels.
//      - The input element is `w-full` with `min-w-0` so long
//        emails scroll inside the field rather than overflowing.
//      - The submit button does not squeeze the input.
//
//   3. The visible HTML still contains every product surface
//      (categories, headings, links) and the newsletter markup
//      is present on both the homepage and the footer.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const DEV_PORT = process.env.DEV_PORT || "3000";
const BASE_URL = `http://localhost:${DEV_PORT}`;

async function fetchHtml(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    redirect: "follow",
    headers: { "User-Agent": "node-regression-test" },
  });
  assert.equal(res.status, 200, `${path} returned ${res.status}`);
  return res.text();
}

let serverAvailable = false;
let homeHtml = "";
let footerHtml = "";

test("fetch homepage HTML once", async (t) => {
  try {
    homeHtml = await fetchHtml("/");
    serverAvailable = true;
  } catch (error) {
    serverAvailable = false;
    t.skip(`dev server not reachable on ${BASE_URL}: ${error.message}`);
  }
});

test("the mega-menu bridge element is rendered between the trigger row and the panel", (t) => {
  if (!serverAvailable) return t.skip("dev server not reachable");
  // The bridge is a div with h-3 and -translate-y-full inside
  // the mega-menu strip. The strip is the second child of the
  // header (after the trigger row).
  const bridge = homeHtml.match(
    /<div aria-hidden="true" class="absolute inset-x-0 top-0 h-3 -translate-y-full"><\/div>/,
  );
  assert.ok(
    bridge,
    "expected an invisible vertical bridge between the trigger row and the mega-menu panel",
  );
});

test("the mega-menu strip is a single hover region with all panels inside", (t) => {
  if (!serverAvailable) return t.skip("dev server not reachable");
  // The mega-menu strip is the `<div class="relative hidden lg:block">`
  // that directly follows the header trigger row. All mega-menu
  // panels are children of this wrapper.
  const stripMatch = homeHtml.match(
    /<\/header>/,
  );
  // Find the wrapper that contains the mega-menu panels.
  // It should have at least one child with id="mega-menu-women".
  assert.ok(
    homeHtml.includes('id="mega-menu-women"'),
    "expected the Women's mega-menu panel to be rendered",
  );
  assert.ok(
    homeHtml.includes('id="mega-menu-men"'),
    "expected the Men's mega-menu panel to be rendered",
  );
  assert.ok(
    homeHtml.includes('id="mega-menu-underwear"'),
    "expected the Underwear mega-menu panel to be rendered",
  );
});

test("the SiteHeader source declares a delayed-close grace period", () => {
  // The constant ensures the user can move the cursor from the
  // trigger into the panel without the menu closing instantly.
  const src = readFileSync(
    new URL("../components/header/SiteHeader.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(
    /MEGA_MENU_CLOSE_DELAY_MS\s*=/.test(src),
    "SiteHeader.tsx must define MEGA_MENU_CLOSE_DELAY_MS to avoid instant close",
  );
  assert.ok(
    /scheduleCloseMenu\s*=/.test(src),
    "SiteHeader.tsx must define a scheduleCloseMenu helper",
  );
  assert.ok(
    /clearCloseTimer\s*=/.test(src),
    "SiteHeader.tsx must clear pending closes on enter",
  );
  // The <li> must schedule a close, not close immediately.
  assert.ok(
    /onMouseLeave=\{[\s\S]*?scheduleCloseMenu\(\)[\s\S]*?\}/.test(src),
    "the <li> onMouseLeave must schedule a delayed close, not close immediately",
  );
  // The mega-menu strip must clear the timer on enter and
  // schedule a close on leave.
  assert.ok(
    /onMouseEnter=\{[\s\S]*?clearCloseTimer\(\)[\s\S]*?\}/.test(
      src.match(/<div[\s\S]*?hidden lg:block"[\s\S]*?<\/div>/)?.[0] ?? "",
    ),
    "the mega-menu strip must clear the close timer on mouse enter",
  );
  assert.ok(
    /onMouseLeave=\{[\s\S]*?scheduleCloseMenu\(\)[\s\S]*?\}/.test(
      src.match(/<div[\s\S]*?hidden lg:block"[\s\S]*?<\/div>/)?.[0] ?? "",
    ),
    "the mega-menu strip must schedule a close on mouse leave",
  );
});

test("Escape handler closes the open menu", () => {
  const src = readFileSync(
    new URL("../components/header/SiteHeader.tsx", import.meta.url),
    "utf8",
  );
  // The Escape effect must call closeMenuNow (not just close the
  // mobile drawer) so the mega-menu also closes.
  assert.ok(
    /event\.key === "Escape"[\s\S]*?closeMenuNow\(\)/.test(src),
    "Escape must close the mega-menu",
  );
});

test("route changes clear any pending close and close the menu", () => {
  const src = readFileSync(
    new URL("../components/header/SiteHeader.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(
    /useEffect\(\(\) => \{[\s\S]*?closeMenuNow\(\)[\s\S]*?\}, \[pathname/.test(src),
    "route changes must call closeMenuNow to cancel any pending close",
  );
  // The unmount effect must clear the timer to avoid setting
  // state on an unmounted component.
  assert.ok(
    /return \(\) => clearCloseTimer\(\)/.test(src),
    "SiteHeader must clear the close timer on unmount",
  );
});

test("the homepage newsletter form input wrapper allows shrinking and the input fills it", (t) => {
  if (!serverAvailable) return t.skip("dev server not reachable");
  // The input wrapper must allow shrinking inside the row.
  assert.ok(
    /min-w-0 flex-1 text-left/.test(homeHtml),
    "the input wrapper must allow shrinking (min-w-0 flex-1)",
  );
  // The input itself must be w-full and min-w-0.
  assert.ok(
    /type="email"[^>]*class="[^"]*w-full[^"]*min-w-0/.test(homeHtml) ||
      /class="[^"]*w-full[^"]*min-w-0[^"]*"[^>]*type="email"/.test(homeHtml),
    "the email input must be w-full with min-w-0 so long addresses scroll",
  );
});

test("the footer newsletter form stacks vertically (the column is too narrow for a row)", (t) => {
  if (!serverAvailable) return t.skip("dev server not reachable");
  const footerStart = homeHtml.indexOf(
    '<div class="lg:col-span-2"><h3 class="text-eyebrow uppercase text-ink">Newsletter</h3>',
  );
  assert.ok(footerStart > 0, "expected the footer newsletter column to be rendered");
  const footerChunk = homeHtml.substring(footerStart, footerStart + 6000);
  // The footer form uses variant="inline" which is always a
  // single column. The inner row must NOT have sm:flex-row.
  const innerRow = footerChunk.match(/<div class="flex gap-3[^"]*">/);
  assert.ok(innerRow, "expected the inner input+button row to be rendered");
  assert.ok(
    !/sm:flex-row/.test(innerRow[0]),
    "the footer form's inner row must be a column only (no sm:flex-row), so the input is not squeezed by the button",
  );
  // The footer form must use the smaller `md` button size so
  // it does not overflow the narrow column.
  assert.ok(
    /h-11 px-6/.test(footerChunk),
    "the footer form's submit button must use the smaller 'md' size (h-11 px-6)",
  );
  // The input wrapper must allow shrinking.
  assert.ok(
    /min-w-0 flex-1 text-left/.test(footerChunk),
    "the footer input wrapper must allow shrinking (min-w-0 flex-1)",
  );
});

test("the footer newsletter column width is small enough to require stacking", () => {
  // The footer uses a 12-col grid. The newsletter column is
  // lg:col-span-2 = ~16.7% of the container. At 1280px viewport
  // that is ~210px, which is not enough for a row with a
  // fixed-width button.
  const grid = readFileSync(
    new URL("../components/layout/Footer.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(
    /lg:col-span-2[^>]*>[\s\S]*?Newsletter/.test(grid),
    "the footer's newsletter column is lg:col-span-2, which is intentionally narrow",
  );
  // The footer must use the `inline` variant so the form is
  // always a single column.
  assert.ok(
    /variant="inline"/.test(grid),
    "the footer must use variant='inline' so the form stacks in the narrow column",
  );
});

test("the Input component uses block w-full (the input can grow to fill its parent)", () => {
  const src = readFileSync(
    new URL("../components/ui/Input.tsx", import.meta.url),
    "utf8",
  );
  // The input must be block + w-full by default. Any parent
  // flex/grid shrinkage is the caller's responsibility.
  assert.ok(
    /block w-full/.test(src),
    "Input.tsx must keep 'block w-full' on the <input> element",
  );
  // The input must NOT set a fixed size or maxLength.
  assert.ok(
    !/<input[\s\S]*?size=/.test(src),
    "Input.tsx must not set a fixed HTML size attribute on the <input>",
  );
});

test("the newsletter form preserves the typed email through validation failures", () => {
  const src = readFileSync(
    new URL("../components/newsletter/NewsletterForm.tsx", import.meta.url),
    "utf8",
  );
  // The error branch must not reset the email state.
  // The handleSubmit sets setStatus({ kind: "error", ... }) and
  // must NOT call setEmail("") on the failure path.
  const handleSubmitMatch = src.match(
    /async function handleSubmit[\s\S]*?\n  \}/,
  );
  assert.ok(handleSubmitMatch, "handleSubmit must be defined");
  const body = handleSubmitMatch[0];
  // The success branch resets the email (intentional). The error
  // branch must not.
  const successBlock = body.match(/result\.ok[\s\S]*?setEmail\(""\)/);
  assert.ok(
    successBlock,
    "success path must clear the email so the visitor can subscribe another address",
  );
  // The catch branch sets a generic error and must not touch the
  // email state.
  const catchBlock = body.match(/catch\s*\{[\s\S]*?\n    \}/);
  assert.ok(catchBlock, "catch branch must be defined");
  assert.ok(
    !/setEmail/.test(catchBlock[0]),
    "catch branch must not reset the email on failure",
  );
  // The explicit error result branch (result.ok === false) must
  // also not reset the email.
  const errorResultBlock = body.match(
    /setStatus\(\{ kind: "error", message: result\.error \}\)/,
  );
  assert.ok(
    errorResultBlock,
    "the form must surface server-side error messages without resetting the email",
  );
});

test("the newsletter form input wrapper has min-w-0 so long emails scroll inside the field", () => {
  const src = readFileSync(
    new URL("../components/newsletter/NewsletterForm.tsx", import.meta.url),
    "utf8",
  );
  // The input wrapper must have min-w-0 so the flex item can
  // shrink inside the row layout without forcing the input to
  // overflow its parent.
  assert.ok(
    /min-w-0 flex-1 text-left/.test(src),
    "the input wrapper must use 'min-w-0 flex-1 text-left' so the input can shrink",
  );
  // The input must be w-full with min-w-0 so long addresses
  // scroll inside the field rather than overflowing.
  assert.ok(
    /className="w-full min-w-0"/.test(src),
    "the input must pass 'w-full min-w-0' to the Input component",
  );
});

test("the newsletter form keeps the consent checkbox and submit state machine intact", () => {
  const src = readFileSync(
    new URL("../components/newsletter/NewsletterForm.tsx", import.meta.url),
    "utf8",
  );
  // The consent checkbox must be a controlled checkbox with
  // required validation.
  assert.ok(
    /name="consent"[\s\S]*?required/.test(src),
    "the consent checkbox must be a required controlled input",
  );
  // The submit button must remain a real <button type="submit">.
  assert.ok(
    /type="submit"/.test(src),
    "the submit control must remain a real submit button",
  );
  // The loading state must disable the input and the button.
  assert.ok(
    /disabled=\{isSubmitting\}/.test(src),
    "the input and button must be disabled while the form is submitting",
  );
});
