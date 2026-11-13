#!/usr/bin/env node
/**
 * Cổng diff ảnh giao diện — Phase 6, mục 2 ("chọn công cụ diff ảnh").
 * Run: npm run test:visual           (so với baseline đã duyệt)
 *      npm run test:visual -- --update   (cập nhật baseline)
 *
 * Vì sao gate này so với BASELINE CỦA CHÍNH DỰ ÁN, không so với ảnh chụp
 * vietjetair.com:
 *   - Site thật là React SPA; bố cục nó đổi theo A/B test, theo chiến dịch và
 *     theo giờ, nên ảnh chụp hôm nay không phải chuẩn để so ngày mai. Một
 *     baseline từ site thật sẽ đỏ mỗi tuần mà không ai sửa gì.
 *   - Mục tiêu thật của Phase 6 là "bắt được hồi quy" — một thay đổi CSS lạ
 *     làm trang dịch chuyển 3px thì phải bị chặn. Baseline của chính dự án
 *     làm đúng điều đó, và tái lập được trong CI.
 *   - Phép đối chiếu với site thật vẫn còn, ở dạng SỐ ĐO (đã có sẵn):
 *     `scripts/compare-parity.cjs` và `scripts/measure-official*.cjs`. Cái đó
 *     đo layout, không so pixel — và pixel-match với site thật sẽ luôn đỏ vì
 *     hai bên không cùng nội dung.
 *
 * Cơ chế:
 *   1. Chụp mỗi màn ở ba viewport canonical (desktop 1440×900, tablet
 *      768×1024, mobile 390×844) — cùng bộ với `scripts/ui-check.cjs`.
 *   2. So với ảnh baseline đã duyệt trong `docs/qa/visual-baseline/`.
 *   3. Nếu lệch quá ngưỡng → ghi ảnh diff ra để người review nhìn thấy
 *      CHÍNH XÁC chỗ lệch, không chỉ "hỏng".
 *
 * Ngưỡng: mặc định 0.1% pixel lệch (sau khi đã lọc nhiễu antialiasing).
 *   - 0% là không thực tế: font antialiasing khác nhau giữa hai lần render
 *     trên cùng máy vẫn tạo vài chục pixel lệch.
 *   - >1% là quá lỏng: một banner bị dịch chuyển là hơn 1%.
 *   - `VISUAL_MAX_DIFF_PERCENT` để ghi đè; `VISUAL_MAX_DIFF_PIXELS` để đặt
 *     trần tuyệt đối cho màn nhỏ (nhiều màn có viewport hẹp, 0.1% của 390×844
 *     là 328 px — tương đương một khối 18×18 đổi màu).
 *
 * Biến môi trường:
 *   VISUAL_BASE_URL     server đang chạy (mặc định http://127.0.0.1:4028)
 *   VISUAL_BASELINE_DIR thư mục baseline (mặc định docs/qa/visual-baseline)
 *   VISUAL_OUT_DIR      thư mục ảnh chụp + diff (mặc định thư mục tạm)
 *   CHROME_PATH         đường dẫn Chrome
 *
 * Thoát khác 0 nếu có màn lệch quá ngưỡng, để CI fail rõ ràng.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const puppeteer = require('puppeteer-core');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch').default;
const { writeFileSync } = require('node:fs');

const BASE = (process.env.VISUAL_BASE_URL || 'http://127.0.0.1:4028').replace(/\/$/, '');
const BASELINE_DIR =
  process.env.VISUAL_BASELINE_DIR || path.resolve(__dirname, '..', 'docs', 'qa', 'visual-baseline');
const OUT_DIR = process.env.VISUAL_OUT_DIR || path.join(os.tmpdir(), 'vietjet-visual-diff');
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const UPDATE = process.argv.includes('--update');
const MAX_DIFF_PERCENT = Number(process.env.VISUAL_MAX_DIFF_PERCENT || 0.1);
const MAX_DIFF_PIXELS = Number(process.env.VISUAL_MAX_DIFF_PIXELS || 2000);

/** Cùng bộ viewport canonical với `scripts/ui-check.cjs`. */
const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900, mobile: false },
  { label: 'tablet', width: 768, height: 1024, mobile: true },
  { label: 'mobile', width: 390, height: 844, mobile: true },
];

/**
 * Vùng có nội dung động — ảnh ở đây sẽ khác giữa hai lần chụp dù giao diện
 * không đổi, nên phải mask trước khi so.
 *
 * Hero carousel trang chủ là nguồn lệch lớn nhất: nó tự chạy mỗi vài giây,
 * và mỗi slide có một bức ảnh khác nhau.
 */
const DYNAMIC_SELECTORS = [
  '[data-visual-mask]',
  '.hero-slider',
  '.hero-carousel',
  '[aria-roledescription="carousel"]',
];

