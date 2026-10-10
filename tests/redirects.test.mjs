// Tests for the safe-redirect validator that protects the login flow
// from open-redirect attacks. The login form passes a `redirect=…`
// query string; this validator must reject every value that could
// send a customer to a different origin.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isSafeInternalPath,
  isAccountPath,
  buildLoginUrl,
  resolveRedirectTarget,
} from "@/lib/auth/redirects.ts";

test("isSafeInternalPath accepts a normal internal path", () => {
  assert.equal(isSafeInternalPath("/account"), true);
  assert.equal(isSafeInternalPath("/account/orders"), true);
  assert.equal(isSafeInternalPath("/checkout"), true);
  assert.equal(isSafeInternalPath("/"), true);
});

test("isSafeInternalPath rejects external destinations", () => {
  assert.equal(isSafeInternalPath("https://evil.example.com"), false);
  assert.equal(isSafeInternalPath("http://localhost:3000/account"), false);
  assert.equal(isSafeInternalPath("//evil.example.com"), false);
  assert.equal(isSafeInternalPath("/\\evil.example.com"), false);
  assert.equal(isSafeInternalPath("javascript:alert(1)"), false);
  assert.equal(isSafeInternalPath("data:text/html,<script>"), false);
  assert.equal(isSafeInternalPath("mailto:[email protected]"), false);
});

test("isSafeInternalPath rejects malformed or oversized values", () => {
  assert.equal(isSafeInternalPath(""), false);
  assert.equal(isSafeInternalPath(null), false);
  assert.equal(isSafeInternalPath(undefined), false);
  assert.equal(isSafeInternalPath(42), false);
  assert.equal(isSafeInternalPath("/a\nb"), false);
  assert.equal(isSafeInternalPath("/a\rb"), false);
  assert.equal(isSafeInternalPath("/" + "x".repeat(600)), false);
});

test("isAccountPath identifies customer-only routes", () => {
  assert.equal(isAccountPath("/account"), true);
  assert.equal(isAccountPath("/account/orders"), true);
  assert.equal(isAccountPath("/checkout"), true);
  assert.equal(isAccountPath("/"), true);
  assert.equal(isAccountPath("/women"), false);
});

test("buildLoginUrl uses a safe fallback when redirect is unsafe", () => {
  assert.equal(
    buildLoginUrl("/account/orders"),
    "/login?redirect=%2Faccount%2Forders",
  );
  assert.equal(
    buildLoginUrl("https://evil.example.com"),
    "/login?redirect=%2Faccount",
  );
  assert.equal(buildLoginUrl(null), "/login?redirect=%2Faccount");
});

test("resolveRedirectTarget falls back to /account when the value is unsafe", () => {
  assert.equal(resolveRedirectTarget("/account"), "/account");
  assert.equal(resolveRedirectTarget("https://evil.example.com"), "/account");
  assert.equal(resolveRedirectTarget(undefined), "/account");
  assert.equal(resolveRedirectTarget(["/account", "https://evil"]), "/account");
});
