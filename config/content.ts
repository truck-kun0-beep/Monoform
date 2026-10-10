/**
 * Centralised content for the supporting pages and the legal
 * documents. Every entry has a `published` flag — when a document
 * is still a draft the page rendering layer shows a clear "draft"
 * banner instead of presenting the text as final business policy.
 *
 * The store owner can flip the flag (and update the copy) here
 * without touching the React components. Pages must never copy
 * policy text inline; they should always read from this module so
 * the footer, the FAQ and the policy pages stay synchronised.
 */

import { DELIVERY_FEE_TAKA, SUPPORTED_DELIVERY_ZONES } from "@/lib/orders/config";

/* ------------------------------------------------------------------ *
 * Publication status
 * ------------------------------------------------------------------ */

export type PublicationStatus = "published" | "draft" | "unconfigured";

/**
 * Wrap a body of text with publication metadata. `lastUpdated` is
 * a free-form string so the store owner can record a manual
 * revision date; we deliberately avoid generating dates so the
 * stored value always reflects the last human edit.
 */
export type DocumentMeta = {
  status: PublicationStatus;
  /** ISO date (YYYY-MM-DD) of the last meaningful edit. */
  lastUpdated: string;
  /** Optional version label, e.g. "v1.0". */
  version?: string;
  /** Optional effective date separate from the last edit. */
  effectiveDate?: string;
};

/* ------------------------------------------------------------------ *
 * About
 * ------------------------------------------------------------------ */

export type AboutSection = {
  title: string;
  body: string;
};

export const aboutPage = {
  status: "published" as PublicationStatus,
  lastUpdated: "2024-08-01",
  heading: "Less, but better.",
  introduction:
    "MONOFORM is a contemporary fashion concept centered on everyday essentials, considered details and versatile personal style. Our aim is to make finding pieces for everyday dressing feel simple, clear and enjoyable.",
  sections: [
    {
      title: "Brand introduction",
      body:
        "MONOFORM focuses on a narrow range of refined essentials — pieces designed to work together, season after season. The store is small, the catalogue is intentional, and the product team prefers editing to adding.",
    },
    {
      title: "Design philosophy",
      body:
        "We work with natural materials, restrained palettes and considered construction. Details are chosen because they earn their place — never for decoration. The aim is clothing that quietly outlasts trends.",
    },
    {
      title: "Product categories",
      body:
        "The catalogue covers everyday clothing for women, men and underwear — including t-shirts, shirts, knitwear, sweatshirts, hoodies, trousers, jeans, outerwear and the seasonal edits that group them together.",
    },
  ] as AboutSection[],
  /** Destination of the closing "Shop the collection" call to
   *  action. Edit here to retarget the link without touching the
   *  page component. */
  shopCta: {
    label: "Shop the collection",
    href: "/new-arrivals",
  },
};

/* ------------------------------------------------------------------ *
 * Help — landing
 * ------------------------------------------------------------------ */

export const helpLanding = {
  status: "published" as PublicationStatus,
  lastUpdated: "2024-08-01",
  heading: "Help Centre",
  description:
    "Find answers to common questions about orders, shipping, returns and sizing — or get in touch with our support team.",
  orderHelp: {
    title: "Need help with an order?",
    body:
      "If you already have an order you can track its status using your order number and the contact details on the order. The track-order page works for both signed-in customers and guests.",
    signedInAction: {
      label: "View my orders",
      href: "/account/orders",
    },
    guestAction: {
      label: "Track an order",
      href: "/track-order",
    },
  },
};

/* ------------------------------------------------------------------ *
 * Shipping
 * ------------------------------------------------------------------ */

const deliveryFeeSummary = SUPPORTED_DELIVERY_ZONES.map((zone) => ({
  zone,
  label: zone === "inside_dhaka" ? "Inside Dhaka" : "Outside Dhaka",
  fee: `৳${DELIVERY_FEE_TAKA[zone]}`,
}));