/**
 * Các màn có trong cổng. Chỉ những màn nội dung TĨNH — màn có dữ liệu động
 * (kết quả tìm vé, tài khoản, thanh toán) sẽ đổi mỗi lần seed lại chuyến bay
 * hoặc mỗi lần có booking mới, và một baseline phụ thuộc dữ liệu sẽ đỏ
 * không phải vì giao diện hỏng.
 *
 * Muốn gate một màn động thì thêm nó vào đây VÀ dựng baseline từ một database
 * đã seed cố định — không thêm màn động mà không có quy trình seed cố định.
 */
const SCREENS = [
  { name: '01-trang-chu', url: `${BASE}/trang-chu` },
  { name: '08-gioi-thieu', url: `${BASE}/gioi-thieu` },
  { name: '09-hoi-dap', url: `${BASE}/hoi-dap` },
  { name: '10-lien-he', url: `${BASE}/lien-he` },
  { name: '11-dang-ky', url: `${BASE}/dang-ky` },
  { name: '12-quen-mat-khau', url: `${BASE}/quen-mat-khau` },
  { name: '13-dat-lai-mat-khau', url: `${BASE}/dat-lai-mat-khau` },
  { name: '05-lam-thu-tuc', url: `${BASE}/lam-thu-tuc` },
  { name: '04-tra-cuu', url: `${BASE}/tra-cuu` },
  { name: '07-dich-vu-hanh-ly', url: `${BASE}/dich-vu?service=baggage` },
];

function chromePath() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Không tìm thấy Chrome/Chromium');
  return found;
}

/**
 * Chờ trang đứng yên trước khi chụp. Chụp đúng lúc còn skeleton thì ảnh
 * baseline ghi lại skeleton, và lần sau trang đã render xong thì diff báo hỏng
 * dù giao diện không đổi.
 */
async function waitForStable(page) {
  await page
    .waitForFunction(
      () => {
        const skeletons = document.querySelectorAll(
          '.skeleton-pulse, .skeleton-base, .skeleton-card, .skeleton-accent, .skeleton-accent-bar, .skeleton-row, .skeleton-shimmer'
        ).length;
        return skeletons === 0 && document.body && document.body.innerText.length > 200;
      },
      { timeout: 20000 }
    )
    .catch(() => {
      /* Trang không bao giờ "ổn định" — vẫn chụp, baseline sẽ phản ánh điều đó. */
    });
  // Thêm một nhịp để animation vào/carousel kịp về trạng thái đầu.
  await new Promise((r) => setTimeout(r, 1200));
}

async function shoot(browser, screen, viewport) {
  const page = await browser.newPage();
  try {
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      isMobile: viewport.mobile,
      hasTouch: viewport.mobile,
    });
    await page.goto(screen.url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => null);
    await waitForStable(page);
    // Masking cho vùng động: carousel hero tự chạy, nên ảnh ở hai thời điểm
    // khác nhau có slide khác nhau — đó là DỰ KIẾN, không phải hồi quy. Vùng bị
    // mask được tô một màu xám đồng nhất trước khi so, nên nó không bao giờ
    // tạo khác biệt.
    //
    // Chọn vùng mask bằng selector, không bằng toạ độ cứng: layout đổi thì
    // toạ độ hỏng, selector thì bám theo cấu trúc.
    for (const selector of DYNAMIC_SELECTORS) {
      const boxes = await page
        .$$(selector)
        .then((els) => Promise.all(els.map((el) => el.boundingBox().catch(() => null))))
        .catch(() => []);
      for (const box of boxes) {
        if (!box) continue;
        await page
          .evaluate(
            (sel, b) => {
              const el = document.querySelector(sel);
              if (!el) return;
              el.style.background = '#c8c8c8';
              el.querySelectorAll('img').forEach((i) => {
                i.style.visibility = 'hidden';
              });
            },
            selector,
            box
          )
          .catch(() => {});
      }
    }
    const buffer = await page.screenshot({ fullPage: true });
    return buffer;
  } finally {
    await page.close();
  }
}

/**
 * So hai ảnh. Kích thước khác nhau là thay đổi LAYOUT, không phải khác biệt
 * pixel — nên đó là lỗi, không phải "không so được".
 */
