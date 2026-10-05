#!/usr/bin/env node
/**
 * Speaks the Neon HTTP SQL protocol to a plain TCP Postgres, so the app can
 * run against a local database.
 *
 * Why this exists: `src/lib/neon.ts` uses `@neondatabase/serverless`, whose
 * driver only speaks HTTP — it POSTs `{query, params}` to
 * `https://<host>/sql`. A `docker run postgres` has no HTTP endpoint, so
 * `npm run test:smoke` could not reach a single real statement: it asserted
 * guard behaviour (401/redirects) and nothing more. `wsproxy` does not help —
 * it forwards to a Neon endpoint and insists the Host match `*.neon.tech`.
 *
 * The protocol is pinned to the driver's own code, not guessed:
 * `node_modules/@neondatabase/serverless/index.js` line ~1290 POSTs the
 * prepared body with headers `Neon-Connection-String`,
 * `Neon-Raw-Text-Output: true` and `Neon-Array-Mode: true`, and reads back
 * `{fields: [{name, dataTypeID}], rows: [[...]]}`.
 *
 * Run: node scripts/neon-http-bridge.cjs            (port 4444, env PG_URL)
 *      PORT=5555 node scripts/neon-http-bridge.cjs
 *
 * Then point the app at it with `NEON_FETCH_ENDPOINT`, which `src/lib/neon.ts`
 * already honours:
 *
 *   DATABASE_URL=postgresql://app:pw@localhost:5432/app \
 *   NEON_FETCH_ENDPOINT=http://localhost:4444/sql npm run dev
 *
 * This is a development tool, not part of the runtime or of CI.
 */

const http = require('http');
const { Pool, types } = require('pg');

const PORT = Number(process.env.PORT || 4444);
const PG_URL = process.env.PG_URL || 'postgresql://app:pw@localhost:5432/app';

const pool = new Pool({ connectionString: PG_URL, max: 8 });

/**
 * Make `pg` hand back the raw text the server sent, for the types it otherwise
 * parses before the bridge ever sees them.
 *
 * `Neon-Raw-Text-Output: true` means the Neon driver parses every value on
 * arrival with `pg-types`, keyed on `dataTypeID`. So the bridge's job is to put
 * on the wire exactly the text a real Neon endpoint returns — and `pg` breaks
 * that in two ways, each of which fails silently:
 *
 * - Date/time (1082 `date`, 1114 `timestamp`, 1184 `timestamptz`). `pg` ignores
 *   the text format and always parses these to `Date`. Re-serialising by hand
 *   with `toISOString()` looks right and is not — Postgres prints
 *   `2026-10-06 23:00:00+00`, and the driver's 1184 parser returns **null** for
 *   the ISO form. Every timestamp became null, which is what made `/tim-ve`
 *   report "no flights found" while the rows were in the database.
 * - JSON (114 `json`, 3802 `jsonb`). `pg` parses these to objects, so the bridge
 *   serialised `{"a":1}` as a JSON *object*; the driver then ran `JSON.parse`
 *   over it again and failed on anything holding a comma or a colon.
 *   `getBookingById`'s `json_agg` columns went through this, and the payment
 *   route 500'd with `"[object Object]" is not valid JSON`.
 *
 * Identity parsers fix both: `pg-types`' own stringifiers then emit Postgres'
 * exact spelling, including the session timezone that `toISOString()` would
 * have shifted to UTC. The bridge owns this `Pool` and closes it at exit, so
 * nothing else consumes these module-level parsers.
 */
for (const oid of [1082, 1114, 1184, 114, 3802]) types.setTypeParser(oid, 'text', (v) => v);

/**
 * Normalises a driver error into the shape the Neon driver would have sent.
 *
 * Every field the driver copies onto its own error object has to be here, and
 * two of them decide application behaviour rather than just the text:
 * `constraint` and `routine`. `isDuplicateFlightSchedule` in
 * `app/api/quan-tri/chuyen-bay/route.ts` matches the unique index name to
 * answer a duplicate schedule with a 409 instead of a bare 500, and through
 * this bridge `constraint` arrived undefined — so every duplicate fell
 * through to the generic handler, and the admin console showed an opaque
 * failure for a plain user mistake. Read off `pg-types`' own list rather than
 * picking fields by hand.
 */
