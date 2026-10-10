/**
 * Status and empty-state messages.
 *
 * Centralised so any page can reference consistent copy without
 * duplicating strings across components.
 */

export const messages = {
  comingSoon: {
    title: "Coming soon",
    body: "This page is part of the planned site. The implementation will be added in a follow-up step.",
  },
  emptyCart: {
    title: "Your bag is empty",
    body: "Discover the latest arrivals and curated edits to begin.",
    action: { label: "Continue Shopping", href: "/new-arrivals" },
  },
  emptySearch: {
    title: "No results",
    body: "Try adjusting your search or browse the latest arrivals.",
  },
  emptyOrders: {
    title: "No orders yet",
    body: "When you place an order it will appear here.",
  },
  emptyWishlist: {
    title: "Your wishlist is empty",
    body: "Save pieces you love to revisit them later.",
    action: { label: "Explore", href: "/new-arrivals" },
  },
  notFound: {
    title: "Page not found",
    body: "The page you are looking for could not be found.",
    action: { label: "Return Home", href: "/" },
  },
  error: {
    title: "Something went wrong",
    body: "Please try again, or return to the homepage.",
    action: { label: "Return Home", href: "/" },
  },
} as const;
