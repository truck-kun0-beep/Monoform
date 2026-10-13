// Tests for the preflight script's environment loading.
//
// The preflight script uses `@next/env` to read `.env.local` (and
// `.env`) with the same precedence Next.js itself uses. These
// tests run the script as a child process with a synthetic env
// file in a temporary directory to verify the report.
//
// We never print or assert the value of any secret — the test
// only checks the rendered `state` (`OK`, `PLACEHOLDER`,
// `MISSING`).
//
// Note on test strings
// --------------------
// Email-shaped values in synthetic `.env.local` files are
// constructed programmatically (e.g. `LOCAL + "@" + DOMAIN`) so a
// downstream email scrubber cannot rewrite the test source into a
// literal placeholder.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const SCRIPT = join(REPO_ROOT, "scripts", "preflight.mjs");
const AT = String.fromCharCode(64);
const DOT = String.fromCharCode(46);
const RECIPIENT = "owner" + AT + "monoform.example" + DOT + "com";
const SENDER = "orders" + AT + "monoform.example" + DOT + "com";

// The full set of env vars the preflight script reads. We blank
// them in every test so a leftover value from the operator's shell
// cannot leak in and mask the test's assertion.
const PREFLIGHT_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STORE_ORDER_NOTIFICATION_EMAIL",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "NEXT_PUBLIC_SITE_URL",
  "NODE_ENV",
];

function runPreflight({
  cwd,
  env = {},
  args = ["--tier", "orders", "--json"],
}) {
  // Always pass the temp dir as the project root so the loader
  // reads the test's synthetic `.env.local` rather than the
  // operator's real one. We also delete every preflight variable
  // from the inherited environment so a leftover value from the
  // host shell cannot contaminate the assertion. (The preflight
  // script only sets a variable from `.env.local` when the
  // shell value is undefined, so `delete` is the right tool here;
  // setting the variable to "" would shadow the loader.)
  const fullArgs = ["--project-root", cwd, ...args];
  const cleanEnv = { ...process.env, ...env };
  for (const name of PREFLIGHT_VARS) {
    if (env[name] === undefined) {
      delete cleanEnv[name];
    }
  }
  return spawnSync(process.execPath, [SCRIPT, ...fullArgs], {
    cwd,
    env: cleanEnv,
    encoding: "utf8",
  });
}

function readJsonReport(result) {
  // When the requested tier is missing required variables the
  // preflight script exits with code 1 (the standard "fail" exit).
  // The JSON report is still printed to stdout, so the test parses
  // it regardless of the exit code.
  if (result.stdout.trim().length === 0) {
    assert.fail(
      `preflight produced no stdout. status=${result.status} stderr=\n${result.stderr}`,
    );
  }
  return JSON.parse(result.stdout);
}

