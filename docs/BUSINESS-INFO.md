# Business information checklist

This document lists every value the store owner must confirm or
supply before the storefront can accept real customer orders. Items
are grouped by area, and each entry tells the operator exactly
where the value lives once confirmed.

The storefront is **code complete**: every page renders, the order
backend is wired, and the database migrations are ready to apply.
The items below are the only things keeping the store from
launching real transactions.

---

## 1. Public business contact details

These appear in the footer, the contact page, and the
`/help/shipping` page. They are read from
`config/support.ts` and `config/brand.ts`.

| Item | Where it ends up | Status |
| --- | --- | --- |
| Public support email | `config/support.ts` (`support.toEmail`) | Required before going live. |
| Public support phone | `config/support.ts` (`support.phone`) | Optional but recommended. |
| Public business address | `config/support.ts` (`support.address`) | Optional but recommended. |
| Opening hours | `config/support.ts` (`support.hours`) | Optional. |
| Public "about" copy | `config/content.ts` (`about`) | Required — replace the placeholder text. |
| Public "contact" copy | `config/content.ts` (`contact`) | Required — replace the placeholder text. |

## 2. Store-owner notification email

| Item | Where it ends up | Status |
| --- | --- | --- |
| Store-owner order notification email | `STORE_ORDER_NOTIFICATION_EMAIL` env var | Required before going live. This is the only address every new-order email is sent to. |

## 3. Email delivery (Resend)

| Item | Where it ends up | Status |
| --- | --- | --- |
| Resend API key | `RESEND_API_KEY` env var | Required. Get from the Resend dashboard. |
| Verified sending identity | `RESEND_FROM_EMAIL` env var | Required. The address (or domain) must be verified in the Resend dashboard before email will send. |

The preflight script (`npm run preflight:email`) confirms both
variables are populated before deployment.

## 4. Delivery coverage and rules

| Item | Where it ends up | Status |
| --- | --- | --- |
| Inside-Dhaka delivery fee | `lib/orders/config.ts` (`DELIVERY_FEE_PAISA.inside_dhaka`) | Already set to ৳70. |
| Outside-Dhaka delivery fee | `lib/orders/config.ts` (`DELIVERY_FEE_PAISA.outside_dhaka`) | Already set to ৳120. |
| Delivery coverage (list of districts) | `config/content.ts` (`shipping`) | Optional. The order form currently asks the customer to choose inside / outside Dhaka manually. A district list can be added later; the order backend recomputes the zone from the customer's address if the operator upgrades `lib/orders/service.ts`. |
| Estimated delivery times | `config/content.ts` (`shipping`) | Required for the `/help/shipping` page. |
| Same-day / next-day availability | `config/content.ts` (`shipping`) | Optional. |

## 5. Return, exchange and refund policy

These values populate the `/help/returns` page and the legal pages.

| Item | Where it ends up | Status |
| --- | --- | --- |
| Return window | `config/content.ts` (`returns`) | Required. |
| Items eligible for return | `config/content.ts` (`returns`) | Required. |
| Return shipping cost | `config/content.ts` (`returns`) | Required. |
| Refund method | `config/content.ts` (`returns`) | Required. |
| Exchange procedure | `config/content.ts` (`returns`) | Required. |
| Damaged / defective procedure | `config/content.ts` (`returns`) | Required. |

## 6. Privacy and terms

| Item | Where it ends up | Status |
| --- | --- | --- |
| Privacy policy copy | `config/content.ts` (`privacy`) | Required. Must be reviewed and approved by the operator before flipping `published` to `true`. |
| Terms of service copy | `config/content.ts` (`terms`) | Required. Same approval gate. |
| Data-retention period | `config/content.ts` (`privacy`) | Required. |
| Contact for privacy requests | `config/content.ts` (`privacy`) | Required. |
| Governing law | `config/content.ts` (`terms`) | Required. |

The legal pages render a **"DRAFT — not for publication"** banner
when `published` is not `true`. The operator flips the flag per
document in `config/content.ts`.

## 7. Catalogue content

| Item | Where it ends up | Status |
| --- | --- | --- |
| Final product names, prices, descriptions | `lib/seed/products.ts` | Required. |
| Final category names + descriptions | `lib/seed/categories.ts` | Required. |
| Final size chart measurements | `config/sizeCharts.ts` | Required for `/help/size-guide`. |
| Product imagery | `lib/seed/products.ts` `media[]` and `colors[].media[]` | See `docs/MEDIA.md`. |
| Editorial copy for `new-arrivals` and `sale` | `config/content.ts` | Optional. |

## 8. Brand and visual identity

| Item | Where it ends up | Status |
| --- | --- | --- |
| Final brand name | `config/brand.ts` (`brand.name`) | Currently "MONOFORM". The brand is treated as the working name; rename only when the store owner confirms the change. |
| Graphical logo (if any) | `config/brand.ts` (`brand.logoSrc`) | Optional. The wordmark is the current brand mark. |
| Social handles | `config/brand.ts` (`brand.social`) | Optional but recommended. |
| Public business name | `config/brand.ts` (`brand.legalName`) | Optional. |

## 9. Customer-support workflow

| Item | Where it ends up | Status |
| --- | --- | --- |
| Public support email | `config/support.ts` (`support.toEmail`) | Required (also used as the notification target for `/contact` form submissions). |
| Contact form topics | `lib/support/server.ts` (`ALLOWED_TOPICS`) | The default list covers the common reasons. Add or remove topics as needed. |
| Contact form response SLA | Out of scope for code; the operator responds by email. | Required: the storefront publishes no SLA today. |

## 10. Payment methods

| Item | Where it ends up | Status |
| --- | --- | --- |
| Supported payment methods | `lib/orders/config.ts` (`SUPPORTED_PAYMENT_METHODS`) | Currently COD and manual bKash. No automatic gateway is integrated. |
| bKash "send money" number | `config/content.ts` (`payment`) | Required so the customer can complete the manual bKash step. |
| bKash instructions copy | `config/content.ts` (`payment`) | Required. |
| Decision on automatic bKash gateway | Not implemented | Decide before launch. No gateway integration has been added. |

## 11. Administrator account

| Item | Where it ends up | Status |
| --- | --- | --- |
| Store-owner user account | `auth.users` (Supabase) | The owner signs up through `/register` first, then is promoted via `admin_allowlist` (see `docs/ADMIN.md` and the README). |
| First administrator | `public.admin_allowlist` | See `docs/ADMIN.md` for the safe provisioning procedure. |

## 12. What the operator must NOT do

- Do not paste a real service-role key, Resend API key, or Supabase
  password into chat, issue trackers, or any non-secure location.
- Do not change `currency` away from BDT — the order backend only
  accepts BDT and a mid-flight change requires a database migration.
- Do not flip `published` to `true` for the legal pages until the
  copy has been reviewed by qualified counsel.
- Do not populate product media with stock photos. The project
  ships with placeholders on purpose; the operator's photographer
  replaces them.
