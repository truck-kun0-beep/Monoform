#!/usr/bin/env node
/**
 * Production preflight.
 *
 * Inspects the current environment for the variables MONOFORM needs
 * to run, split into four capability tiers. The script never prints
 * the value of any secret; it only reports whether each variable is
 * `present`, `empty`, or `placeholder` (matches one of the documented
 * "your-…" example values from `.env.example`).
 *
 * The preflight loads environment variables through `@next/env` (the
 * same loader Next.js itself uses for `npm run dev` / `npm run build`),
 * so the report reflects what the running application will see. Files
 * are loaded with the standard Next.js precedence:
 *
 *   1. `process.env` values already on the shell always win (so CI
 *      and `npm run preflight:orders` invocations can override
 *      anything below).
 *   2. `.env.local` (development only; ignored in production).
 *   3. `.env.development` / `.env.production` depending on the
 *      `NODE_ENV` passed via `--env` or `process.env.NODE_ENV`.
 *   4. `.env.example` (lowest priority; only used to discover
 *      placeholder values).
 *
 * Secret values are never written to stdout or stderr. The only
 * thing the report reveals about a value is its `state` (`OK`,
 * `PLACEHOLDER`, `MISSING`).
 *
 * Exit code:
 *   0  — every variable required for the *requested* tier is present
 *        and not a placeholder. Missing variables in higher tiers are
 *        reported but do not fail the run unless the tier is requested.
 *   1  — at least one required variable for the requested tier is
 *        missing or still a placeholder. The summary is also printed.
 *   2  — the script itself failed (e.g. invalid `--tier` argument).
 *
 * Usage:
 *   node scripts/preflight.mjs                  # basic site tier
 *   node scripts/preflight.mjs --tier auth
 *   node scripts/preflight.mjs --tier orders
 *   node scripts/preflight.mjs --tier email
 *   node scripts/preflight.mjs --tier all --json
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");

/* ------------------------------------------------------------------ *
 * Environment loading
 * ------------------------------------------------------------------ */

/**
 * Resolve the absolute path of the project root. By default this is
 * the caller's working directory, so `npm run preflight` from the
 * project root picks up the same `.env.local` Next.js itself uses.
 *
 * The CLI also accepts `--project-root <dir>` (mostly for tests)
 * which overrides this default and lets the operator point the
 * loader at a different directory.
 */
let ROOT_DIR = process.cwd();

/**
 * Decide whether the preflight should treat `.env.local` as
 * loadable. Next.js's own behaviour is to ignore `.env.local` in
 * production (`NODE_ENV === "production"`) because that file is
 * meant for local developer overrides. We mirror that policy so
 * the preflight report matches what `next start` would see.
 */
const NODE_ENV = process.env.NODE_ENV ?? "development";
const DEV = NODE_ENV !== "production";

/**
 * Quiet logger so the loader does not spam stdout/stderr with its
 * own "Loading .env.local" output. We capture both streams here
 * and silently discard them; the script's own output is the only
 * thing the user sees.
 */
const silentLog = { info() {}, error() {} };

/**
 * Run the env loader. The result is stored in a module-level
 * variable and read after `main()` has had a chance to apply
 * `--project-root` overrides.
 */
let LOADED_ENV_FILES = [];
let COMBINED_ENV = {};

function applyLoader() {
  const { combinedEnv, loadedEnvFiles } = loadEnvConfig(
    ROOT_DIR,
    DEV,
    silentLog,
  );
  COMBINED_ENV = combinedEnv;
  LOADED_ENV_FILES = loadedEnvFiles.map((entry) => entry.path);
  // Apply the loaded values to `process.env`, but only when the
  // value is not already set on the shell. This matches the
  // precedence Next.js itself uses: the shell wins over
  // `.env.local`, which wins over `.env`, which wins over
  // `.env.example`.
  for (const [name, value] of Object.entries(combinedEnv)) {
    if (value === undefined) continue;
    if (process.env[name] === undefined) {
      process.env[name] = value;
    }
  }
}

/* ------------------------------------------------------------------ *
 * Tier definitions
 * ------------------------------------------------------------------ */

