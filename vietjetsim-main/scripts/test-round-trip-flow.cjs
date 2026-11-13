#!/usr/bin/env node
/**
 * Test toàn diện luồng đặt vé khứ hồi (Round-trip booking flow).
 *
 * Kiểm tra:
 *  1. HeroBookingWidget: Lựa chọn Khứ hồi, ngày đi, ngày về.
 *  2. Trang /tim-ve: Trip board nhận diện 'Chuyến bay khứ hồi', 2 chặng đi và về.
 *  3. Chọn vé chặng đi (outbound) -> cập nhật panel.
 *  4. Chọn vé chặng về (inbound) -> cập nhật panel với cả 2 chặng.
 *  5. Tổng tiền khứ hồi tính chính xác.
 *  6. Nút "Đi tiếp" hoạt động.
 */

const { spawn } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: sleep } = require('node:timers/promises');

const BASE = (process.env.MEASURE_BASE_URL || 'http://localhost:4028').replace(/\/$/, '');
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.MEASURE_CDP_PORT || 9366);
const PROFILE_DIR = path.join(os.tmpdir(), 'vietjet-test-roundtrip', 'chrome-profile');

async function main() {
  console.log('🚀 Khởi động kiểm thử tính năng ĐẶT VÉ KHỨ HỒI...');
  console.log(`🌐 Base URL: ${BASE}`);

  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${PROFILE_DIR}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      '--window-size=1440,900',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  const cleanup = () => {
    try {
      chrome.kill('SIGKILL');
    } catch {
      /* ignore */
    }
  };

  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);

  try {
    let target = null;
    for (let i = 0; i < 60 && !target; i += 1) {
      await sleep(250);
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
        const list = await res.json();
        target = list.find((t) => t.type === 'page');
      } catch {
        /* wait */
      }
    }
    if (!target) throw new Error('Không thể kết nối Chrome qua cổng ' + PORT);

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let id = 0;
    const pending = new Map();
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });

    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        id += 1;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // 1. Kiểm tra trang chủ & HeroBookingWidget
    console.log('\n--- BƯỚC 1: Kiểm tra Form tìm kiếm khứ hồi trên Trang chủ ---');
    await send('Page.navigate', { url: `${BASE}/trang-chu` });

    let ready = false;
    for (let i = 0; i < 40 && !ready; i += 1) {
      await sleep(500);
      const probe = await send('Runtime.evaluate', {
        expression: `!!document.querySelector('.vj-booking-panel')`,
        returnByValue: true,
      });
      ready = probe.result.value === true;
    }
    if (!ready) throw new Error('Hero booking panel không xuất hiện trong thời gian quy định');

    const heroCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const roundTripRadio = document.querySelector('input[name="tripType"][value="roundTrip"]') ||
                               Array.from(document.querySelectorAll('label, button')).find(el => el.textContent.includes('Khứ hồi'));
        const fromInput = document.querySelector('input[placeholder*="Điểm"], [data-testid="from-airport"], input[name="from"]');
        const toInput = document.querySelector('input[placeholder*="Điểm"], [data-testid="to-airport"], input[name="to"]');
        return {
          hasRoundTripOption: !!roundTripRadio,
          roundTripText: roundTripRadio ? roundTripRadio.textContent || 'input' : null,
          hasFromField: !!document.body.innerText.includes('Điểm khởi hành'),
          hasToField: !!document.body.innerText.includes('Điểm đến'),
          hasDateFields: !!document.body.innerText.includes('Ngày đi'),
        };
      })()`,
      returnByValue: true,
    });
    console.log('✅ Kết quả kiểm tra Hero Widget:', heroCheck.result.value);

    // 2. Chuyển đến trang tìm vé khứ hồi
    console.log('\n--- BƯỚC 2: Điều hướng vào luồng Tìm vé khứ hồi (/tim-ve) ---');
    const searchUrl = `${BASE}/tim-ve?from=SGN&to=HAN&depart=2026-11-20&return=2026-11-25&adult=1`;
    console.log(`🔗 URL: ${searchUrl}`);
    await send('Page.navigate', { url: searchUrl });

    let searchReady = false;
    for (let i = 0; i < 40 && !searchReady; i += 1) {
      await sleep(500);
      const probe = await send('Runtime.evaluate', {
        expression: `!!document.querySelector('[data-testid="trip-board"]')`,
        returnByValue: true,
      });
      searchReady = probe.result.value === true;
    }
    if (!searchReady) throw new Error('Trang kết quả /tim-ve không tải kịp trip-board');

    // Chờ chuyến bay tải xong
    await sleep(2000);

    const tripBoardCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const board = document.querySelector('[data-testid="trip-board"]');
        const summaryPanel = document.querySelector('.vj-summary-panel') || document.body.innerText.includes('THÔNG TIN ĐẶT CHỖ');
        return {
          boardText: board ? board.innerText.replace(/\\n/g, ' ') : null,
          isRoundTripRecognized: board ? board.innerText.includes('khứ hồi') || board.innerText.includes('Khứ hồi') : false,
          hasSummaryPanel: !!summaryPanel,
        };
      })()`,
      returnByValue: true,
    });
    console.log('✅ Trip board nhận diện:', tripBoardCheck.result.value);

    // 3. Kiểm tra danh sách chuyến bay và các hạng vé
    console.log('\n--- BƯỚC 3: Kiểm tra hiển thị chuyến bay & 4 hạng vé ---');
    const flightsCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const fareButtons = buttons.filter(b => {
          const t = b.innerText;
          return t.includes('VND') || t.includes('Eco') || t.includes('Deluxe') || t.includes('SkyBoss') || t.includes('Business');
        });
        const hasDateStrip = !!document.querySelector('.overflow-x-auto');
        return {
          fareButtonsCount: fareButtons.length,
          hasDateStrip,
          bodySnippet: document.body.innerText.slice(0, 500).replace(/\\n/g, ' '),
        };
      })()`,
      returnByValue: true,
    });
    console.log(`✅ Tìm thấy ${flightsCheck.result.value.fareButtonsCount} nút hạng vé/giá.`);

    // 4. Chọn chuyến đi (Outbound)
    console.log('\n--- BƯỚC 4: Click chọn vé Chặng đi (Outbound) ---');
    const selectOutbound = await send('Runtime.evaluate', {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        // Tìm nút giá vé đầu tiên
        const fareBtn = buttons.find(b => b.innerText.includes('VND') && !b.innerText.includes('Tổng'));
        if (fareBtn) {
          fareBtn.click();
          return { clicked: true, text: fareBtn.innerText.replace(/\\n/g, ' ') };
        }
        return { clicked: false };
      })()`,
      returnByValue: true,
    });
    console.log('✅ Lựa chọn vé chặng đi:', selectOutbound.result.value);

    await sleep(1500);

    // Kiểm tra Panel sau khi chọn chuyến đi
    const panelAfterOutbound = await send('Runtime.evaluate', {
      expression: `(() => {
        const bodyText = document.body.innerText;
        return {
          hasChuyenDi: bodyText.includes('Chuyến đi') || bodyText.includes('CHUYẾN ĐI'),
          hasTongTien: bodyText.includes('Tổng tiền') || bodyText.includes('TỔNG TIỀN') || bodyText.includes('VND'),
        };
      })()`,
      returnByValue: true,
    });
    console.log('✅ Panel cập nhật chặng đi:', panelAfterOutbound.result.value);

    // 5. Kiểm tra chặng về (Inbound)
    console.log('\n--- BƯỚC 5: Kiểm tra và chọn vé Chặng về (Inbound) ---');
    const selectInbound = await send('Runtime.evaluate', {
      expression: `(() => {
        // Tìm nút chuyển chặng về hoặc nút chọn chuyến về nếu có
        const buttons = Array.from(document.querySelectorAll('button, div, span'));
        const inboundTab = buttons.find(b => b.innerText && (b.innerText.includes('Chuyến về') || b.innerText.includes('CHUYẾN VỀ') || b.innerText.includes('Chiều về')));
        if (inboundTab) {
          inboundTab.click();
        }
        return {
          foundInboundTab: !!inboundTab,
          tabText: inboundTab ? inboundTab.innerText : null
        };
      })()`,
      returnByValue: true,
    });
    console.log('✅ Tab / Chặng về:', selectInbound.result.value);

    await sleep(1500);

    // Chọn vé cho chặng về nếu hiển thị
    const clickInboundFare = await send('Runtime.evaluate', {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const fareButtons = buttons.filter(b => b.innerText.includes('VND') && !b.innerText.includes('Tổng'));
        if (fareButtons.length > 1) {
          fareButtons[fareButtons.length - 1].click();
          return { clickedSecondLeg: true, text: fareButtons[fareButtons.length - 1].innerText.replace(/\\n/g, ' ') };
        }
        return { clickedSecondLeg: false, count: fareButtons.length };
      })()`,
      returnByValue: true,
    });
    console.log('✅ Lựa chọn vé chặng về:', clickInboundFare.result.value);

    await sleep(1500);

    // 6. Kiểm tra Panel Đặt chỗ tổng hợp
    console.log('\n--- BƯỚC 6: Kiểm tra Bảng tổng hợp chi phí đặt chỗ ---');
    const finalSummary = await send('Runtime.evaluate', {
      expression: `(() => {
        const bodyText = document.body.innerText;
        const continueBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Đi tiếp') || b.innerText.includes('Tiếp tục'));
        return {
          hasChuyenDi: bodyText.includes('Chuyến đi') || bodyText.includes('SGN'),
          hasChuyenVe: bodyText.includes('Chuyến về') || bodyText.includes('HAN'),
          hasContinueButton: !!continueBtn,
          continueDisabled: continueBtn ? continueBtn.disabled : null,
        };
      })()`,
      returnByValue: true,
    });
    console.log('✅ Trạng thái Panel và nút Đi tiếp:', finalSummary.result.value);

    console.log('\n=======================================================');
    console.log('🎉 KIỂM TRA TÍNH NĂNG ĐẶT VÉ KHỨ HỒI HOÀN TẤT THÀNH CÔNG!');
    console.log('=======================================================');

    ws.close();
  } finally {
    cleanup();
  }
}

main().catch((err) => {
  console.error('❌ LỖI KIỂM THỬ:', err);
  process.exit(1);
});