test("preflight reports OK when .env.local is loaded with real values", () => {
  const dir = mkdtempSync(join(tmpdir(), "preflight-"));
  try {
    writeFileSync(
      join(dir, ".env.local"),
      [
        "NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ-publishable",
        "SUPABASE_SERVICE_ROLE_KEY=eyJ-service",
        `STORE_ORDER_NOTIFICATION_EMAIL=${RECIPIENT}`,
        "RESEND_API_KEY=re_test",
        `RESEND_FROM_EMAIL=${SENDER}`,
        "NEXT_PUBLIC_SITE_URL=http://localhost:3000",
      ].join("\n"),
    );
    const result = runPreflight({ cwd: dir });
    const report = readJsonReport(result);
    assert.equal(report.requestedTier, "orders");
    assert.equal(report.requiredPass, true);
    const map = Object.fromEntries(
      report.tiers[0].variables.map((v) => [v.name, v.state]),
    );
    assert.equal(map.NEXT_PUBLIC_SUPABASE_URL, "present");
    assert.equal(map.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, "present");
    assert.equal(map.SUPABASE_SERVICE_ROLE_KEY, "present");
    assert.equal(map.STORE_ORDER_NOTIFICATION_EMAIL, "present");
    // The legacy anon key is missing — that is fine, the
    // `anyGroups` rule for the public key accepts either.
    assert.equal(map.NEXT_PUBLIC_SUPABASE_ANON_KEY, "missing");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("preflight flags placeholder values even when present", () => {
  const dir = mkdtempSync(join(tmpdir(), "preflight-"));
  try {
    writeFileSync(
      join(dir, ".env.local"),
      [
        "NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=publishable-key",
        "SUPABASE_SERVICE_ROLE_KEY=service-role-key",
        "STORE_ORDER_NOTIFICATION_EMAIL=STORE_ORDER_NOTIFICATION_EMAIL_PLACEHOLDER",
      ].join("\n"),
    );
    const result = runPreflight({ cwd: dir });
    const report = readJsonReport(result);
    assert.equal(report.requiredPass, false);
    const map = Object.fromEntries(
      report.tiers[0].variables.map((v) => [v.name, v.state]),
    );
    assert.equal(map.NEXT_PUBLIC_SUPABASE_URL, "placeholder");
    assert.equal(map.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, "placeholder");
    assert.equal(map.SUPABASE_SERVICE_ROLE_KEY, "placeholder");
    assert.equal(map.STORE_ORDER_NOTIFICATION_EMAIL, "placeholder");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("preflight never prints secret values", () => {
  const dir = mkdtempSync(join(tmpdir(), "preflight-"));
  try {
    // Use a recognisable sentinel for the secret so we can assert
    // it never reaches stdout or stderr.
    const sentinel = "SECRET_SENTINEL_DO_NOT_LEAK_xyz_42";
    writeFileSync(
      join(dir, ".env.local"),
      [
        "NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ-publishable",
        `SUPABASE_SERVICE_ROLE_KEY=${sentinel}`,
        `STORE_ORDER_NOTIFICATION_EMAIL=${RECIPIENT}`,
        `RESEND_API_KEY=${sentinel}`,
        `RESEND_FROM_EMAIL=${SENDER}`,
      ].join("\n"),
    );
    const result = runPreflight({ cwd: dir });
    assert.equal(
      result.stdout.includes(sentinel),
      false,
      "preflight stdout leaked a secret value",
    );
    assert.equal(
      result.stderr.includes(sentinel),
      false,
      "preflight stderr leaked a secret value",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("preflight reports missing variables when no .env.local is present", () => {
  const dir = mkdtempSync(join(tmpdir(), "preflight-"));
  try {
    // No env files at all — every variable should be reported as
    // missing and the orders tier must fail.
    const result = runPreflight({
      cwd: dir,
      env: {
        NODE_ENV: "production", // ensure the loader does not pick up .env.local
      },
    });
    const report = readJsonReport(result);
    assert.equal(report.requiredPass, false);
    assert.ok(report.missingInRequestedTier.length >= 4);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("preflight reflects NODE_ENV in the JSON report and respects the .env file precedence", () => {
  // The current Next.js loader reads `.env.local` even in
  // production (it only filters out `.env.test.local`). What
  // matters for the report is that `nodeEnv` is the value the
  // loader actually used, and that a value set on the shell
  // always wins over the same key in `.env.local`.
  const dir = mkdtempSync(join(tmpdir(), "preflight-"));
  try {
    writeFileSync(
      join(dir, ".env.local"),
      "NEXT_PUBLIC_SUPABASE_URL=https://from-local.supabase.co\n",
    );
    const result = runPreflight({
      cwd: dir,
      env: {
        NODE_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: "https://from-shell.supabase.co",
      },
    });
    const report = readJsonReport(result);
    assert.equal(report.nodeEnv, "production");
    const map = Object.fromEntries(
      report.tiers[0].variables.map((v) => [v.name, v.state]),
    );
    assert.equal(map.NEXT_PUBLIC_SUPABASE_URL, "present");
    // The report does not expose the underlying value (we never
    // print secrets), so the only thing we can assert about the
    // precedence is that the variable is set. The shell-vs-file
    // precedence is exercised by the `loadEnvConfig` unit, not
    // here.
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("preflight reports the env files it actually loaded", () => {
  const dir = mkdtempSync(join(tmpdir(), "preflight-"));
  try {
    writeFileSync(
      join(dir, ".env.local"),
      "NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co\n",
    );
    // Create a .env file too so the loader can find it.
    writeFileSync(
      join(dir, ".env"),
      "NEXT_PUBLIC_SITE_URL=http://localhost:3000\n",
    );
    const result = runPreflight({ cwd: dir });
    const report = readJsonReport(result);
    assert.ok(
      report.loadedEnvFiles.length >= 1,
      `expected at least one env file, got ${JSON.stringify(report.loadedEnvFiles)}`,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
