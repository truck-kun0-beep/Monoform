// Test stub for `next/navigation`.
//
// The real module re-exports `redirect`, `notFound`, `usePathname` and
// other runtime helpers. In a unit test we only need a stable shape —
// the helpers throw to make accidental usage in a test fail loudly
// rather than silently no-op.

export function redirect(target) {
  throw new Error(`redirect(${JSON.stringify(target)}) called in test`);
}

export function notFound() {
  throw new Error("notFound() called in test");
}

export function usePathname() {
  return "/";
}

export function useSearchParams() {
  return new URLSearchParams();
}

export function useRouter() {
  return {
    push() {},
    replace() {},
    refresh() {},
    back() {},
    forward() {},
    prefetch() {},
  };
}
