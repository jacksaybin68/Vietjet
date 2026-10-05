/**
 * `scripts/db-target.cjs` decides which database every writing script in this
 * repo is about to touch, so its behaviour is pinned here rather than trusted.
 *
 * The regression these cover already happened: `DATABASE_URL=… node scripts/
 * seed-demo-accounts.cjs` wrote to `.env.local`'s database instead, because
 * the loader assigned `process.env[key] = value` unconditionally. Five scripts
 * did it; two demo passwords were reset on production as a result.
 *
 * Every case points the loader at a temp file. Rewriting the repo's real
 * `.env.local` to exercise it would risk destroying a production connection
 * string if the run died partway through.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

const require_ = createRequire(import.meta.url);

const REMOTE =
  'postgresql://user:pw@ep-cool-king-abc-123.us-east-2.aws.neon.tech/neondb?sslmode=require';

let dir: string;
let envPath: string;

/** Writes a throwaway `.env.local`, or removes it when `contents` is null. */
function writeEnvLocal(contents: string | null) {
  if (contents === null) rmSync(envPath, { force: true });
  else writeFileSync(envPath, contents);
}

/** `resolveDatabaseUrl` bound to the temp file, bypassing the real one. */
function resolver() {
  return (argv: string[] = []) => {
    const { resolveDatabaseUrl } = require_('../../scripts/db-target.cjs');
    return resolveDatabaseUrl(argv, envPath);
  };
}

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'db-target-'));
  envPath = path.join(dir, '.env.local');
  delete process.env.DATABASE_URL;
  delete process.env.SOME_OTHER_KEY;
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.DATABASE_URL;
  delete process.env.SOME_OTHER_KEY;
});

describe('db-target', () => {
  it('keeps a DATABASE_URL that was already in the environment', () => {
    // The bug: `.env.local` won, and the run silently hit the wrong database.
    writeEnvLocal(`DATABASE_URL=${REMOTE}\n`);
    process.env.DATABASE_URL = 'postgresql://app:pw@localhost:5432/app';

    expect(resolver()([])).toBe('postgresql://app:pw@localhost:5432/app');
  });

  it('still fills in keys the environment did not set', () => {
    writeEnvLocal(`DATABASE_URL=${REMOTE}\nSOME_OTHER_KEY=from-file\n`);

    // The remote opt-in also proves the file value was the one read.
    expect(resolver()(['--allow-remote', '--yes'])).toBe(REMOTE);
    expect(process.env.SOME_OTHER_KEY).toBe('from-file');
  });

  it('refuses a remote host unless both flags are passed', () => {
    writeEnvLocal(`DATABASE_URL=${REMOTE}\n`);
    const resolve = resolver();

    // No flags at all.
    expect(() => resolve([])).toThrow(/--allow-remote/);
    // Half the opt-in is not an opt-in.
    expect(() => resolve(['--allow-remote'])).toThrow(/--yes/);
    // Both: allowed.
    expect(resolve(['--allow-remote', '--yes'])).toBe(REMOTE);
  });

  it('treats localhost and the docker host as local, needing no flags', () => {
    writeEnvLocal(null);
    const resolve = resolver();

    for (const host of ['localhost', '127.0.0.1', '[::1]', 'db']) {
      process.env.DATABASE_URL = `postgresql://app:pw@${host}:5432/app`;
      expect(resolve([])).toBe(`postgresql://app:pw@${host}:5432/app`);
    }
  });

  it('reads the host with a real URL parser, not a regex', () => {
    // A naive /.*@([^/]+)\// mis-reads credentials containing '@', and a
    // mis-read host means the guard checks the wrong string — the one failure
    // mode where a broken guard still looks like it works.
    writeEnvLocal(null);
    const resolve = resolver();

    process.env.DATABASE_URL = 'postgresql://p%40ss:pw@ep-abc-xyz.us-east-2.aws.neon.tech/neondb';
    expect(() => resolve([])).toThrow(/aws\.neon\.tech/);

    // IPv6 loopback keeps its brackets in `hostname`, so the pattern has to
    // allow them; a regex anchored on the port gets this wrong.
    process.env.DATABASE_URL = 'postgresql://app:pw@[::1]:5432/app';
    expect(resolve([])).toBe('postgresql://app:pw@[::1]:5432/app');

    // RFC 3849 documentation range is not loopback, so it is refused — a
    // guard that waved every bracketed host through would be no guard at all.
    process.env.DATABASE_URL = 'postgresql://app:pw@[2001:db8::1]:5432/app';
    expect(() => resolve([])).toThrow(/remote/);
  });

  it('explains what to do when no DATABASE_URL resolves anywhere', () => {
    writeEnvLocal(null);

    expect(() => resolver()([])).toThrow(/DATABASE_URL is not set/);
    expect(() => resolver()([])).toThrow(/DATABASE_URL=postgresql/);
  });

  it('ignores comments and blank lines in .env.local', () => {
    // The old loader's `line.split('=')` turned "# DATABASE_URL=…" into a key
    // of "# DATABASE_URL" — harmless by luck, since nothing is named that.
    writeEnvLocal(
      `\n# DATABASE_URL=${REMOTE}\n\nDATABASE_URL=postgresql://app:pw@localhost:5432/app\n`
    );

    expect(resolver()([])).toBe('postgresql://app:pw@localhost:5432/app');
  });

  it('keeps a "=" inside a connection string intact', () => {
    // Passwords legitimately contain "=". Splitting on the first "=" (not on
    // every one) is what keeps `sslmode=require&channel_binding=require`
    // arriving whole.
    const withEquals = 'postgresql://u:p=w@localhost:5432/app?sslmode=require';
    writeEnvLocal(`DATABASE_URL=${withEquals}\n`);

    expect(resolver()([])).toBe(withEquals);
  });
});
