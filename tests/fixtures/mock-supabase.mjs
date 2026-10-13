// Minimal in-memory Supabase client used by the order-backend
// regression tests.
//
// The production client (`@supabase/supabase-js`) is fluent:
// `client.from("X").select(cols).eq("A", a).eq("B", b).maybeSingle()`
// returns a query that resolves to `{ data, error }`. This mock
// implements just the surface the order service uses:
//
//   * `.from(table)` returns a query builder
//   * `.select(cols)`, `.eq(col, val)`, `.order(col, opts)`,
//     `.limit(n)`, `.maybeSingle()`, `.single()` chain
//   * `.insert(rows)` (no chain after; resolves directly)
//   * `.update(patch)`, `.delete()` (chain-able with `.eq`)
//   * `.rpc(fnName)` resolves to `{ data, error }`
//
// The mock is a hand-rolled recorder. The caller registers a
// response per `(table, kind)` and the mock returns the recorded
// response. Multiple sequential calls are queued so a test can
// stage every step of `placeOrder` deterministically.

/**
 * @typedef {Object} RecordedCall
 * @property {string} table
 * @property {string} op
 * @property {Record<string, unknown>} [args]
 * @property {Record<string, unknown>} [payload]
 */

/**
 * @typedef {Object} MockResponse
 * @property {unknown} [data]
 * @property {{code?: string, message?: string} | null} [error]
 */

/**
 * Build a fresh mock Supabase client.
 *
 * @param {{
 *   user?: { id: string, email?: string | null } | null,
 *   allowlist?: { user_id: string }[],
 *   orderNumber?: string,
 *   rpcError?: { code: string, message: string } | null,
 *   onCall?: (call: RecordedCall) => void,
 * }} [options]
 */
