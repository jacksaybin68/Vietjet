#!/usr/bin/env node
/**
 * Kiem tra class Tailwind khong ton tai (khong co rule trong CSS sinh ra).
 *
 * Tailwind bo qua class khong generate ra CSS, nen class khong ton tai
 * (typo, hoac bi "dinh" khi thay the hang loat) chi bi loa chay, khong bao
 * loi. Vi du "bg-whiterounded-vj" -> khong co rule -> khong ai thay.
 *
 * Cach lam:
 *   1. Sinh CSS bang Tailwind CLI (dung chinh config cua project).
 *   2. Thu thap selector `.ten-class` tu CSS, giai escape bang chinh
 *      `escapeClassName` cua Tailwind (khong tu viet regex).
 *   3. Chi xet token trong cac thuoc tinh className/class.
 *   4. Token khong co trong CSS -> bao loi.
 *
 * Vung "ranh gioi cung" (payments / thanh-toan / admin / quan-tri / editor)
 * khong bao loi — chi duoc bao cao. Nhung vung do khong duoc sua theo ke hoach
 * "sao chep giao dien", nen bao loi se lam CI do.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const escapeClassName = require('tailwindcss/lib/util/escapeClassName').default;

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

// Vung khong duoc sua theo ke hoach — chi bao cao.
const PROTECTED = [
  'src/features/payments/',
  'src/app/thanh-toan/',
  'src/features/admin/',
  'src/app/quan-tri/',
  'src/app/editor/',
];

function isProtected(rel) {
  return PROTECTED.some((p) => rel.startsWith(p));
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(e.name)) out.push(p);
  }
  return out;
}

// 1. Sinh CSS.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-check-'));
const cssFile = path.join(tmp, 'out.css');
const files = walk(SRC);
try {
  execFileSync(
    process.execPath,
    [require.resolve('tailwindcss/lib/cli.js'), '-i', 'src/styles/tailwind.css', '-o', cssFile],
    { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] }
  );
} catch (e) {
  console.error('Khong sinh duoc CSS:', (e.stderr || e.message).toString().slice(0, 800));
  process.exit(2);
}

const css = fs.readFileSync(cssFile, 'utf8');

// 2. Selector co class trong CSS. Escape cua Tailwind: `hover\:bg-red-700`,
//    `shadow-\[0_4px_16px_rgba\(0\,0\,0\,0\.12\)\]`.
const generated = new Set();
for (const m of css.matchAll(/\.((?:\\.|[A-Za-z0-9_\-/#%(),[\]])+)/g)) {
  const raw = m[1].replace(/\\(.)/g, '$1');
  generated.add(raw);
}

/**
 * Tach className thanh cac token hop le.
 * - Arbitrary value co khoang trang phai dung dau gach duoi theo quy uoc
 *   Tailwind (`font-[Be_Vietnam_Pro,sans-serif]`). Neu gap khoang trang
 *   trong `[]` thi do la class HONG HOP LE -> giu nguyen de bao loi.
 * - Token chua dau `\` hoac `{}` la bien runtime, khong phai class.
 */
