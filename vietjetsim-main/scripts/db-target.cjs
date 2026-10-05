#!/usr/bin/env node
/**
 * The one place a script decides which database it is about to write to.
 *
 * Every script here used to load `.env.local` with a hand-rolled loop that did
 * `process.env[key] = value` unconditionally. That silently overwrote a
 * `DATABASE_URL` passed on the command line, so `DATABASE_URL=postgresql://…
 * node scripts/seed-demo-accounts.cjs` wrote to `.env.local`'s database instead
 * — and printed a cheerful "Target database: ep-cool-king…" line while doing
 * it. Worth stating plainly: that has already reset the demo accounts'
 * passwords on the production Neon database.
 *
 * The rule here is the boring one. An environment variable that is already set
 * wins; `.env.local` only fills in what is missing. Overriding stays possible,
 * the usual way:
 *
 *   DATABASE_URL=postgresql://… node scripts/seed-demo-accounts.cjs
 *
 * Hosts that are neither localhost nor Docker get an `--allow-remote` opt-in,
 * because this repo's only real database is remote and refusing outright would
 * make the scripts unusable for their actual job.
 */

const fs = require('fs');
const path = require('path');

/**
 * Hosts that are unambiguously a developer's own machine. `db` covers the
 * `docker run … postgres` names used by `test:migrations`.
 */
const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1|\[::1\]|db)(:\d+)?$/i;

const DEFAULT_ENV_PATH = path.join(__dirname, '..', '.env.local');

/**
 * Loads `.env.local` into `process.env` **without overwriting** anything already
 * there, then returns the `DATABASE_URL` in force.
 *
 * Values are left exactly as written — no unquoting, no `export` handling — to
 * match what these scripts already did. A connection string is not a shell
 * word, and half-decoding one changes it silently.
 *
 * @param {string[]} [argv] Defaults to `process.argv.slice(2)`; passed in by
 *   tests so they need not mutate the real argv.
 * @param {string} [envPath] Defaults to this repo's `.env.local`. Tests point
 *   it at a temp file: rewriting the real one to exercise the loader risks
 *   destroying a production connection string if the run dies mid-test.
 * @returns {string} The `DATABASE_URL` to use.
 * @throws if no `DATABASE_URL` resolves, if the target is remote without
 *   `--allow-remote`, or if it is remote and `--yes` was not passed.
 */
function resolveDatabaseUrl(argv = process.argv.slice(2), envPath = DEFAULT_ENV_PATH) {
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      if (!key || key in process.env) continue;
      process.env[key] = line.slice(eq + 1).trim();
    }
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      `DATABASE_URL is not set. Put one in ${envPath}, or pass it as an\n` +
        'environment variable: DATABASE_URL=postgresql://… node scripts/<script>.cjs'
    );
  }

  // `new URL` is the parser, not a regex: the authority may carry credentials,
  // a port, or an IPv6 literal, and a hand-rolled one silently mis-reads those.
  const host = new URL(url).hostname;
  if (!LOCAL_HOST_PATTERN.test(host)) {
    if (!argv.includes('--allow-remote')) {
      throw new Error(
        `Refusing to write to a remote database: ${host}\n` +
          'This script writes. Re-run with --allow-remote once you have checked\n' +
          'that host is the one you meant.'
      );
    }
    if (!argv.includes('--yes')) {
      throw new Error(`About to write to ${host}. Re-run with --yes to confirm.`);
    }
  }

  return url;
}

module.exports = { resolveDatabaseUrl, LOCAL_HOST_PATTERN };