export const shippingPage = {
  status: "published" as PublicationStatus,
  lastUpdated: "2024-08-01",
  /** Page-level description shown under the page header. */
  summary:
    "Delivery is available across Bangladesh. The delivery fee is calculated from the destination zone you select at checkout and is shown before you place an order.",
  /** Structured delivery-zone table built from the central config. */
  zones: deliveryFeeSummary,
  notes: [
    {
      title: "Order processing",
      body:
        "Orders are processed during business days. The exact processing time depends on the current order volume and will be confirmed in your order confirmation email.",
    },
    {
      title: "Delivery coverage",
      body:
        "We currently deliver to all districts across Bangladesh. The inside/outside Dhaka classification is selected by the customer at checkout and is not inferred from the address string.",
    },
    {
      title: "Expected delivery timeframe",
      body:
        "Delivery timeframes depend on the destination. Specific timeframes are confirmed in the order confirmation email once the order is processed.",
    },
    {
      title: "Dispatch notifications",
      body:
        "When your order is dispatched you will receive a confirmation that includes the courier name and tracking reference (where the delivery partner provides one).",
    },
    {
      title: "Tracking information",
      body:
        "Use the Track Order page with your order number and the phone used at checkout to view the current status and any courier tracking.",
    },
    {
      title: "Delivery address corrections",
      body:
        "If you need to correct the delivery address please contact support as soon as possible. Address changes are only possible before the order has been dispatched.",
    },
    {
      title: "Failed delivery",
      body:
        "If delivery is attempted and the recipient is unavailable the courier will normally attempt redelivery or hold the parcel at the nearest collection point. We will follow up by email with the next step.",
    },
  ],
};

/* ------------------------------------------------------------------ *
 * Returns
 * ------------------------------------------------------------------ */

/**
 * Returns policy. Until the store owner supplies the real terms,
 * the body stays empty and the page is rendered as
 * configuration-required rather than presented as final policy.
 */
export const returnsPage: {
  status: PublicationStatus;
  lastUpdated: string;
  summary: string;
  contactCta: { label: string; href: string };
  /** When `null` the page renders a "configuration required" state. */
  sections: Array<{ title: string; body: string }> | null;
} = {
  status: "draft",
  lastUpdated: "2024-08-01",
  summary:
    "Our returns, exchanges and refund terms are currently being finalised. The information below is a draft outline of the structure we will publish once the policy is approved.",
  contactCta: { label: "Contact support", href: "/contact" },
  sections: null,
};

/* ------------------------------------------------------------------ *
 * Size guide
 * ------------------------------------------------------------------ */

export type SizeGuideEntry = {
  /** Category label shown in the size-guide table headings. */
  label: string;
  /** Optional human description shown below the table. */
  description: string;
  /** Sizes offered for this category, e.g. ["XS","S","M","L","XL"]. */
  sizes: ReadonlyArray<string>;
  /**
   * Optional measurement rows. When empty, the page renders a
   * clearly labelled explanation that real measurements will be
   * published when supplied.
   */
  rows: ReadonlyArray<{ label: string; values: Record<string, string> }>;
  /** Marks the table as a sample/placeholder so the UI can show
   *  a draft banner rather than a real sizing table. */
  isSample: boolean;
};

/**
 * Categories supported by the catalogue. The values here are kept
 * in sync with `config/catalogue.ts` and `config/sizeCharts.ts` —
 * when a new product category is added, add a row here.
 */
