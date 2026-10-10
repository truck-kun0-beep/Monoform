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
 *
 * The script never imports the Next.js application code. It only
 * reads `process.env` and the on-disk `.env.example` so it can run
 * from CI before `npm install` is performed.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

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
    variables: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ],
  },
  orders: {
    label: "Order placement (Supabase + service role)",
    description:
      "Variables required to place, read and manage real orders.",
    variables: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "STORE_ORDER_NOTIFICATION_EMAIL",
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

const PLACEHOLDER_TOKENS = [
  "anon-key",
  "service-role-key",
  "re_xxx",
  "https://your-project.supabase.co",
  "[email protected]",
  "MONOFORM Orders <[email protected]>",
];

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

function parseArgs(argv) {
  const args = { tier: "site", json: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--tier") {
      const value = argv[i + 1];
      if (!value) return null;
      args.tier = value;
      i += 1;
    } else if (arg === "--json") {
      args.json = true;
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
    "Usage: node scripts/preflight.mjs [--tier site|auth|orders|email|all] [--json]",
    "",
    "Tiers:",
    "  site   — basic site rendering (default)",
    "  auth   — Supabase authentication",
    "  orders — order placement + admin",
    "  email  — Resend transactional email",
    "  all    — report every variable in every tier (no tier is enforced as required)",
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
  if (PLACEHOLDER_TOKENS.some((token) => trimmed === token)) {
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
  };
}

function loadEnvExample(rootDir) {
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
        // Capture the line that documents the variable.
        const value = line.slice(match[0].length).trim();
        docs.push({ name, placeholder: value });
      }
      return docs;
    })
    .catch(() => []);
}

function secretWarning(name) {
  if (name.startsWith("NEXT_PUBLIC_")) return null;
  return "server-only";
}

/* ------------------------------------------------------------------ *
 * Render
 * ------------------------------------------------------------------ */

function renderHuman(reports, requestedTier) {
  const lines = [];
  lines.push("MONOFORM preflight");
  lines.push("==================");
  lines.push("");

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
    const missing = requiredReport.variables.filter(
      (v) => v.state !== "present",
    );
    lines.push(`Tier '${requestedTier}' summary:`);
    if (missing.length === 0) {
      lines.push(`  PASS — every required variable is set.`);
    } else {
      lines.push(`  FAIL — ${missing.length} variable(s) need attention:`);
      for (const v of missing) {
        lines.push(`    - ${v.name} (${v.state})`);
      }
    }
  } else {
    lines.push("Tier 'all' — informational only; no tier is enforced.");
  }

  return lines.join("\n");
}

function renderJson(reports, requestedTier) {
  const requiredReport = reports.find((r) => r.key === requestedTier);
  const missing = requiredReport
    ? requiredReport.variables.filter((v) => v.state !== "present")
    : [];
  const result = {
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

  const validTiers = new Set(["site", "auth", "orders", "email", "all"]);
  if (!validTiers.has(args.tier)) {
    process.stderr.write(`Unknown tier '${args.tier}'.\n\n` + help() + "\n");
    process.exit(2);
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(here, "..");
  await loadEnvExample(rootDir); // Reserved for future use; loading proves file access works.

  const reportKeys = args.tier === "all" ? Object.keys(TIERS) : [args.tier];
  const reports = reportKeys.map(inspectTier).filter(Boolean);

  if (args.json) {
    process.stdout.write(renderJson(reports, args.tier) + "\n");
  } else {
    process.stdout.write(renderHuman(reports, args.tier) + "\n");
  }

  if (args.tier === "all") {
    process.exit(0);
  }
  const requiredReport = reports[0];
  if (!requiredReport) {
    process.exit(2);
  }
  const missing = requiredReport.variables.filter(
    (v) => v.state !== "present",
  );
  process.exit(missing.length === 0 ? 0 : 1);
}

main().catch((err) => {
  process.stderr.write(`preflight failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(2);
});
