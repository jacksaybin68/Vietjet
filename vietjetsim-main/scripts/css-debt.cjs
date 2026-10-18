#!/usr/bin/env node
/**
 * css-debt.cjs — đo và chặn nợ CSS mà Phase 1 phải giảm.
 *
 * Phase 1 của docs/plans/KE_HOACH_DOI_CHIEU_VIETJETAIR_2026-10-18.md yêu cầu một
 * "rule lint chặn hex/text-[Npx] phát sinh mới". Một rule ESLint thuần không làm
 * được việc đó ở repo này: đã có 648 `text-[Npx]` và 400 màu hex tuỳ ý nằm sẵn,
 * nên luật nào bật lên cũng đỏ từ dòng đầu tiên và sẽ sớm bị tắt bằng một dòng
 * `eslint-disable` ở cấp file. Đây là một **ratchet** thay vì một luật: nó chốt
 * con số hiện tại và chỉ đỏ khi con số đó tăng.
 *
 *   node scripts/css-debt.cjs            # so với baseline, đỏ nếu tăng
 *   node scripts/css-debt.cjs --report   # chỉ in số, không bao giờ đỏ
 *   node scripts/css-debt.cjs --update   # ghi lại baseline bằng số hiện tại
 *
 * Baseline nằm ở scripts/css-debt-baseline.json. Hạ nó xuống sau mỗi đợt dọn
 * thật; đừng nâng lên — nâng baseline là cách duy nhất một ratchet mất tác dụng.
 *
 * Hai mẫu được đo, và chúng cố tình chỉ tính file `.ts`/`.tsx` trong `src/`
 * (bỏ `src/test/`):
 *
 * - `text-[Npx]` là cỡ chữ tuỳ ý, thứ Phase 1 muốn thay bằng một thang `fontSize`.
 * - `[#rrggbb]` là giá trị màu tuỳ ý trong class Tailwind (`bg-[#b11116]`). Nó
 *   không theo token nên không theo dark mode, và đó là lý do `AGENTS.md` cấm
 *   hex mới cho các sắc thái đã có token.
 *
 * File `.css` không bị tính: `src/styles/tailwind.css` là nơi *định nghĩa* token,
 * nên hex ở đó là đúng chỗ, không phải nợ.
 */
const fs = require('node:fs');
const path = require('node:path');

const APP_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(APP_ROOT, 'src');
const BASELINE_PATH = path.join(__dirname, 'css-debt-baseline.json');

/** Thư mục bỏ qua khi quét. `test` chứa chuỗi class dùng để khẳng định, không phải UI. */
const SKIP_DIRS = new Set(['test']);
const EXTENSIONS = new Set(['.ts', '.tsx']);

const PATTERNS = [
  {
    key: 'fontSize',
    label: 'text-[Npx]  cỡ chữ tuỳ ý',
    regex: /text-\[[0-9.]+px\]/g,
    advice: 'dùng thang fontSize (text-xs/sm/base/lg/xl…) hoặc thêm bậc vào `extend.fontSize`',
  },
  {
    key: 'color',
    label: '[#rrggbb]  màu tuỳ ý trong class',
    regex: /\[#[0-9a-fA-F]{3,8}\]/g,
    advice: 'dùng token (var(--primary)/var(--foreground)…) hoặc thêm token mới vào :root',
  },
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), files);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function measure() {
  const files = walk(SRC_DIR);
  const counts = {};
  const perFile = {};
  for (const pattern of PATTERNS) {
    counts[pattern.key] = 0;
    perFile[pattern.key] = [];
  }

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of PATTERNS) {
      const found = text.match(pattern.regex);
      if (found && found.length > 0) {
        counts[pattern.key] += found.length;
        perFile[pattern.key].push({ file: path.relative(APP_ROOT, file), n: found.length });
      }
    }
  }

  for (const pattern of PATTERNS) {
    perFile[pattern.key].sort((a, b) => b.n - a.n);
  }

  return { fileCount: files.length, counts, perFile };
}

function print(report, { top = 5 } = {}) {
  console.log(`\nNợ CSS trong ${report.fileCount} file .ts/.tsx (bỏ src/test/):\n`);
  for (const pattern of PATTERNS) {
    console.log(`  ${pattern.label.padEnd(34)} ${report.counts[pattern.key]}`);
    for (const { file, n } of report.perFile[pattern.key].slice(0, top)) {
      console.log(`        ${String(n).padStart(4)}  ${file}`);
    }
  }
}

const args = new Set(process.argv.slice(2));
const report = measure();
print(report);

if (args.has('--update')) {
  const payload = {
    measuredAt: new Date().toISOString().slice(0, 10),
    note: 'Ratchet của scripts/css-debt.cjs — chỉ được hạ, không được nâng.',
    counts: report.counts,
  };
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`\nĐã ghi baseline: ${path.relative(APP_ROOT, BASELINE_PATH)}`);
  process.exit(0);
}

if (args.has('--report')) process.exit(0);

if (!fs.existsSync(BASELINE_PATH)) {
  console.error(`\n❌ Chưa có baseline. Chạy: node scripts/css-debt.cjs --update`);
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
const grown = [];

console.log(`\nSo với baseline (${baseline.measuredAt}):`);
for (const pattern of PATTERNS) {
  const before = baseline.counts[pattern.key];
  const now = report.counts[pattern.key];
  const delta = now - before;
  console.log(`  ${pattern.key.padEnd(10)} ${before} → ${now}  (${delta > 0 ? '+' : ''}${delta})`);
  if (delta > 0) grown.push({ pattern, delta });
}

if (grown.length > 0) {
  console.error('\n❌ Nợ CSS tăng so với baseline:\n');
  for (const { pattern, delta } of grown) {
    console.error(`  +${delta} ${pattern.label}`);
    console.error(`    → ${pattern.advice}`);
  }
  console.error('\nDùng token có sẵn thay vì thêm giá trị tuỳ ý mới. Nếu thật sự cần một');
  console.error('giá trị mới, thêm nó vào :root trong src/styles/tailwind.css rồi dùng token đó.');
  process.exit(1);
}

const totalDelta = PATTERNS.reduce(
  (sum, pattern) => sum + (baseline.counts[pattern.key] - report.counts[pattern.key]),
  0
);
console.log(
  totalDelta > 0
    ? `\n✅ Nợ CSS không tăng, và đã giảm ${totalDelta} so với baseline — hạ baseline bằng --update.`
    : '\n✅ Nợ CSS không tăng so với baseline.'
);