export const sizeGuide: {
  status: PublicationStatus;
  lastUpdated: string;
  notes: string[];
  categories: SizeGuideEntry[];
} = {
  status: "published",
  lastUpdated: "2024-08-01",
  notes: [
    "All measurements are in centimetres unless a row is explicitly labelled otherwise.",
    "Garment measurements are taken on a flat surface and may vary by a small margin. If you are between sizes we recommend ordering the larger size.",
    "For product-specific fit notes please refer to the description on each product page.",
  ],
  categories: [
    {
      label: "T-shirts & shirts",
      description:
        "Regular fit shirts and t-shirts. Garment measurements will be published here when the product specification is finalised.",
      sizes: ["XS", "S", "M", "L", "XL"],
      rows: [
        { label: "Chest", values: { XS: "—", S: "—", M: "—", L: "—", XL: "—" } },
        { label: "Length", values: { XS: "—", S: "—", M: "—", L: "—", XL: "—" } },
        { label: "Shoulder", values: { XS: "—", S: "—", M: "—", L: "—", XL: "—" } },
      ],
      isSample: true,
    },
    {
      label: "Sweatshirts & hoodies",
      description:
        "Relaxed fit sweatshirts and hoodies. Garment measurements will be published here when the product specification is finalised.",
      sizes: ["S", "M", "L", "XL"],
      rows: [
        { label: "Chest", values: { S: "—", M: "—", L: "—", XL: "—" } },
        { label: "Length", values: { S: "—", M: "—", L: "—", XL: "—" } },
        { label: "Sleeve", values: { S: "—", M: "—", L: "—", XL: "—" } },
      ],
      isSample: true,
    },
    {
      label: "Trousers & jeans",
      description:
        "Trousers and jeans cut for a regular to relaxed fit. Garment measurements will be published here when the product specification is finalised.",
      sizes: ["28", "30", "32", "34", "36"],
      rows: [
        { label: "Waist", values: { "28": "—", "30": "—", "32": "—", "34": "—", "36": "—" } },
        { label: "Hip", values: { "28": "—", "30": "—", "32": "—", "34": "—", "36": "—" } },
        { label: "Inseam", values: { "28": "—", "30": "—", "32": "—", "34": "—", "36": "—" } },
      ],
      isSample: true,
    },
    {
      label: "Underwear",
      description:
        "Underwear sizes follow standard small / medium / large / extra-large.",
      sizes: ["S", "M", "L", "XL"],
      rows: [
        { label: "Waist", values: { S: "—", M: "—", L: "—", XL: "—" } },
      ],
      isSample: true,
    },
  ],
};

/* ------------------------------------------------------------------ *
 * Privacy
 * ------------------------------------------------------------------ */

export const privacyPage: {
  status: PublicationStatus;
  lastUpdated: string;
  effectiveDate: string;
  version: string;
  summary: string;
  contactCta: { label: string; href: string };
  sections: Array<{ title: string; body: string }>;
} = {
  status: "draft",
  lastUpdated: "2024-08-01",
  effectiveDate: "To be confirmed",
  version: "draft",
  summary:
    "This privacy policy is a working draft. The final version will be published once it has been reviewed and the business contact information has been confirmed.",
  contactCta: { label: "Contact support", href: "/contact" },
  sections: [
    {
      title: "Information we collect",
      body:
        "We collect the information you provide when creating an account, saving delivery addresses, placing an order, contacting support or subscribing to the newsletter. This may include your name, email, phone number, delivery address and order details.",
    },
    {
      title: "How we use information",
      body:
        "We use the information to operate your account, process and deliver orders, respond to enquiries, send service notifications and — only where you have asked to receive them — marketing emails.",
    },
    {
      title: "Order processing and delivery",
      body:
        "Order information is shared with the payment and delivery providers that complete the order. We share the minimum information required for each step (for example, the courier receives the delivery address and contact phone).",
    },
    {
      title: "Customer support",
      body:
        "Support enquiries are stored so we can respond to you and improve our service. We do not use support messages for marketing.",
    },
    {
      title: "Service providers",
      body:
        "We share data with the third parties that help us run the store — for example the authentication provider, the payment provider, the delivery partner and the email provider. Each provider receives only the data it needs to perform its role.",
    },
    {
      title: "Data retention",
      body:
        "We keep account and order information for as long as your account is active or as required by law. You can request deletion of your account at any time by contacting support.",
    },
    {
      title: "Account access and correction",
      body:
        "You can view and edit most of your information from the account area. For anything else, contact support and we will help you update or delete the relevant data.",
    },
    {
      title: "Security",
      body:
        "We use reasonable technical and organisational measures to protect your information. No system is perfectly secure, so we cannot guarantee absolute security.",
    },
    {
      title: "Your requests",
      body:
        "You can request access to, correction of or deletion of your personal data. We will respond within the timeframes required by applicable law.",
    },
    {
      title: "Contact",
      body:
        "For privacy-related requests please contact our support team. The contact details are published on the Contact page once the final business information is confirmed.",
    },
  ],
};

