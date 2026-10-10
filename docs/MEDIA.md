# Media and brand-asset guide

This document records every media location the storefront renders and
the exact spot the owner should add the real assets to. **Do not
populate these slots with random stock photos.** The project ships
with empty placeholders on purpose; the operator's photographer
will replace them.

The guide is intentionally implementation-aware: each entry points
to the seed record and the file / config the operator edits.

---

## 1. Where media lives in the codebase

| Layer | What lives there | Where it is configured |
| --- | --- | --- |
| Seed catalogue | Product photos, gallery slots, color variants | `lib/seed/products.ts` |
| Categories | Category hero / banner images | `lib/seed/categories.ts` |
| Homepage hero | Hero image or video | `components/home/…` (read by the homepage) |
| Campaign sections | Editorial imagery for `new-arrivals`, `sale`, `category/[slug]` | The matching route page in `app/…` |
| Brand mark | Wordmark (current) or graphical logo | `config/brand.ts` (`brand.logoSrc`) |
| Social links | Footer social handles | `config/brand.ts` (`brand.social`) |
| Public support details | Email, phone, address | `config/support.ts` |

Every media entry in the codebase uses an `alt` text and (where
relevant) a `slot` identifier. The page components select the right
slot by name, so the owner can rename the asset file without
breaking the layout.

## 2. Product media

Each product in `lib/seed/products.ts` carries:

- A product-level `media[]` array — used for the default gallery.
- A per-color `colors[].media[]` array — used when a customer
  picks a specific colour.

Slot names currently in use:

| Slot | Purpose | Recommended aspect |
| --- | --- | --- |
| `front` | Front-on product shot | 3:4 portrait |
| `back` | Back-on product shot | 3:4 portrait |
| `full` | Full-length / lifestyle | 3:4 portrait |
| `detail` | Fabric / hardware detail | 1:1 square |
| `lifestyle` | Lifestyle / on-figure | 4:5 portrait |
| `video` | Optional product video | 1:1 square or 4:5 |

To attach an image, set the `src` field on the relevant media entry
in `lib/seed/products.ts`. The `placeholder` UI fades out as soon as
a real `src` is present.

**Do not** remove the `alt` text. The application renders the alt
in every placeholder so the layout does not collapse when the real
asset is added later.

## 3. Category and campaign media

`lib/seed/categories.ts` defines the categories surfaced by the
catalogue. To attach a category banner, add a `hero` object to the
matching entry with `{ src, alt, aspectRatio }`. The category page
reads this slot directly.

For campaign pages (`app/new-arrivals`, `app/sale`, and
`app/category/[slug]`), the page body renders an empty
`MediaPlaceholder` until the operator adds a hero to the relevant
category or campaign record.

## 4. Homepage hero

`components/home/Hero.tsx` reads a `hero` object from the homepage
configuration. Until the operator provides an asset, the slot
renders as a typographic placeholder that preserves the section
height and tone.

## 5. Brand logo (when a graphical logo replaces the wordmark)

`config/brand.ts` exposes `brand.logoSrc`. When the operator
supplies a graphical logo, set this to the file path. The
`SiteHeader` component will render the logo instead of the wordmark.
The wordmark is preserved as a fallback for accessibility (the `alt`
text remains "MONOFORM" so screen readers still announce the brand
name).

## 6. Social and support details

| Field | Configured in | Notes |
| --- | --- | --- |
| Public support email | `config/support.ts` | Displayed in the contact page and footer. |
| Public support phone | `config/support.ts` | Displayed in the contact page. |
| Public business address | `config/support.ts` | Displayed in the about page. |
| Social handles (Instagram, Facebook, etc.) | `config/brand.ts` | `brand.social`. |

These are read by both the footer and the `/about` page; the
operator edits them in one place.

## 7. Adding a new asset

1. Drop the file in a stable location (`public/media/...` is the
   recommended directory for the storefront). Use descriptive,
   kebab-case names.
2. Edit the matching seed record to add the `src` and the
   intended `slot` to a media entry. The `alt` text must describe
   the image accurately — empty `alt` is rejected by the lint rule
   in the seed data.
3. Re-run `npm run dev`. The placeholder UI is replaced by the real
   asset; no other change is required.
4. Run `npm test` to confirm the catalogue and cart tests still
   pass (they do not depend on media, so this is a sanity check).

## 8. Removing an asset

Set the `src` to `null` (or delete the entry). The placeholder UI
reappears. The product page keeps the original aspect ratio so the
layout does not jump.

## 9. What the operator must not change

- The slot names (`front`, `back`, `detail`, `lifestyle`, `video`)
  are referenced by the page templates. Renaming a slot requires
  updating both the seed record and the consuming component.
- The `currency` field on prices — the order backend refuses to
  place orders in anything other than BDT.
- The `categorySlug` value on each product — the catalogue pages
  look up products by this key.
