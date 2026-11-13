/**
 * Chụp nhanh hero `/trang-chu` ở nhiều viewport để đối chiếu trực quan.
 *
 * Dùng `puppeteer-core` + Chrome đã cài sẵn trên máy (không tải Chromium).
 * Chạy: node scripts/shot-hero.cjs [baseUrl]
 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const BASE = process.argv[2] || 'http://localhost:4031';
const OUT = path.join(__dirname, '..', '.screenshots-hero');

const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900, isMobile: false, deviceScaleFactor: 1 },
  { label: 'tablet', width: 768, height: 1024, isMobile: true, deviceScaleFactor: 1 },
  { label: 'mobile', width: 390, height: 844, isMobile: true, deviceScaleFactor: 1 },
];

function chromePath() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Không tìm thấy Chrome/Chromium trên máy');
  return found;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const report = [];
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport(vp);
    await page.goto(`${BASE}/trang-chu`, { waitUntil: 'networkidle2', timeout: 120000 });
    await new Promise((r) => setTimeout(r, 1200));

    const metrics = await page.evaluate(() => {
      const rect = (el) => (el ? el.getBoundingClientRect().toJSON() : null);
      const q = (s) => document.querySelector(s);
      const form = q('#hero-booking-form');
      const hero = form ? form.closest('section') : null;
      const cta = [...document.querySelectorAll('button')].find(
        (b) => b.textContent.trim() === 'Tìm chuyến bay'
      );
      return {
        viewport: { w: innerWidth, h: innerHeight },
        hero: rect(hero),
        bannerImg: rect(hero ? hero.querySelector('img') : null),
        tabs: rect(q('.vj-booking-tabs')),
        tabItems: [...document.querySelectorAll('.vj-booking-tab')].map((b) => ({
          label: b.textContent.trim(),
          rect: rect(b),
        })),
        panel: rect(q('.vj-booking-panel')),
        dots: rect(q('[data-testid="hero-slider-dots"]')),
        cta: rect(cta),
        ctaStyle: cta
          ? {
              bg: getComputedStyle(cta).backgroundImage.slice(0, 120),
              fontSize: getComputedStyle(cta).fontSize,
              fontWeight: getComputedStyle(cta).fontWeight,
              borderRadius: getComputedStyle(cta).borderRadius,
              textTransform: getComputedStyle(cta).textTransform,
            }
          : null,
      };
    });

    const file = path.join(OUT, `hero-${vp.label}.png`);
    await page.screenshot({ path: file, fullPage: false });
    report.push({ viewport: vp.label, ...metrics, file });
    console.log(`✓ ${vp.label} (${vp.width}×${vp.height}) → ${file}`);
    await page.close();
  }

  fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(report, null, 2));
  console.log('\n' + JSON.stringify(report, null, 2));
  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
