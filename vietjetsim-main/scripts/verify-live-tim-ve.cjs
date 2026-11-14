const puppeteer = require('puppeteer-core');
const fs = require('node:fs');
const path = require('node:path');

const URL = process.argv[2] || 'https://vietjet.shop/tim-ve?from=HAN&to=SGN&depart=2026-11-20&adult=1';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

(async () => {
  console.log(`Bắt đầu truy cập kiểm tra thực tế: ${URL}`);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Đang tải trang desktop 1440x900...');
  const res = await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log(`HTTP Status: ${res ? res.status() : 'N/A'}`);
  await new Promise((r) => setTimeout(r, 4000));

  // Chờ cho card chuyến bay hiển thị
  await page.waitForSelector('[data-testid="flight-result-card"]', { timeout: 15000 }).catch(() => {
    console.log('Chờ selector flight-result-card timeout, tiếp tục đánh giá...');
  });
  await new Promise((r) => setTimeout(r, 2000));

  // Đánh giá trạng thái ban đầu:
  const initialCheck = await page.evaluate(() => {
    const cards = document.querySelectorAll('[data-testid="flight-result-card"]');
    // Kiểm tra xem có chi tiết accordion đang mở không:
    const openAccordions = Array.from(document.querySelectorAll('.animate-fadeIn, .space-y-3\\.5')).filter(el => {
      return el.textContent && el.textContent.includes('Bao gồm');
    });

    // Kiểm tra 4 header hạng vé:
    const fareHeaders = Array.from(document.querySelectorAll('[role="button"]')).filter(el => {
      const t = el.textContent || '';
      return t.includes('BUSINESS') || t.includes('skyBOSS') || t.includes('Deluxe') || t.includes('Eco');
    }).map(el => {
      const style = window.getComputedStyle(el);
      const img = el.querySelector('img');
      return {
        text: (el.textContent || '').trim(),
        bg: style.backgroundColor,
        color: style.color,
        hasImg: !!img,
        imgSrc: img ? img.src : null,
        imgVisible: img ? (img.offsetWidth > 0 && img.offsetHeight > 0) : false,
      };
    });

    return {
      cardCount: cards.length,
      accordionsOpenInitially: openAccordions.length,
      fareHeaders,
    };
  });

  console.log('=== KẾT QUẢ KIỂM TRA BAN ĐẦU ===');
  console.log(`Số chuyến bay hiển thị: ${initialCheck.cardCount}`);
  console.log(`Số accordion chi tiết mở ban đầu: ${initialCheck.accordionsOpenInitially} (kỳ vọng: 0)`);
  console.log('Các cột header hạng vé:');
  console.log(JSON.stringify(initialCheck.fareHeaders, null, 2));

  // Chụp ảnh desktop ban đầu
  const screenshotDir = path.resolve(__dirname, '..', 'docs', 'qa', 'screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
  const desktopInitPath = path.join(screenshotDir, 'live-desktop-initial.png');
  await page.screenshot({ path: desktopInitPath, fullPage: false });
  console.log(`Đã chụp ảnh: ${desktopInitPath}`);

  // Thử bấm chọn ô vé (hạng Deluxe hoặc Eco của chuyến bay đầu tiên)
  console.log('\nThực hiện thao tác bấm chọn ô giá vé...');
  const clickResult = await page.evaluate(() => {
    const selectButtons = document.querySelectorAll('[data-testid="select-fare"]');
    if (selectButtons.length > 0) {
      // Bấm vào nút thứ 3 (Deluxe) hoặc thứ 1
      const btn = selectButtons[2] || selectButtons[0];
      btn.click();
      return { clicked: true, text: btn.textContent.trim() };
    }
    return { clicked: false };
  });
  console.log('Kết quả click:', clickResult);

  await new Promise((r) => setTimeout(r, 1500));

  // Kiểm tra sau khi bấm chọn:
  const afterClickCheck = await page.evaluate(() => {
    const openAccordions = Array.from(document.querySelectorAll('div')).filter(el => {
      return el.textContent && el.textContent.includes('Bao gồm:') && el.textContent.includes('Chưa bao gồm');
    });

    const selectedBadges = Array.from(document.querySelectorAll('span')).filter(el => {
      return (el.textContent || '').trim() === 'Đã chọn';
    }).map(el => {
      const style = window.getComputedStyle(el.parentElement || el);
      return {
        text: el.textContent.trim(),
        bg: style.backgroundColor,
        color: style.color,
      };
    });

    return {
      accordionsOpenAfterClick: openAccordions.length,
      selectedBadges,
    };
  });

  console.log('=== KẾT QUẢ SAU KHI CLICK ===');
  console.log(`Số accordion chi tiết mở ra: ${afterClickCheck.accordionsOpenAfterClick} (kỳ vọng: >= 1)`);
  console.log('Badges đã chọn:', afterClickCheck.selectedBadges);

  const desktopAfterClickPath = path.join(screenshotDir, 'live-desktop-after-click.png');
  await page.screenshot({ path: desktopAfterClickPath, fullPage: false });
  console.log(`Đã chụp ảnh sau click: ${desktopAfterClickPath}`);

  // Kiểm tra mobile
  console.log('\nĐang kiểm tra giao diện mobile 390x844...');
  const mPage = await browser.newPage();
  await mPage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await mPage.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 4000));

  const mobileCheck = await mPage.evaluate(() => {
    const cards = document.querySelectorAll('[data-testid="flight-result-card"]');
    const fareBadges = Array.from(document.querySelectorAll('[data-testid="select-fare"] span.sm\\:hidden')).map(el => {
      const style = window.getComputedStyle(el);
      return {
        text: el.textContent.trim(),
        bg: style.backgroundColor,
        color: style.color,
        fontSize: style.fontSize,
      };
    });
    return {
      cardCount: cards.length,
      fareBadges: fareBadges.slice(0, 4),
    };
  });

  console.log('Kết quả kiểm tra Mobile:');
  console.log(JSON.stringify(mobileCheck, null, 2));

  const mobilePath = path.join(screenshotDir, 'live-mobile-390.png');
  await mPage.screenshot({ path: mobilePath, fullPage: false });
  console.log(`Đã chụp ảnh mobile: ${mobilePath}`);

  await browser.close();
  console.log('\nHoàn tất kiểm tra thực tế thành công!');
})();