function errorBody(error) {
  return {
    message: error.message,
    severity: error.severity || 'ERROR',
    code: error.code || 'XX000',
    detail: error.detail,
    hint: error.hint,
    position: error.position,
    internalPosition: error.internalPosition,
    internalQuery: error.internalQuery,
    where: error.where,
    schema: error.schema,
    table: error.table,
    column: error.column,
    dataType: error.dataType,
    constraint: error.constraint,
    file: error.file,
    line: error.line,
    routine: error.routine,
  };
}

// Exported for one test: `errorBody` is a pure function over a `pg` error, so
// the field list it forwards can be checked without a database. A `require`
// from a test must not open a listener or a connection pool, hence the guard
// below rather than a listener at module scope.
module.exports = { errorBody };

/**
 * The bridge's whole protocol surface: one POST in, the Neon HTTP SQL reply
 * out, and a Postgres failure forwarded as a 400 body the driver can rebuild
 * into a `NeonDbError`.
 */
function createServer() {
  return http.createServer((req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'POST only' }));
      return;
    }

    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async () => {
      let body;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Body is not JSON' }));
        return;
      }

      // A batch arrives as `{queries: [...]}` and is answered as
      // `{results: [...]}` — that is the shape the driver sends and reads, read
      // straight out of `node_modules/@neondatabase/serverless/index.js`.
      // `sql.transaction()` uses it, so every multi-statement commit in the app
      // depends on getting this right; it used to send an unwrapped `{query}` and
      // the payment route failed with "A query must have either text or a name".
      //
      // The batch runs in one explicit transaction here: `test:migrations` relies
      // on each statement being its own transaction, and silently running a
      // batch outside one would drop that guarantee rather than enforce it.
      const batch = Array.isArray(body?.queries);
      const queries = batch ? body.queries : [body];

      try {
        const runOne = async (client, q) => {
          // `rowMode: 'array'` is what makes `rows` positional. The Neon driver
          // keys rows by field name only after decoding, and it hands the app
          // named objects — so arrays on the wire are the contract, not objects.
          // `text` keeps the round trip to one encoding: Neon sends raw text, so
          // a binary result would need a second parser here.
          const result = await client.query({
            text: q.query,
            values: q.params ?? [],
            rowMode: 'array',
          });
          return {
            command: result.command,
            rowCount: result.rowCount,
            fields: result.fields,
            rows: result.rows,
          };
        };

        let results;
        if (batch) {
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            results = [];
            for (const q of queries) results.push(await runOne(client, q));
            await client.query('COMMIT');
          } catch (error) {
            await client.query('ROLLBACK').catch(() => {});
            throw error;
          } finally {
            client.release();
          }
        } else {
          results = [await runOne(pool, queries[0])];
        }

        const payload = results.map((r) => ({
          command: r.command,
          fields: r.fields,
          rowCount: r.rowCount,
          rows: r.rows,
          rowAsArray: true,
        }));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(batch ? { results: payload } : payload[0]));
      } catch (error) {
        // Postgres error codes are 5-digit strings (e.g. 23505). The Neon driver
        // reads `message` and the rest off a 400 body, so the status has to
        // match or every CHECK violation surfaces as an opaque server error.
        const code = String(error.code || '');
        const status = /^\d{5}$/.test(code) ? 400 : 500;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(errorBody(error)));
      }
    });
  });
}

if (require.main === module) {
  const server = createServer();

  server.listen(PORT, () => {
    console.log(`neon-http-bridge listening on http://localhost:${PORT}/sql`);
    console.log(`  -> Postgres: ${PG_URL.replace(/\/\/[^@]*@/, '//***@')}`);
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      server.close();
      pool.end().then(() => process.exit(0));
    });
  }
}