export function createMockSupabaseClient(options = {}) {
  /** @type {RecordedCall[]} */
  const calls = [];
  /** @type {Array<{ table: string, op: string, response: MockResponse }>} */
  const queue = [];
  /** @type {Record<string, unknown>[]} */
  const orderRows = [];
  /** @type {Record<string, unknown>[]} */
  const itemRows = [];
  /** @type {Record<string, unknown>[]} */
  const historyRows = [];
  /** @type {Record<string, unknown>[]} */
  const notificationRows = [];

  let currentUser = options.user ?? { id: "user-1", email: "tester@example.com" };

  function pushResponse(table, op, response) {
    queue.push({ table, op, response });
  }

  function consume(table, op) {
    for (let i = 0; i < queue.length; i += 1) {
      if (queue[i].table === table && queue[i].op === op) {
        const next = queue[i];
        queue.splice(i, 1);
        return next.response;
      }
    }
    return { data: null, error: null };
  }

  function recordCall(call) {
    calls.push(call);
    if (options.onCall) options.onCall(call);
  }

  function makeBuilder(table, op) {
    const filters = [];
    let orderClause = null;
    let limitValue = null;
    let selectCols = null;
    let lastThenable = null;

    const builder = {
      select(cols) {
        selectCols = cols;
        return builder;
      },
      eq(col, val) {
        filters.push({ col, val });
        return builder;
      },
      gte(col, val) {
        filters.push({ col, val, op: "gte" });
        return builder;
      },
      lte(col, val) {
        filters.push({ col, val, op: "lte" });
        return builder;
      },
      gt(col, val) {
        filters.push({ col, val, op: "gt" });
        return builder;
      },
      lt(col, val) {
        filters.push({ col, val, op: "lt" });
        return builder;
      },
      neq(col, val) {
        filters.push({ col, val, op: "neq" });
        return builder;
      },
      in(col, vals) {
        filters.push({ col, vals, op: "in" });
        return builder;
      },
      is(col, val) {
        filters.push({ col, val, op: "is" });
        return builder;
      },
      order(col, opts = {}) {
        orderClause = { col, ascending: opts.ascending !== false };
        return builder;
      },
      limit(n) {
        limitValue = n;
        return builder;
      },
      range(from, to) {
        limitValue = { from, to };
        return builder;
      },
      maybeSingle() {
        return runMaybeSingle();
      },
      single() {
        return runSingle();
      },
      then(resolve, reject) {
        // Allow `await builder` to await the result.
        const p = runMaybeSingle();
        return p.then(resolve, reject);
      },
    };

    function matches(row) {
      for (const f of filters) {
        if (String(row[f.col]) !== String(f.val)) return false;
      }
      return true;
    }

    function runMaybeSingle() {
      recordCall({ table, op, args: { filters, order: orderClause, limit: limitValue, select: selectCols } });
      // For builders created via the insert chain
      // (`insert().select().maybeSingle()`) the op is "insert_return"
      // but the queued response was registered with op "insert".
      // Only the `insert_return` op should fall back to the
      // `insert` queue. A regular `select` that returns no match
      // should stay empty so the production code can detect
      // "no matching row".
      let response = consume(table, op);
      if (
        response.data === null &&
        response.error === null &&
        op === "insert_return"
      ) {
        const fallback = consume(table, "insert");
        if (fallback.data !== null || fallback.error !== null) {
          response = fallback;
        }
      }
      return Promise.resolve(response);
    }

    function runSingle() {
      recordCall({ table, op, args: { filters, order: orderClause, limit: limitValue, select: selectCols } });
      let response = consume(table, op);
      if (
        response.data === null &&
        response.error === null &&
        op === "insert_return"
      ) {
        const fallback = consume(table, "insert");
        if (fallback.data !== null || fallback.error !== null) {
          response = fallback;
        }
      }
      return Promise.resolve(response);
    }

    return builder;
  }

  function from(table) {
    return {
      select(cols) {
        const b = makeBuilder(table, "select");
        return b.select(cols);
      },
      insert(rows) {
        const list = Array.isArray(rows) ? rows : [rows];
        recordCall({ table, op: "insert", payload: list });
        // DO NOT consume the response here — the caller either
        // chains `.select(cols).single()` or awaits the result,
        // and we want the queued response to be returned at that
        // point. Tracking the inserted rows for "fake DB" state
        // happens before the consume.
        const queuedResponse = queue.find(
          (q) => q.table === table && q.op === "insert",
        );
        if (queuedResponse && !queuedResponse.response.error) {
          for (const row of list) {
            if (table === "orders") {
              orderRows.push({ ...row });
            } else if (table === "order_items") {
              itemRows.push({ ...row });
            } else if (table === "order_status_history") {
              historyRows.push({ ...row });
            } else if (table === "order_notifications") {
              notificationRows.push({ ...row });
            }
          }
        }
        const insertResult = {
          select(cols) {
            const builder = makeBuilder(table, "insert_return");
            return builder.select(cols);
          },
          single() {
            return Promise.resolve(consume(table, "insert"));
          },
          then(resolve, reject) {
            return Promise.resolve(consume(table, "insert")).then(resolve, reject);
          },
        };
        return insertResult;
      },
      update(patch) {
        recordCall({ table, op: "update", payload: patch });
        const response = consume(table, "update");
        return {
          eq(col, val) {
            recordCall({ table, op: "update_eq", args: { col, val } });
            return {
              then(resolve, reject) {
                return Promise.resolve(response).then(resolve, reject);
              },
            };
          },
          then(resolve, reject) {
            return Promise.resolve(response).then(resolve, reject);
          },
        };
      },
      delete() {
        recordCall({ table, op: "delete" });
        return {
          eq(col, val) {
            recordCall({ table, op: "delete_eq", args: { col, val } });
            const response = consume(table, "delete");
            return {
              then(resolve, reject) {
                return Promise.resolve(response).then(resolve, reject);
              },
            };
          },
        };
      },
    };
  }

  return {
    from,
    rpc(name) {
      recordCall({ table: "rpc", op: name });
      if (options.rpcError) return Promise.resolve({ data: null, error: options.rpcError });
      if (name === "next_order_number") {
        return Promise.resolve({ data: options.orderNumber ?? "MF-000099", error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
    auth: {
      getUser() {
        return Promise.resolve({ data: { user: currentUser }, error: null });
      },
    },
    // Test helpers — NOT part of the real Supabase client.
    __setCurrentUser(user) {
      currentUser = user;
    },
    __push(table, op, response) {
      pushResponse(table, op, response);
    },
    __getCalls() {
      return calls;
    },
    __getOrderRows() {
      return orderRows;
    },
    __getItemRows() {
      return itemRows;
    },
    __getHistoryRows() {
      return historyRows;
    },
    __getNotificationRows() {
      return notificationRows;
    },
  };
}
