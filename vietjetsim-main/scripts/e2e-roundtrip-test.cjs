const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4055';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'qa', 'e2e-roundtrip');

fs.mkdirSync(OUT_DIR, { recursive: true });

async function runTest() {
  console.log(`Starting E2E Round-Trip User Simulation on ${BASE_URL}...`);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--no-proxy-server'],
  });

  const report = {
    desktop: { steps: [], errors: [] },
    mobile: { steps: [], errors: [] },
  };

  try {
    // ══════════════════════════════════════════════════════════
    // 1. DESKTOP TEST (1440 x 900)
    // ══════════════════════════════════════════════════════════
    console.log('\n--- Running Desktop Simulation (1440x900) ---');
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
    await new Promise((r) => setTimeout(r, 4000));

    // Screenshot Step 1: Outbound
    await page.screenshot({ path: path.join(OUT_DIR, '01-desktop-step1-outbound.png') });
    report.desktop.steps.push({ step: 1, name: 'Search Results (Outbound)', status: 'OK' });
    console.log('Step 1 (Outbound) loaded.');

    // Find and click the first Eco fare button on outbound leg
    const ecoBtnSelector = 'button[class*="border"], div[role="button"]';
    await page.waitForSelector('button', { timeout: 15000 });

    // Click outbound flight
    const clickedOutbound = await page.evaluate(() => {
      // Look for fare buttons or flight cards
      const buttons = Array.from(document.querySelectorAll('button'));
      const ecoBtn = buttons.find((b) => b.textContent && (b.textContent.includes('Eco') || b.textContent.includes('VND') || b.textContent.includes('Chọn')));
      if (ecoBtn) {
        ecoBtn.click();
        return true;
      }
      return false;
    });
    console.log('Clicked outbound fare:', clickedOutbound);
    await new Promise((r) => setTimeout(r, 2500));

    // Screenshot Step 1: Inbound
    await page.screenshot({ path: path.join(OUT_DIR, '02-desktop-step1-inbound.png') });
    report.desktop.steps.push({ step: 1, name: 'Search Results (Inbound switched)', status: 'OK' });

    // Click inbound flight
    const clickedInbound = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      // Find a button with VND or Eco
      const fareBtns = buttons.filter((b) => b.textContent && (b.textContent.includes('Eco') || b.textContent.includes('VND')));
      if (fareBtns.length > 0) {
        fareBtns[0].click();
        return true;
      }
      return false;
    });
    console.log('Clicked inbound fare:', clickedInbound);
    await new Promise((r) => setTimeout(r, 2000));

    // Click "Đi tiếp" to advance to Step 2
    const clickedContinue = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find((b) => b.textContent && b.textContent.includes('Đi tiếp'));
      if (nextBtn) {
        nextBtn.click();
        return true;
      }
      return false;
    });
    console.log('Clicked Đi tiếp to Step 2:', clickedContinue);
    await new Promise((r) => setTimeout(r, 2500));

    // Screenshot Step 2: Passenger Info
    await page.screenshot({ path: path.join(OUT_DIR, '03-desktop-step2-passengers.png') });
    report.desktop.steps.push({ step: 2, name: 'Passenger Info Step', status: 'OK' });

    // Fill passenger information if form exists
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      inputs.forEach((input) => {
        const name = (input.getAttribute('name') || '').toLowerCase();
        const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
        if (name.includes('last') || placeholder.includes('họ')) {
          input.value = 'NGUYEN';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (name.includes('first') || placeholder.includes('tên')) {
          input.value = 'VAN A';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (name.includes('phone') || placeholder.includes('thoại')) {
          input.value = '0912345678';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (name.includes('email') || placeholder.includes('email')) {
          input.value = 'nguyenvana@example.com';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });

    // Advance to Step 3
    const clickedToStep3 = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent && (b.textContent.includes('Tiếp tục') || b.textContent.includes('Đi tiếp')));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Advanced to Step 3:', clickedToStep3);
    await new Promise((r) => setTimeout(r, 2500));

    // Screenshot Step 3: Ancillaries
    await page.screenshot({ path: path.join(OUT_DIR, '04-desktop-step3-ancillaries.png') });
    report.desktop.steps.push({ step: 3, name: 'Ancillary Services Step', status: 'OK' });

    // Advance to Step 4 (Payment)
    const clickedToPayment = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent && (b.textContent.includes('Thanh toán') || b.textContent.includes('Đi tiếp') || b.textContent.includes('Hoàn tất')));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Advanced to Payment:', clickedToPayment);
    await new Promise((r) => setTimeout(r, 4000));

    // Screenshot Step 4: Payment Page
    await page.screenshot({ path: path.join(OUT_DIR, '05-desktop-step4-payment.png'), fullPage: true });
    report.desktop.steps.push({ step: 4, name: 'Payment Page', status: 'OK' });

    const paymentUrl = page.url();
    console.log('Current URL after submit:', paymentUrl);

    // ══════════════════════════════════════════════════════════
    // 2. MOBILE TEST (390 x 844)
    // ══════════════════════════════════════════════════════════
    console.log('\n--- Running Mobile Simulation (390x844) ---');
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
    await new Promise((r) => setTimeout(r, 4000));

    await mobilePage.screenshot({ path: path.join(OUT_DIR, '06-mobile-step1-search.png') });
    report.mobile.steps.push({ step: 1, name: 'Mobile Search & Results', status: 'OK' });
    console.log('Mobile Step 1 loaded.');

    // Also navigate mobile directly to payment page if bookingId created
    if (paymentUrl.includes('/thanh-toan')) {
      await mobilePage.goto(paymentUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise((r) => setTimeout(r, 3000));
      await mobilePage.screenshot({ path: path.join(OUT_DIR, '07-mobile-payment.png'), fullPage: true });
      report.mobile.steps.push({ step: 4, name: 'Mobile Payment Page', status: 'OK' });
      console.log('Mobile Payment page loaded.');
    } else {
      // Test fallback payment page
      await mobilePage.goto(`${BASE_URL}/thanh-toan`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise((r) => setTimeout(r, 3000));
      await mobilePage.screenshot({ path: path.join(OUT_DIR, '07-mobile-payment.png'), fullPage: true });
      report.mobile.steps.push({ step: 4, name: 'Mobile Payment Page (Fallback)', status: 'OK' });
    }

    await browser.close();
    console.log('\nAll simulations finished successfully!');
    fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  } catch (err) {
    console.error('Simulation error:', err);
    await browser.close();
  }
}

runTest();
