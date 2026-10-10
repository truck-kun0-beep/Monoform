// Tests for the Supabase env-config guard. The application treats
// the documented `.env.example` placeholders as "not configured"
// so the auth UI can render an honest empty state during local
// development. Pinning this behaviour here prevents a refactor from
// silently starting to call a half-configured project.

import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

const SUPABASE_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
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
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const mod = await loadFresh();
  assert.equal(mod.getSupabaseEnv(), null);
  assert.equal(mod.isSupabaseConfigured(), false);
});

test("getSupabaseEnv returns null when the example placeholders are still present", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  const mod = await loadFresh();
  assert.equal(mod.getSupabaseEnv(), null);
});

test("getSupabaseEnv returns the parsed values when env vars look real", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJ-real-anon-key";
  const mod = await loadFresh();
  const env = mod.getSupabaseEnv();
  assert.deepEqual(env, { url: "https://test.supabase.co", anonKey: "eyJ-real-anon-key" });
  assert.equal(mod.isSupabaseConfigured(), true);
});