/* ------------------------------------------------------------------ *
 * Terms
 * ------------------------------------------------------------------ */

export const termsPage: {
  status: PublicationStatus;
  lastUpdated: string;
  effectiveDate: string;
  version: string;
  summary: string;
  contactCta: { label: string; href: string };
  sections: Array<{ title: string; body: string }>;
} = {
  status: "draft",
  lastUpdated: "2024-08-01",
  effectiveDate: "To be confirmed",
  version: "draft",
  summary:
    "These terms and conditions are a working draft. The final version will be published once the business has reviewed them and the legal entity information has been confirmed.",
  contactCta: { label: "Contact support", href: "/contact" },
  sections: [
    {
      title: "Scope and acceptance",
      body:
        "These terms govern your use of the MONOFORM website and any order you place through it. By using the site or placing an order you accept these terms.",
    },
    {
      title: "Product descriptions and availability",
      body:
        "We do our best to describe products accurately. Images on the site may be placeholders during development; the production store will display the actual product assets and accurate descriptions. A product being shown in the catalogue does not guarantee it is in stock.",
    },
    {
      title: "Prices and currency",
      body:
        "Prices are shown in Bangladeshi Taka (BDT). Delivery charges are calculated separately at checkout based on the destination zone you select.",
    },
    {
      title: "Order submission and acceptance",
      body:
        "Submitting an order is an offer to buy, not a binding contract. We may decline or cancel an order (for example if a product is out of stock, a price is wrong or the payment cannot be verified). If we cancel an order we will tell you and refund any payment that has been taken.",
    },
    {
      title: "Pricing and product errors",
      body:
        "If a product is listed at an incorrect price or with incorrect information we may cancel the order and notify you, even if you have received an order confirmation.",
    },
    {
      title: "Payment methods",
      body:
        "We accept Cash on Delivery and the configured bKash payment workflow. Submitting a bKash transaction reference is not a guarantee of payment — orders paid by bKash are marked as awaiting verification until the reference has been confirmed.",
    },
    {
      title: "Delivery",
      body:
        "Delivery is available across Bangladesh. The final delivery charge is shown at checkout before you place your order and is based on the delivery zone you select.",
    },
    {
      title: "Returns, exchanges and refunds",
      body:
        "Our returns, exchanges and refund policy is published on the Returns page. The current version is a draft pending review.",
    },
    {
      title: "Your account",
      body:
        "You are responsible for keeping your account credentials safe and for any activity that happens under your account. Please notify us immediately if you believe your account has been compromised.",
    },
    {
      title: "Acceptable use",
      body:
        "You agree not to misuse the site — for example by attempting to access data you are not authorised to access, by interfering with the site, or by using the site to harass or harm other people.",
    },
    {
      title: "Intellectual property",
      body:
        "All content on the site (text, images, code, layout) belongs to MONOFORM or its licensors and is protected by applicable intellectual property laws. You may not copy or redistribute it without permission.",
    },
    {
      title: "Changes to the terms",
      body:
        "We may update these terms from time to time. The current version will always be published on this page along with the effective date.",
    },
    {
      title: "Contact",
      body:
        "If you have any questions about these terms please contact our support team using the details on the Contact page.",
    },
  ],
};

/* ------------------------------------------------------------------ *
 * FAQ
 * ------------------------------------------------------------------ */

export type FaqEntry = {
  question: string;
  answer: string;
};