function splitTokens(raw) {
  const out = [];
  let buf = '';
  let depth = 0;
  for (const ch of raw) {
    if (ch === '[') depth++;
    if (ch === ']') depth = Math.max(0, depth - 1);
    if (depth === 0 && /\s/.test(ch)) {
      if (buf) out.push(buf);
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf) out.push(buf);
  return out;
}

// 3. Token trong className/class.
//    - Bo qua template literal co bien noi (`${...}`) — noi dung runtime.
//    - SQL trong route handler cung co cum `class = '...'`; dong SQL duoc
//      nhan dien va bo qua.
const CLASS_ATTR = /\bclass(Name)?\s*=\s*(["'])([^"'\n]*)\2/g;
const SQL_HINT = /\b(SELECT|WHEN|CASE|AND|OR|WHERE|FROM|GREATEST|ROUND)\b/;
const used = new Map();
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  src.split('\n').forEach((line, i) => {
    let m;
    CLASS_ATTR.lastIndex = 0;
    while ((m = CLASS_ATTR.exec(line))) {
      const isClassName = !!m[1];
      const quote = m[2];
      const raw = m[3] || '';
      // SQL: `class = 'business'` — khoi dong chuoi SQL, khong phai JSX.
      if (!isClassName && quote === "'" && SQL_HINT.test(line)) continue;
      // Ghep chuoi template: bo qua cac segment chua bien noi.
      for (const seg of raw.split('${')) {
        const closing = seg.indexOf('}');
        const text = closing === -1 ? seg : seg.slice(0, closing);
        if (text.trim()) collectTokens(text, file, i + 1);
      }
    }
  });
}

function collectTokens(raw, file, line) {
  for (const tok of splitTokens(raw)) {
    // Token chua dau `\` hoac `{}` la bien runtime, khong phai class.
    if (/[${}]/.test(tok)) continue;
    // Class HTML co dau nhay don (escape HTML) — khong phai class Tailwind.
    if (/&#/.test(tok)) continue;
    const rel = path.relative(ROOT, file);
    if (!used.has(tok)) used.set(tok, new Set());
    used.get(tok).add(`${rel}:${line}`);
  }
}

// 3b. Class do file tu dinh nghia (selector trong src/styles/tailwind.css
//     va inline `<style>` trong component) — KHONG phai Tailwind utility
//     nen khong duoc bao loi.
const custom = new Set();
{
  const cssFileSrc = fs.readFileSync(path.join(SRC, 'styles', 'tailwind.css'), 'utf8');
  for (const m of cssFileSrc.matchAll(/\.((?:\\.|[A-Za-z0-9_-])+)/g)) {
    custom.add(m[1].replace(/\\(.)/g, '$1'));
  }
}
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    for (const c of m[1].matchAll(/\.((?:\\.|[A-Za-z0-9_-])+)/g)) {
      custom.add(c[1].replace(/\\(.)/g, '$1'));
    }
  }
}

// 4. So sanh. Tai mot token, dung `escapeClassName` cua Tailwind de tao
//    selector roi kiem tra selector do co xuat hien trong CSS khong.
const missing = [];
const reported = [];
for (const [tok, locs] of used) {
  if (custom.has(tok)) continue;
  if (generated.has(tok)) continue;

  // Selector dang `.<token>` (co the kem variant) — kiem tra trong CSS.
  const selector = '.' + escapeClassName(tok);
  if (css.includes(selector)) continue;

  reported.push({ tok, locs: [...locs].slice(0, 4) });
}

for (const r of reported) {
  const protectedHit = r.locs.some((l) => isProtected(l.slice(0, l.lastIndexOf(':'))));
  r.protected = protectedHit;
  if (!protectedHit) missing.push(r);
}

fs.rmSync(tmp, { recursive: true, force: true });

const protectedOnly = reported.filter((r) => r.protected);

if (missing.length === 0) {
  console.log(`OK: khong co class khong ton tai (${used.size} token da quet).`);
  if (protectedOnly.length) {
    console.log(
      `\nGhi chu: ${protectedOnly.length} class khong ton tai trong VUNG RANH GIOI CUNG (chi bao cao):`
    );
    for (const m of protectedOnly) {
      console.log(`  ${m.tok}`);
      for (const l of m.locs) console.log(`      ${l}`);
    }
  }
  process.exit(0);
}

console.log(`Phat hien ${missing.length} class KHONG ton tai:\n`);
for (const m of missing) {
  console.log(`  ${m.tok}`);
  for (const l of m.locs) console.log(`      ${l}`);
}
if (protectedOnly.length) {
  console.log(`\nNgoai ra ${protectedOnly.length} class trong VUNG RANH GIOI CUNG (chi bao cao):`);
  for (const m of protectedOnly) {
    console.log(`  ${m.tok}`);
    for (const l of m.locs) console.log(`      ${l}`);
  }
}
process.exit(1);
