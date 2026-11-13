/* Quét `public/` để dựng danh sách asset chưa được đăng ký trong
 * `docs/design/asset-registry.md`: mỗi file, có tham chiếu thật trong
 * `src/`/`scripts/` không, dung lượng, và có phải hotlink tới domain ngoài.
 *
 * Dùng: node scripts/audit-public-assets.cjs [--json]
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const REGISTRY = path.resolve(ROOT, '..', 'docs', 'design', 'asset-registry.md');

/** Thư mục quét tìm tham chiếu (bỏ `node_modules`, `.next*`, `.git`). */
const SCAN_DIRS = ['src', 'scripts', 'e2e'];

/** Domain ngoài — tham chiếu tới chúng là hotlink, không được phép. */
const EXTERNAL_HOSTS = ['vietjetair.com', 'vj-prod-website-cms', 'amazonaws.com', 's3.'];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Gom toàn bộ nội dung file văn bản trong `SCAN_DIRS` thành một chuỗi để
 *  tìm tham chiếu bằng `includes` — nhanh hơn nhiều so với đọc từng file. */
function buildCorpus() {
  const chunks = [];
  for (const dir of SCAN_DIRS) {
    for (const file of walk(path.join(ROOT, dir))) {
      if (!/\.(ts|tsx|js|cjs|mjs|json|css|md)$/.test(file)) continue;
      chunks.push(fs.readFileSync(file, 'utf8'));
    }
  }
  return chunks.join('\n');
}

function main() {
  const corpus = buildCorpus();
  const registry = fs.existsSync(REGISTRY) ? fs.readFileSync(REGISTRY, 'utf8') : '';

  const publicFiles = walk(PUBLIC_DIR).map((p) => path.relative(PUBLIC_DIR, p));

  const rows = publicFiles.map((rel) => {
    const base = path.basename(rel);
    const size = fs.statSync(path.join(PUBLIC_DIR, rel)).size;
    const referenced = corpus.includes(base) || corpus.includes(rel);
    const registered = registry.includes(base);
    return { rel, base, size, referenced, registered };
  });

  const unregistered = rows.filter((r) => !r.registered);
  const orphans = rows.filter((r) => !r.referenced);

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ total: rows.length, unregistered, orphans }, null, 2));
    return;
  }

  const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
  console.log(`Tổng file trong public/: ${rows.length}`);
  console.log(`Chưa đăng ký trong registry: ${unregistered.length}`);
  console.log(`Không có tham chiếu thật (orphan): ${orphans.length}\n`);

  console.log('| File | Đường dẫn | Tham chiếu | Kích thước |');
  console.log('| --- | --- | --- | --- |');
  for (const r of unregistered) {
    console.log(
      `| \`${r.base}\` | \`public/${r.rel}\` | ${r.referenced ? '✅ có' : '⚠️ orphan'} | ${kb(r.size)} |`
    );
  }
}

main();