export const faqGroups: Array<{
  title: string;
  entries: FaqEntry[];
}> = [
  {
    title: "Orders",
    entries: [
      {
        question: "How do I place an order?",
        answer:
          "Browse the catalogue, add the pieces you want to the bag, then proceed to checkout. You will need to sign in or create an account before you can place an order.",
      },
      {
        question: "Do I need an account?",
        answer:
          "Yes — an account is required to place an order. The account is also where you can review your orders, save delivery addresses and update your contact information.",
      },
      {
        question: "Where can I find my order number?",
        answer:
          "Your order number is shown on the order confirmation page and in the order confirmation email. It is also visible from the My Orders page of your account.",
      },
      {
        question: "How do I view my order status?",
        answer:
          "Signed-in customers can view the current status from the My Orders page. Anyone can also use the Track Order page with the order number and the phone used at checkout.",
      },
    ],
  },
  {
    title: "Delivery",
    entries: [
      {
        question: "What are the delivery charges?",
        answer:
          "Delivery inside Dhaka is ৳70 and delivery outside Dhaka is ৳120. The exact fee is shown at checkout based on the delivery zone you select.",
      },
      {
        question: "How can I track an order?",
        answer:
          "Use the Track Order page with your order number and the phone used at checkout. If a courier tracking reference is available it will be shown on the order page once the order is dispatched.",
      },
      {
        question: "Can I change my delivery address?",
        answer:
          "Address changes are only possible before the order has been dispatched. Please contact support as soon as possible if you need to correct the delivery address.",
      },
    ],
  },
  {
    title: "Payment",
    entries: [
      {
        question: "Can I pay with Cash on Delivery?",
        answer:
          "Yes. Cash on Delivery is available as a payment method at checkout for orders delivered within Bangladesh.",
      },
      {
        question: "How does the bKash payment process work?",
        answer:
          "At checkout you will see the bKash payment instructions and a field to enter your transaction reference after sending the payment. The order is marked as awaiting verification until the reference has been confirmed.",
      },
      {
        question: "How is bKash payment verified?",
        answer:
          "bKash payments are reviewed manually. Submitting a transaction reference is not the same as payment being confirmed — the order remains in the awaiting-verification state until the reference has been checked.",
      },
    ],
  },
  {
    title: "Products",
    entries: [
      {
        question: "How can I choose a size?",
        answer:
          "Open the size guide for the relevant category from the product page. The guide lists the sizes offered for that category along with the available measurements.",
      },
      {
        question: "Where can I see product details?",
        answer:
          "Each product page lists the materials, available sizes and colours, the price and any product-specific notes. The size guide is linked from the product page where it applies.",
      },
      {
        question: "Why is a product or variant unavailable?",
        answer:
          "Products or sizes can become temporarily unavailable. When this happens the size or colour is shown as unavailable on the product page and cannot be added to the bag.",
      },
    ],
  },
  {
    title: "Returns and support",
    entries: [
      {
        question: "What is the return policy?",
        answer:
          "Our returns policy is currently being finalised. Please refer to the Returns page for the current draft, or contact support for assistance with a specific order.",
      },
      {
        question: "How can I report a damaged or incorrect order?",
        answer:
          "Please contact support as soon as possible with your order number and a description of the issue. The contact form on the Contact page is the quickest way to reach us.",
      },
      {
        question: "How do I contact customer support?",
        answer:
          "Use the contact form on the Contact page. Signed-in customers can also reach us through their account area.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ *
 * Contact
 * ------------------------------------------------------------------ */

export const contactCopy = {
  status: "published" as PublicationStatus,
  lastUpdated: "2024-08-01",
  heading: "Contact us",
  description:
    "Send us a message using the form below. We will reply by email as soon as we can during business hours.",
  topics: [
    { value: "product", label: "Product question" },
    { value: "sizing", label: "Sizing assistance" },
    { value: "shipping", label: "Shipping" },
    { value: "returns", label: "Return or exchange" },
    { value: "order", label: "Existing order" },
    { value: "payment", label: "Payment" },
    { value: "other", label: "Other" },
  ],
};
