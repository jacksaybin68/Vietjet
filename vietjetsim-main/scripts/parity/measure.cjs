#!/usr/bin/env node
/**
 * scripts/parity/measure.cjs — chạy BỘ ĐO DÙNG CHUNG trên một base URL bất kỳ.
 *
 *   node scripts/parity/measure.cjs --base=https://newweb.vietjetair.com --prefix=official
 *   node scripts/parity/measure.cjs --base=http://127.0.0.1:4029        --prefix=local
 *
 * Ghi: docs/qa/2026-11-15-vietjet-measure/<prefix>-<route>-<viewport>.json
 *
 * Chỉ ghi lại SỐ ĐO (kích thước / màu / font / hiệu ứng). Không tải CSS, font
 * hay asset của site thật về repo (theo AGENTS.md).
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');
const { inBrowser, ROUTES, VIEWPORTS } = require('./probes.cjs');

const APP_ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(APP_ROOT, 'docs', 'qa', '2026-11-15-vietjet-measure');
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const BASE = arg('base', 'http://127.0.0.1:4029').replace(/\/$/, '');
const PREFIX = arg('prefix', 'local');
const ONLY = arg('only', ''); // ví dụ: home,checkin
const SETTLE_MS = Number(arg('settle', '3500'));

function chromePath() {
  const candidates = [
    CHROME,
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  ];
  const found = candidates.find((p) => p && fs.existsSync(p));
  if (!found) throw new Error('Không tìm thấy Chrome/Chromium');
  return found;
}

/** Chuỗi hàm đo, đóng gói lại để `new Function` chạy được trong trình duyệt. */
const PROBE_SRC = `(${inBrowser.toString()})()`;

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const routes = ONLY
    ? ROUTES.filter((r) => ONLY.split(',').includes(r.slug))
    : ROUTES;

  let done = 0;
  for (const route of routes) {
    const url = route[PREFIX === 'official' ? 'official' : 'local'];
    if (!url) continue;
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        isMobile: vp.mobile,
        hasTouch: vp.mobile,
      });
      let data = null;
      let error = null;
      try {
        await page.goto(BASE + url, { waitUntil: 'networkidle2', timeout: 120000 });
        await new Promise((r) => setTimeout(r, SETTLE_MS));
        data = await page.evaluate(PROBE_SRC);
      } catch (err) {
        error = String(err && err.message ? err.message : err);
      }
      await page.close();

      const file = path.join(OUT_DIR, `${PREFIX}-${route.slug}-${vp.name}.json`);
      const payload = {
        route: route.slug,
        label: route.label,
        side: PREFIX,
        url: BASE + url,
        viewport: vp.name,
        measuredAt: new Date().toISOString(),
        ...(error ? { error } : { data }),
      };
      fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
      done += 1;
      console.log(`${error ? '⚠️ ' : '✅ '} ${PREFIX}-${route.slug}-${vp.name}${error ? ` — ${error}` : ''}`);
    }
  }

  await browser.close();
  console.log(`\nĐã ghi ${done} file vào ${path.relative(APP_ROOT, OUT_DIR)}/`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