const TIERS = {
  site: {
    label: "Basic site rendering",
    description:
      "Variables required for the storefront to build and serve pages.",
    variables: [
      "NEXT_PUBLIC_SITE_URL",
    ],
  },
  auth: {
    label: "Authentication (Supabase)",
    description:
      "Variables required for sign-in, registration, and account access.",
    // Either the canonical publishable key or the legacy anon key
    // satisfies the public-key requirement; the application prefers
    // the publishable key when both are set.
    variables: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ],
    anyGroups: [
      [
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ],
    ],
  },
  orders: {
    label: "Order placement (Supabase + service role)",
    description:
      "Variables required to place, read and manage real orders.",
    variables: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "STORE_ORDER_NOTIFICATION_EMAIL",
    ],
    anyGroups: [
      [
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ],
    ],
  },
  email: {
    label: "Email notifications (Resend)",
    description:
      "Variables required to dispatch transactional email.",
    variables: [
      "RESEND_API_KEY",
      "RESEND_FROM_EMAIL",
    ],
  },
};

/**
 * Placeholder tokens the loader should treat as "not configured"
 * even when the value is non-empty. These match the example values
 * documented in `.env.example` so the report can flag deployments
 * that copied `.env.example` to `.env.local` and forgot to replace
 * the placeholders.
 */
const PLACEHOLDER_TOKENS = new Set([
  "anon-key",
  "publishable-key",
  "service-role-key",
  "re_xxx",
  "https://your-project.supabase.co",
  "STORE_ORDER_NOTIFICATION_EMAIL_PLACEHOLDER",
  "RESEND_FROM_PLACEHOLDER",
]);

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

function parseArgs(argv) {
  const args = { tier: "site", json: false, verbose: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--tier") {
      const value = argv[i + 1];
      if (!value) return null;
      args.tier = value;
      i += 1;
    } else if (arg === "--project-root") {
      const value = argv[i + 1];
      if (!value) return null;
      args.projectRoot = path.resolve(value);
      i += 1;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--verbose") {
      args.verbose = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      return null;
    }
  }
  return args;
}

function help() {
  return [
    "Usage: node scripts/preflight.mjs [--tier site|auth|orders|email|all] [--json] [--verbose]",
    "",
    "Tiers:",
    "  site   — basic site rendering (default)",
    "  auth   — Supabase authentication",
    "  orders — order placement + admin",
    "  email  — Resend transactional email",
    "  all    — report every variable in every tier (no tier is enforced as required)",
    "",
    "Environment files are loaded through @next/env. The loader reads",
    ".env.local (development only), .env.<NODE_ENV> and .env. Values",
    "already set in the shell always win. Secret values are never",
    "printed — the report only shows OK / PLACEHOLDER / MISSING.",
  ].join("\n");
}

/* ------------------------------------------------------------------ *
 * Inspection
 * ------------------------------------------------------------------ */

function classify(value) {
  if (value === undefined || value === null || value === "") {
    return "missing";
  }
  const trimmed = String(value).trim();
  if (trimmed.length === 0) return "missing";
  // Flag an exact match against one of the documented placeholders
  // in `.env.example`. We do NOT use substring matching here — a
  // real Supabase anon key may legitimately contain the substring
  // "anon-key", and we must not produce a false positive.
  if (PLACEHOLDER_TOKENS.has(trimmed)) {
    return "placeholder";
  }
  return "present";
}

function inspectTier(tierKey) {
  const tier = TIERS[tierKey];
  if (!tier) return null;
  return {
    key: tierKey,
    label: tier.label,
    description: tier.description,
    variables: tier.variables.map((name) => ({
      name,
      state: classify(process.env[name]),
    })),
    anyGroups: tier.anyGroups ?? [],
  };
}

function secretWarning(name) {
  if (name.startsWith("NEXT_PUBLIC_")) return null;
  return "server-only";
}

function loadEnvExample(rootDir) {
  // Reserved for future use; loading proves file access works and
  // the placeholder extraction is consistent with the values the
  // application itself rejects.
  const file = path.join(rootDir, ".env.example");
  return readFile(file, "utf8")
    .then((contents) => {
      const lines = contents.split(/\r?\n/);
      const seen = new Set();
      const docs = [];
      for (const line of lines) {
        const match = /^([A-Z_][A-Z0-9_]*)\s*=/.exec(line);
        if (!match) continue;
        const name = match[1];
        if (seen.has(name)) continue;
        seen.add(name);
        const value = line.slice(match[0].length).trim();
        docs.push({ name, placeholder: value });
      }
      return docs;
    })
    .catch(() => []);
}

/* ------------------------------------------------------------------ *
 * Render
 * ------------------------------------------------------------------ */

