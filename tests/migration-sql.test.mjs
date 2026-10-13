// Static regression checks for the SQL migration files.
//
// We do not spin up a real Postgres instance for the unit-test
// suite. Instead these tests parse each migration file and assert
// the patterns that previously broke on the configured Supabase
// project:
//
//   - No citext reference (the extension is not enabled).
//   - Every gen_random_bytes(...) call is qualified with the
//     extensions. prefix (the function lives in the extensions
//     schema on Supabase).
//   - The newsletter table keeps its case-insensitive
//     deduplication via a lower(email) unique index.
//   - Row-level security is enabled on tables that hold private
//     customer data.
//
// The tests fail loudly if a future refactor re-introduces one of
// the patterns Supabase managed Postgres rejected.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const REPO_ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const MIGRATIONS_DIR = join(REPO_ROOT, "supabase", "migrations");

function readMigration(name) {
  return readFileSync(join(MIGRATIONS_DIR, name), "utf8");
}

/**
 * Strip SQL line comments (-- ...) from the file. We do not
 * support block comments because none of the migrations in this
 * repo use them. The result is plain SQL the server would
 * actually execute.
 */
function stripSqlComments(sql) {
  return sql
    .split(/\r?\n/)
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

test("0005 newsletter migration does not depend on the citext extension", () => {
  const sql = stripSqlComments(
    readMigration("0005_newsletter_subscriptions.sql"),
  );
  // Any whole-word reference to citext in the actual SQL is a
  // problem because the configured Supabase project does not
  // enable the extension. Comments are stripped first so the
  // header prose does not count.
  const matches = sql.match(/\bcitext\b/gi) ?? [];
  assert.equal(
    matches.length,
    0,
    "0005 must not reference citext in its SQL (matched: " +
      matches.join(", ") +
      "). Use the lower(email) unique index for case-insensitive uniqueness and text for the column type.",
  );
});

test("0005 newsletter migration qualifies every gen_random_bytes call with extensions.", () => {
  const sql = stripSqlComments(
    readMigration("0005_newsletter_subscriptions.sql"),
  );
  // We do a simple textual scan: every occurrence of
  // gen_random_bytes( must be preceded by extensions. somewhere
  // on the same line. This catches both bare calls and
  // explicitly-qualified ones.
  const lines = sql.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.includes("gen_random_bytes(")) continue;
    if (!/gen_random_bytes\s*\(/.test(line)) continue;
    assert.ok(
      /extensions\.gen_random_bytes\s*\(/.test(line),
      "0005 line " + (i + 1) + " uses unqualified gen_random_bytes: " + line.trim(),
    );
  }
});

test("0005 newsletter migration keeps the lower(email) unique index", () => {
  const sql = readMigration("0005_newsletter_subscriptions.sql");
  assert.ok(
    /\bcreate\s+unique\s+index\b[\s\S]*?on\s+public\.newsletter_subscriptions\s*\(\s*lower\s*\(\s*email\s*\)\s*\)/i.test(
      sql,
    ),
    "0005 must create a unique index on lower(email) to enforce case-insensitive deduplication",
  );
});

test("0005 newsletter migration enables row-level security", () => {
  const sql = readMigration("0005_newsletter_subscriptions.sql");
  assert.ok(
    /alter\s+table\s+public\.newsletter_subscriptions\s+enable\s+row\s+level\s+security/i.test(
      sql,
    ),
    "0005 must enable row-level security on newsletter_subscriptions",
  );
});

test("0005 newsletter migration creates the unsubscribe trigger", () => {
  const sql = readMigration("0005_newsletter_subscriptions.sql");
  assert.ok(
    /create\s+trigger\s+touch_newsletter_subscriptions\b/i.test(sql),
    "0005 must create the touch_newsletter_subscriptions trigger",
  );
});

test("0005 newsletter migration uses idempotent DDL for every change", () => {
  // All DDL in the file must be safe to re-apply against an
  // already-migrated database. We assert that there is no
  // unconditional CREATE TABLE / CREATE INDEX / CREATE TRIGGER
  // without the corresponding if not exists / or replace / drop
  // ... if exists ... create guard. (We strip comments first so
  // the prose header does not count as an unmatched
  // occurrence.)
  const sql = stripSqlComments(
    readMigration("0005_newsletter_subscriptions.sql"),
  ).toLowerCase();
  const bareCreateTable = /\bcreate\s+table\s+(?!if\s+not\s+exists)\b/g;
  const bareCreateIndex = /\bcreate\s+index\s+(?!if\s+not\s+exists)\b/g;
  const bareCreateFunction =
    /\bcreate\s+(?!or\s+replace\s+)(?:function|procedure)\b/g;
  // We allow create or replace function (which is idempotent).
  assert.deepEqual(
    sql.match(bareCreateTable),
    null,
    "0005 must use create table if not exists",
  );
  assert.deepEqual(
    sql.match(bareCreateIndex),
    null,
    "0005 must use create index if not exists",
  );
  assert.deepEqual(
    sql.match(bareCreateFunction),
    null,
    "0005 must use create or replace function (or drop+create)",
  );
  // Triggers: assert that the create trigger line is preceded
  // (in the comment-stripped source) by a drop trigger if exists
  // for the same trigger name.
  const triggerMatches = [...sql.matchAll(/\bcreate\s+trigger\s+([a-z_]+)/g)];
  for (const m of triggerMatches) {
    const triggerName = m[1];
    const dropRe = new RegExp(
      "drop\\s+trigger\\s+if\\s+exists\\s+" + triggerName + "\\b",
    );
    assert.ok(
      dropRe.test(sql),
      "0005 must drop trigger " + triggerName + " before recreating it",
    );
  }
});
