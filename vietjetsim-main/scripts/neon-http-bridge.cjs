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
 * Decodes Neon's raw-text rows into JS values.
 *
 * `Neon-Raw-Text-Output: true` means every value arrives as a string, so the
 * driver parses them with each field's `dataTypeID`. The bridge has to decode
 * identically or the app sees `"100000.00"` where it expected `100000` — which
 * would quietly change every balance comparison.
 */
function decodeRows(fields, rows) {
  const parsers = fields.map((f) => types.getTypeParser(f.dataTypeID, 'text'));
  return rows.map((row) => row.map((value, i) => (value === null ? null : parsers[i](value))));
}

/** Normalises a driver error into the shape the Neon driver would have sent. */
function errorBody(error) {
  return {
    message: error.message,
    severity: 'ERROR',
    code: error.code || 'XX000',
    detail: error.detail,
    hint: error.hint,
    position: error.position,
  };
}

const server = http.createServer((req, res) => {
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

    // The batch form is an array of the same objects. `test:migrations` relies
    // on each statement being its own transaction, so a batch is run in one
    // explicit transaction here rather than silently losing that guarantee.
    const queries = Array.isArray(body) ? body : [body];
    const batch = Array.isArray(body);

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

      // Encode before writing anything: a parser throwing here would otherwise
      // reach the catch below and try to send a second set of headers.
      const payload = results.map((r) => ({
        command: r.command,
        fields: r.fields,
        rowCount: r.rowCount,
        rows: decodeRows(r.fields, r.rows),
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