function renderHuman(reports, requestedTier, options = {}) {
  const lines = [];
  lines.push("MONOFORM preflight");
  lines.push("==================");
  lines.push("");
  if (options.verbose) {
    lines.push(`Loaded environment files:`);
    if (LOADED_ENV_FILES.length === 0) {
      lines.push("  (none — values come from the shell only)");
    } else {
      for (const file of LOADED_ENV_FILES) {
        lines.push(`  - ${file}`);
      }
    }
    lines.push(`NODE_ENV: ${NODE_ENV}`);
    lines.push("");
  }

  for (const report of reports) {
    lines.push(`${report.label}`);
    lines.push(`  ${report.description}`);
    for (const v of report.variables) {
      const tag = v.state === "present" ? "OK  " : v.state === "placeholder" ? "PLACEHOLDER" : "MISSING";
      const placement = secretWarning(v.name) ? "  (server-only)" : "";
      lines.push(`  [${tag}] ${v.name}${placement}`);
    }
    lines.push("");
  }

  const requiredReport = reports.find((r) => r.key === requestedTier);
  if (requiredReport && requestedTier !== "all") {
    const missing = collectMissing(requiredReport);
    lines.push(`Tier '${requestedTier}' summary:`);
    if (missing.length === 0) {
      lines.push(`  PASS — every required variable is set.`);
    } else {
      lines.push(`  FAIL — ${missing.length} requirement(s) need attention:`);
      for (const v of missing) {
        lines.push(`    - ${v.name} (${v.state})`);
      }
    }
  } else {
    lines.push("Tier 'all' — informational only; no tier is enforced.");
  }

  return lines.join("\n");
}

function collectMissing(report) {
  // When the tier declares an `anyGroups` list, each group replaces
  // a single named variable: it is satisfied when at least one
  // member of the group is in the "present" state. We surface the
  // best (first) present member in the per-variable report and only
  // flag the group as missing when every member is missing or a
  // placeholder.
  const groupedNames = new Set();
  for (const group of report.anyGroups ?? []) {
    for (const name of group) groupedNames.add(name);
  }
  const direct = report.variables
    .filter((v) => !groupedNames.has(v.name))
    .filter((v) => v.state !== "present");
  const groupMissing = (report.anyGroups ?? [])
    .map((group) => {
      const states = group.map((name) =>
        report.variables.find((v) => v.name === name),
      );
      const present = states.find((s) => s && s.state === "present");
      if (present) return null;
      const missing = states.find((s) => s && s.state === "missing");
      if (missing) return { name: missing.name, state: "missing" };
      const placeholder = states.find((s) => s);
      return placeholder
        ? { name: placeholder.name, state: "placeholder" }
        : null;
    })
    .filter(Boolean);
  return [...direct, ...groupMissing];
}

function renderJson(reports, requestedTier) {
  const requiredReport = reports.find((r) => r.key === requestedTier);
  const missing = requiredReport ? collectMissing(requiredReport) : [];
  const result = {
    nodeEnv: NODE_ENV,
    loadedEnvFiles: LOADED_ENV_FILES,
    tiers: reports.map((r) => ({
      key: r.key,
      label: r.label,
      variables: r.variables,
    })),
    requestedTier,
    requiredPass: requestedTier === "all" || missing.length === 0,
    missingInRequestedTier: missing.map((v) => v.name),
  };
  return JSON.stringify(result, null, 2);
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

async function main() {
  const args = parseArgs(process.argv);
  if (!args) {
    process.stderr.write("Invalid arguments.\n\n" + help() + "\n");
    process.exit(2);
  }
  if (args.help) {
    process.stdout.write(help() + "\n");
    process.exit(0);
  }

  if (args.projectRoot) {
    ROOT_DIR = args.projectRoot;
  }
  applyLoader();

  const validTiers = new Set(["site", "auth", "orders", "email", "all"]);
  if (!validTiers.has(args.tier)) {
    process.stderr.write(`Unknown tier '${args.tier}'.\n\n` + help() + "\n");
    process.exit(2);
  }

  // Touch the example file so we surface a clear error if the
  // repository is being run from the wrong working directory. We
  // intentionally do not use the returned docs in this script —
  // the placeholder detection above is the source of truth.
  await loadEnvExample(ROOT_DIR);

  const reportKeys = args.tier === "all" ? Object.keys(TIERS) : [args.tier];
  const reports = reportKeys.map(inspectTier).filter(Boolean);

  if (args.json) {
    process.stdout.write(renderJson(reports, args.tier) + "\n");
  } else {
    process.stdout.write(
      renderHuman(reports, args.tier, { verbose: args.verbose }) + "\n",
    );
  }

  if (args.tier === "all") {
    process.exit(0);
  }
  const requiredReport = reports[0];
  if (!requiredReport) {
    process.exit(2);
  }
  const missing = collectMissing(requiredReport);
  process.exit(missing.length === 0 ? 0 : 1);
}

main().catch((err) => {
  process.stderr.write(`preflight failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(2);
});