function comparePng(actualBuf, baselineBuf) {
  const actual = PNG.sync.read(actualBuf);
  const baseline = PNG.sync.read(baselineBuf);
  if (actual.width !== baseline.width || actual.height !== baseline.height) {
    return {
      ok: false,
      reason: `KÍCH THƯỚC KHÁC: baseline ${baseline.width}×${baseline.height} vs hiện tại ${actual.width}×${actual.height}`,
      diffPixels: actual.width * actual.height,
      diffPercent: 100,
      diffImage: null,
    };
  }
  const diff = new PNG({ width: actual.width, height: actual.height });
  const diffPixels = pixelmatch(
    baseline.data,
    actual.data,
    diff.data,
    actual.width,
    actual.height,
    {
      // threshold 0.1 = bỏ qua khác biệt do antialiasing ở mép, giống mặc định
      // của perceptual diff: cùng một nội dung vẫn có vài chục pixel lệch.
      threshold: 0.1,
      includeAA: false,
      diffColor: [255, 0, 255],
    }
  );
  const total = actual.width * actual.height;
  return {
    ok: true,
    diffPixels,
    diffPercent: (diffPixels / total) * 100,
    diffImage: PNG.sync.write(diff),
    total,
  };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(BASELINE_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: 'new',
    args: ['--disable-gpu', '--no-first-run', '--disable-extensions'],
  });

  const results = [];
  try {
    for (const screen of SCREENS) {
      for (const viewport of VIEWPORTS) {
        const label = `${screen.name}-${viewport.label}`;
        const actualBuf = await shoot(browser, screen, viewport);
        const actualPath = path.join(OUT_DIR, `${label}.png`);
        fs.writeFileSync(actualPath, actualBuf);

        const baselinePath = path.join(BASELINE_DIR, `${label}.png`);

        if (UPDATE) {
          fs.writeFileSync(baselinePath, actualBuf);
          results.push({ label, status: 'updated', baselinePath });
          console.log(`  ↻ ${label.padEnd(34)} baseline đã cập nhật`);
          continue;
        }

        if (!fs.existsSync(baselinePath)) {
          results.push({ label, status: 'missing', baselinePath, actualPath });
          console.log(`  ⚠️  ${label.padEnd(34)} chưa có baseline`);
          continue;
        }

        const cmp = comparePng(actualBuf, fs.readFileSync(baselinePath));
        const diffPath = path.join(OUT_DIR, `${label}.diff.png`);
        if (cmp.diffImage) fs.writeFileSync(diffPath, cmp.diffImage);

        const overAbsolute = cmp.diffPixels > MAX_DIFF_PIXELS;
        const overPercent = cmp.diffPercent > MAX_DIFF_PERCENT;
        const ok = cmp.ok && !overAbsolute && !overPercent;

        results.push({
          label,
          status: ok ? 'pass' : 'fail',
          diffPixels: cmp.diffPixels,
          diffPercent: Number(cmp.diffPercent.toFixed(4)),
          reason: cmp.ok
            ? overAbsolute
              ? `lệch ${cmp.diffPixels} px (> ${MAX_DIFF_PIXELS})`
              : overPercent
                ? `lệch ${cmp.diffPercent.toFixed(3)}% (> ${MAX_DIFF_PERCENT}%)`
                : null
            : cmp.reason,
          diffPath: cmp.diffImage ? diffPath : null,
          actualPath,
        });

        console.log(
          `  ${ok ? '✅' : '⚠️ '} ${label.padEnd(34)} lệch ${cmp.diffPixels}px ` +
            `(${cmp.diffPercent.toFixed(3)}%)` +
            (cmp.ok ? '' : ` — ${results[results.length - 1].reason}`)
        );
      }
    }
  } finally {
    await browser.close();
  }

  writeFileSync(
    path.join(OUT_DIR, 'report.json'),
    JSON.stringify(
      {
        base: BASE,
        mode: UPDATE ? 'update' : 'compare',
        thresholds: { percent: MAX_DIFF_PERCENT, pixels: MAX_DIFF_PIXELS },
        results,
      },
      null,
      2
    )
  );

  console.log('\n=== CỔNG DIFF ẢNH ===');
  console.log(`Server: ${BASE}  ·  baseline: ${BASELINE_DIR}\n`);

  if (UPDATE) {
    console.log(`✅ Đã cập nhật ${results.length} baseline.`);
    return;
  }

  const failed = results.filter((r) => r.status !== 'pass');
  const missing = results.filter((r) => r.status === 'missing');
  for (const r of failed) {
    console.log(`⚠️  ${r.label.padEnd(34)} ${r.reason || 'lệch quá ngưỡng'}`);
    if (r.diffPath) console.log(`    ảnh diff: ${r.diffPath}`);
  }
  if (missing.length) {
    console.log(
      `\n${missing.length} màn chưa có baseline — chạy \`npm run test:visual -- --update\` một lần ` +
        `rồi review ảnh trước khi commit.`
    );
  }

  if (failed.length) {
    console.error(`\n❌ Visual diff: ${failed.length}/${results.length} màn lệch quá ngưỡng.`);
    process.exit(1);
  }
  console.log(`\n✅ Visual diff passed — ${results.length}/${results.length} màn khớp baseline.`);
}

main().catch((error) => {
  console.error('❌ visual-diff lỗi:', error);
  process.exit(1);
});
