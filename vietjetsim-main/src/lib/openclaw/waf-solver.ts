/**
 * WAF Token Extractor for Vietjet Air
 *
 * Sử dụng Puppeteer-core kết nối với Google Chrome hệ thống để tự động
 * vượt qua AWS WAF Challenge và trích xuất cookie `aws-waf-token`.
 */

import puppeteer from 'puppeteer-core';
import fs from 'fs';
import { sql } from '@/lib/neon';

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/var/www/vietjet/chrome-bin/chrome/linux-155.0.8059.84/chrome-linux64/chrome',
  '/usr/local/bin/google-chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];

export function findSystemChromePath(): string | null {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const WAF_CACHE_KEY = 'vietjet_auto_waf_token';

/** Lấy token đã lưu trong DB (nếu chưa quá hạn) */
export async function getCachedWafToken(): Promise<string | null> {
  try {
    const rows = await sql`
      SELECT value, updated_at FROM system_config WHERE key = ${WAF_CACHE_KEY} LIMIT 1
    `;
    if (Array.isArray(rows) && rows.length > 0 && rows[0].value) {
      const updatedAt = new Date(rows[0].updated_at).getTime();
      // Token thường sống được khoảng 4 tiếng, cho hết hạn sau 2 tiếng để an toàn
      if (Date.now() - updatedAt < 2 * 3600 * 1000) {
        return rows[0].value;
      }
    }
  } catch (err) {
    console.error('Lỗi đọc cached WAF token:', err);
  }
  return null;
}

/** Lưu token mới vào DB */
export async function saveCachedWafToken(token: string): Promise<void> {
  try {
    await sql`
      INSERT INTO system_config (key, value, description, updated_at)
      VALUES (${WAF_CACHE_KEY}, ${token}, 'Token AWS WAF tự động lấy từ Headless Chrome', NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;
  } catch (err) {
    console.error('Lỗi lưu cached WAF token:', err);
  }
}

/**
 * Mở Headless Chrome để giải mã AWS WAF và trích xuất `aws-waf-token`
 */
export async function fetchFreshWafToken(): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  const chromePath = findSystemChromePath();
  if (!chromePath) {
    return {
      success: false,
      error:
        'Không tìm thấy Google Chrome hoặc Chromium trên máy chủ. Hãy cài Chrome hoặc đặt biến môi trường CHROME_BIN.',
    };
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1280,800',
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
    );

    // Mở trang Vietjet để nhận thử thách WAF
    await page.goto('https://www.vietjetair.com/vi', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Chờ 3 giây để script AWS WAF challenge thực thi và cấp cookie
    let token: string | null = null;
    for (let i = 0; i < 5; i++) {
      const cookies = await page.cookies();
      const wafCookie = cookies.find((c) => c.name === 'aws-waf-token');
      if (wafCookie && wafCookie.value) {
        token = wafCookie.value;
        break;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    if (token) {
      await saveCachedWafToken(token);
      return { success: true, token };
    }

    return {
      success: false,
      error: 'Đã truy cập website nhưng không tìm thấy cookie aws-waf-token trong phiên duyệt.',
    };
  } catch (err) {
    console.error('Lỗi khi chạy headless browser lấy WAF token:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Lỗi không xác định khi chạy trình duyệt',
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * Lấy token có sẵn trong cache hoặc tự động kích hoạt Chrome để lấy mới
 */
export async function getOrRefreshWafToken(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh) {
    const cached = await getCachedWafToken();
    if (cached) return cached;
  }

  const result = await fetchFreshWafToken();
  if (result.success && result.token) {
    return result.token;
  }
  return null;
}
