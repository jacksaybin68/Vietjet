#!/usr/bin/env node
/**
 * Apply a migrations/*.sql file over the Neon HTTP protocol.
 *
 * Neon's serverless driver prepares one statement per request, so a file with
 * several statements (and PL/pgSQL bodies containing their own semicolons) has
 * to be split first. The splitter understands single-quoted strings and
 * dollar-quoted blocks ($tag$ ... $tag$), which is everything these files use,
 * and the statements then run inside one `sql.transaction` so a failure part
 * way through leaves the database as it was.
 *
 * Usage: node scripts/apply-migration.cjs migrations/028_foo.sql
 *        node scripts/apply-migration.cjs migrations/028_foo.sql --dry
 */
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  fs.readFileSync(envPath, 'utf-8')
    .split('\n')
    .forEach((line) => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0 && !key.startsWith('#')) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
}

/**
 * True for a chunk that is only comments and blank lines.
 *
 * A regex like `/^(--[^\n]*\n?\s*)+$/` reads naturally here and is what this
 * first used, but it backtracks catastrophically on a long comment header: a
 * statement's leading `--` block plus the code after it is millions of ways to
 * divide the same characters, and the splitter hung for minutes instead of
 * milliseconds. A line-by-line test is linear and does the same job.
 */
function isCommentOnly(chunk) {
  return chunk.split('\n').every((line) => {
    const trimmed = line.trim();
    return trimmed === '' || trimmed.startsWith('--');
  });
}

/** Split on top-level semicolons only. */
function splitStatements(text) {
  const statements = [];
  let buf = '';
  let i = 0;
  let dollarTag = null;
  let inSingle = false;
  let inComment = false;

  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];

    if (inComment) {
      buf += ch;
      if (ch === '\n') inComment = false;
      i += 1;
      continue;
    }

    if (dollarTag) {
      if (text.startsWith(dollarTag, i)) {
        buf += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
      } else {
        buf += ch;
        i += 1;
      }
      continue;
    }

    if (inSingle) {
      buf += ch;
      if (ch === "'" && next === "'") {
        buf += next;
        i += 2;
        continue;
      }
      if (ch === "'") inSingle = false;
      i += 1;
      continue;
    }

    if (ch === '-' && next === '-') {
      inComment = true;
      buf += ch;
      i += 1;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      buf += ch;
      i += 1;
      continue;
    }

    if (ch === '$') {
      const match = /^\$[A-Za-z_]*\$/.exec(text.slice(i));
      if (match) {
        dollarTag = match[0];
        buf += dollarTag;
        i += dollarTag.length;
        continue;
      }
    }

    if (ch === ';') {
      const statement = buf.trim();
      if (statement && !isCommentOnly(statement)) statements.push(statement);
      buf = '';
      i += 1;
      continue;
    }

    buf += ch;
    i += 1;
  }

  const tail = buf.trim();
  if (tail && !isCommentOnly(tail)) statements.push(tail);
  return statements;
}

async function main() {
  const file = process.argv[2];
  const dry = process.argv.includes('--dry');
  if (!file) {
    console.error('usage: node scripts/apply-migration.cjs <file.sql> [--dry]');
    process.exit(2);
  }

  const statements = splitStatements(fs.readFileSync(file, 'utf-8'));
  console.log(`${file}: ${statements.length} statements`);

  if (dry) {
    statements.forEach((s, n) => console.log(`--- ${n + 1} ---\n${s.slice(0, 200)}`));
    return;
  }

  loadEnv();
  const sql = neon(process.env.DATABASE_URL);
  await sql.transaction(statements.map((s) => sql.query(s)));
  console.log(`applied ${statements.length} statements from ${file}`);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error('FAILED:', error.message);
    process.exit(1);
  }
);
