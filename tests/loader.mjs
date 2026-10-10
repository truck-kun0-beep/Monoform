// Loader hook for the test runner.
//
// Responsibilities:
//   1. Map the `@/*` project alias to the repo root, with extension
//      probing for extension-less specifiers.
//   2. Stub the `server-only` package so server-only modules can be
//      imported in tests without triggering the runtime guard.
//   3. Stub the Next.js runtime modules (`next/navigation`,
//      `next/headers`, `next/server`, `next/cache`) so server-only
//      helpers that depend on them can still be imported.
//   4. Strip query strings (e.g. `?fresh=…`) from import specifiers
//      before resolving the URL — Node's loader APIs do not accept
//      query strings in `pathToFileURL`.
//   5. Probe TypeScript / JavaScript extensions for relative
//      specifiers (so the project's `import { x } from "./server"`
//      resolves to `./server.ts`).
//   6. Mark TypeScript files with `format: "module-typescript"` so
//      Node's `--experimental-strip-types` flag handles them. Other
//      files fall through with no format override, so Node picks the
//      default based on file extension.
//
// The loader intentionally does not transpile TypeScript. Tests that
// need TypeScript source must be launched with Node's
// `--experimental-strip-types` flag, which is set by the `test`
// script in `package.json`.

import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import { statSync } from "node:fs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

function stripQuery(specifier) {
  const idx = specifier.indexOf("?");
  return idx === -1 ? specifier : specifier.slice(0, idx);
}

const EXT_PROBES = [
  ".ts",
  ".tsx",
  ".mjs",
  ".js",
  "/index.ts",
  "/index.tsx",
  "/index.mjs",
  "/index.js",
];

function probeForFile(absPath) {
  try {
    const stat = statSync(absPath);
    if (stat.isFile()) return absPath;
  } catch {
    // Fall through to probes.
  }
  for (const ext of EXT_PROBES) {
    const candidate = absPath + ext;
    try {
      const stat = statSync(candidate);
      if (stat.isFile()) return candidate;
    } catch {
      // continue
    }
  }
  return null;
}

const NEXT_STUBS = new Map([
  ["next/navigation", "next-navigation-stub.mjs"],
  ["next/headers", "next-headers-stub.mjs"],
  ["next/server", "next-server-stub.mjs"],
  ["next/cache", "next-cache-stub.mjs"],
]);

function tryResolveAlias(specifier) {
  const rest = specifier.slice(2);
  const absBase = path.join(root, rest);
  return probeForFile(absBase);
}

function tryResolveRelative(specifier, parentURL) {
  if (!parentURL) return null;
  const parentPath = fileURLToPath(parentURL);
  const parentDir = path.dirname(parentPath);
  const absBase = path.resolve(parentDir, specifier);
  return probeForFile(absBase);
}

export async function resolve(specifier, context, next) {
  const cleanSpecifier = stripQuery(specifier);

  if (cleanSpecifier === "server-only") {
    return {
      url: pathToFileURL(
        path.join(root, "tests", "fixtures", "server-only-stub.mjs"),
      ).href,
      shortCircuit: true,
      format: "module",
    };
  }

  const nextStub = NEXT_STUBS.get(cleanSpecifier);
  if (nextStub) {
    return {
      url: pathToFileURL(path.join(root, "tests", "fixtures", nextStub)).href,
      shortCircuit: true,
      format: "module",
    };
  }

  if (cleanSpecifier.startsWith("@/")) {
    const resolvedAbs = tryResolveAlias(cleanSpecifier);
    if (resolvedAbs) {
      const url = pathToFileURL(resolvedAbs).href;
      const isTypeScript =
        resolvedAbs.endsWith(".ts") || resolvedAbs.endsWith(".tsx");
      return {
        url,
        shortCircuit: true,
        format: isTypeScript ? "module-typescript" : "module",
      };
    }
    return {
      url: pathToFileURL(path.join(root, cleanSpecifier.slice(2))).href,
      shortCircuit: true,
    };
  }

  if (cleanSpecifier.startsWith(".")) {
    const resolvedAbs = tryResolveRelative(cleanSpecifier, context.parentURL);
    if (resolvedAbs) {
      const url = pathToFileURL(resolvedAbs).href;
      const isTypeScript =
        resolvedAbs.endsWith(".ts") || resolvedAbs.endsWith(".tsx");
      return {
        url,
        shortCircuit: true,
        format: isTypeScript ? "module-typescript" : "module",
      };
    }
  }

  return next(cleanSpecifier, context);
}
