// Tests for the Supabase env-config guard. The application treats
// the documented `.env.example` placeholders as "not configured"
// so the auth UI can render an honest empty state during local
// development. Pinning this behaviour here prevents a refactor from
// silently starting to call a half-configured project.

import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

const SUPABASE_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

const saved = {};
for (const key of SUPABASE_KEYS) {
  saved[key] = process.env[key];
}
saved.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

afterEach(() => {
  for (const key of SUPABASE_KEYS) {
    if (saved[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = saved[key];
    }
  }
  if (saved.SUPABASE_SERVICE_ROLE_KEY === undefined) {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  } else {
    process.env.SUPABASE_SERVICE_ROLE_KEY = saved.SUPABASE_SERVICE_ROLE_KEY;
  }
});

async function loadFresh() {
  // Re-import after each test by appending a unique query string.
  const stamp = Math.random().toString(36).slice(2);
  return import(`@/lib/auth/config.ts?fresh=${stamp}`);
}

test("getSupabaseEnv returns null when no env vars are set", async () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const mod = await loadFresh();
  assert.equal(mod.getSupabaseEnv(), null);
  assert.equal(mod.isSupabaseConfigured(), false);
});

test("getSupabaseEnv returns null when the example placeholders are still present", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-key";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  const mod = await loadFresh();
  assert.equal(mod.getSupabaseEnv(), null);
});

test("getSupabaseEnv returns the publishable key when the new canonical env var is set", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "eyJ-real-publishable";
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const mod = await loadFresh();
  const env = mod.getSupabaseEnv();
  assert.deepEqual(env, {
    url: "https://test.supabase.co",
    publishableKey: "eyJ-real-publishable",
    keySource: "publishable",
  });
  assert.equal(mod.isSupabaseConfigured(), true);
});

test("getSupabaseEnv falls back to the legacy anon key when only that is set", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJ-real-anon-key";
  const mod = await loadFresh();
  const env = mod.getSupabaseEnv();
  assert.deepEqual(env, {
    url: "https://test.supabase.co",
    publishableKey: "eyJ-real-anon-key",
    keySource: "anon",
  });
  assert.equal(mod.isSupabaseConfigured(), true);
});

test("getSupabaseEnv prefers the publishable key when both are set", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "eyJ-real-publishable";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJ-legacy-anon";
  const mod = await loadFresh();
  const env = mod.getSupabaseEnv();
  assert.equal(env.publishableKey, "eyJ-real-publishable");
  assert.equal(env.keySource, "publishable");
});

test("getSupabaseEnv refuses a service-role key passed through the public env", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  // sb_secret_… is the new service-role prefix; the publishable
  // key must never be substituted for it in the browser.
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_secret_should_not_be_used_here";
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const mod = await loadFresh();
  assert.equal(mod.getSupabaseEnv(), null);
  assert.equal(mod.isSupabaseConfigured(), false);
});
