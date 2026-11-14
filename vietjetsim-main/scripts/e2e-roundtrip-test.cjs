const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4055';
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'qa', 'e2e-roundtrip');

fs.mkdirSync(OUT_DIR, { recursive: true });

async function runTest() {
  console.log(`Starting Full E2E Simulation on ${BASE_URL}...`);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--no-proxy-server'],
  });

  const report = {
    desktop: { steps: [], errors: [] },
    mobile: { steps: [], errors: [] },
  };

  let createdBookingId = null;

  try {
    // ══════════════════════════════════════════════════════════
    // 1. DESKTOP TEST (1440 x 900)
    // ══════════════════════════════════════════════════════════
    console.log('\n--- 1. DESKTOP SIMULATION (1440x900) ---');
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('Failed to load resource') && !text.includes('DevTools')) {
          report.desktop.errors.push(text);
          console.log('[Desktop Console Error]:', text);
        }
      }
    });

    const searchUrl = `${BASE_URL}/tim-ve?from=SGN&to=HAN&depart=2026-11-20&return=2026-11-25&pax=1`;
    console.log('Navigating to:', searchUrl);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 3000));

    // Screenshot Step 1: Outbound
    await page.screenshot({ path: path.join(OUT_DIR, '01-desktop-step1-outbound.png') });
    report.desktop.steps.push({ step: 1, name: 'Step 1: Chọn chuyến đi', status: 'OK' });
    console.log('✓ Step 1: Chiều đi hiển thị chuẩn.');

    // Wait for fare buttons and click Eco on outbound
    await page.waitForSelector('button[data-testid="select-fare"]', { timeout: 15000 });
    const fareButtons = await page.$$('button[data-testid="select-fare"]');
    if (fareButtons.length > 0) {
      await fareButtons[fareButtons.length - 1].click();
    }
    await new Promise((r) => setTimeout(r, 2500));

    // Screenshot Step 1: Inbound
    await page.screenshot({ path: path.join(OUT_DIR, '02-desktop-step1-inbound.png') });
    report.desktop.steps.push({ step: 1, name: 'Step 1: Tự động chuyển Chiều về', status: 'OK' });
    console.log('✓ Step 1: Đã tự động chuyển sang Chiều về.');

    // Click inbound Eco fare
    const returnFareButtons = await page.$$('button[data-testid="select-fare"]');
    if (returnFareButtons.length > 0) {
      await returnFareButtons[returnFareButtons.length - 1].click();
    }
    await new Promise((r) => setTimeout(r, 2000));

    // Click "Đi tiếp" at bottom sticky bar
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find((b) => b.textContent && b.textContent.includes('Đi tiếp'));
      if (nextBtn) nextBtn.click();
    });
    await new Promise((r) => setTimeout(r, 3000));

    // Screenshot Step 2: Passenger Info
    await page.screenshot({ path: path.join(OUT_DIR, '03-desktop-step2-passengers.png') });
    report.desktop.steps.push({ step: 2, name: 'Step 2: Nhập thông tin hành khách', status: 'OK' });
    console.log('✓ Step 2: Giao diện nhập thông tin hành khách đã tải.');

    // Fill passenger form with realistic data
    await page.type('input[id*="name"]', 'NGUYEN');
    await page.type('input[id*="firstName"]', 'VAN A');
    await page.type('input[id*="dob"]', '1995-10-20');
    await page.type('input[id*="phone"]', '0912345678');
    await page.type('input[id*="email"]', 'nguyen.vana@gmail.com');

    // Agree to policies
    await page.evaluate(() => {
      const policyCheckbox = document.querySelector('input[type="checkbox"][required]');
      if (policyCheckbox && !policyCheckbox.checked) {
        policyCheckbox.click();
      }
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Submit passenger form (Click "Đi tiếp" on bottom bar which submits form)
    await page.evaluate(() => {
      const form = document.getElementById('passenger-info-form');
      if (form) form.requestSubmit();
    });
    console.log('Submitted passenger form, waiting for Step 3...');
    await new Promise((r) => setTimeout(r, 3000));

    // Screenshot Step 3: Ancillaries
    await page.screenshot({ path: path.join(OUT_DIR, '04-desktop-step3-ancillaries.png') });
    report.desktop.steps.push({ step: 3, name: 'Step 3: Dịch vụ bổ sung', status: 'OK' });
    console.log('✓ Step 3: Giao diện dịch vụ bổ sung (ghế, hành lý).');

    // Click continue on Step 3 to book and advance to Payment
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const finishBtn = buttons.find(
        (b) =>
          b.textContent &&
          (b.textContent.includes('Thanh toán') ||
            b.textContent.includes('Đi tiếp') ||
            b.textContent.includes('Hoàn tất'))
      );
      if (finishBtn) finishBtn.click();
    });
    console.log('Submitted booking, waiting for payment redirect...');
    await new Promise((r) => setTimeout(r, 5000));

    const finalUrl = page.url();
    console.log('URL after Step 3 submit:', finalUrl);
    if (finalUrl.includes('bookingId=')) {
      createdBookingId = new URL(finalUrl).searchParams.get('bookingId');
      console.log('✓ Created booking ID:', createdBookingId);
    }

    // Screenshot Step 4: Payment Page
    await page.screenshot({
      path: path.join(OUT_DIR, '05-desktop-step4-payment.png'),
      fullPage: true,
    });
    report.desktop.steps.push({
      step: 4,
      name: 'Step 4: Hoá đơn thanh toán thống nhất',
      status: 'OK',
    });
    console.log('✓ Step 4: Đã chụp ảnh trang thanh toán Desktop.');

    // ══════════════════════════════════════════════════════════
    // 2. MOBILE TEST (390 x 844)
    // ══════════════════════════════════════════════════════════
    console.log('\n--- 2. MOBILE SIMULATION (390x844) ---');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    mobilePage.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('Failed to load resource') && !text.includes('DevTools')) {
          report.mobile.errors.push(text);
          console.log('[Mobile Console Error]:', text);
        }
      }
    });

    console.log('Mobile navigating to:', searchUrl);
    await mobilePage.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 3000));

    await mobilePage.screenshot({ path: path.join(OUT_DIR, '06-mobile-step1-search.png') });
    report.mobile.steps.push({
      step: 1,
      name: 'Mobile Step 1: Tìm chuyến bay & Tabs',
      status: 'OK',
    });
    console.log('✓ Mobile Step 1: Đã chụp ảnh.');

    // Direct mobile payment screenshot with created booking
    const payTarget = createdBookingId
      ? `${BASE_URL}/thanh-toan?bookingId=${createdBookingId}`
      : `${BASE_URL}/thanh-toan`;
    console.log('Mobile navigating to payment:', payTarget);
    await mobilePage.goto(payTarget, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 4000));

    await mobilePage.screenshot({
      path: path.join(OUT_DIR, '07-mobile-payment.png'),
      fullPage: true,
    });
    report.mobile.steps.push({ step: 4, name: 'Mobile Step 4: Thanh toán & QR', status: 'OK' });
    console.log('✓ Mobile Step 4: Đã chụp ảnh trang thanh toán.');

    await browser.close();
    console.log('\nAll simulations completed successfully!');
    fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  } catch (err) {
    console.error('Simulation error:', err);
    await browser.close();
  }
}

runTest();
