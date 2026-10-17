/**
 * Background Auto-Sync Scheduler for OpenClaw
 *
 * Tự động đồng bộ dữ liệu Vietjet định kỳ:
 * 1. Tự động cập nhật mạng lưới sân bay (CMS) định kỳ (mặc định mỗi 24 giờ).
 * 2. Tự động thu thập & cập nhật lịch bay các chặng trọng điểm (HAN-SGN, DAD, PQC...)
 *    cho N ngày tới mà không cần admin phải ra lệnh thủ công mỗi ngày.
 * 3. Hỗ trợ kích hoạt on-demand hoặc qua cron worker.
 */

import { collectVietjetNetwork } from '@/lib/openclaw/web-collection';
import { collectVietjetSchedule, importWebFlights } from '@/lib/openclaw/web-collection';
import { sql } from '@/lib/neon';
import { todayInVietnam } from '@/lib/openclaw/flight-researcher';
import { addDateDays } from '@/lib/utils';

export interface AutoSyncConfig {
  enabled: boolean;
  networkIntervalHours: number; // Mặc định 24h
  scheduleDaysAhead: number; // Thu thập trước N ngày (vd: 3 ngày)
  keyRoutes: Array<{ from: string; to: string }>;
  autoImport: boolean;
  lastNetworkSync?: string;
  lastScheduleSync?: string;
}

export const DEFAULT_AUTO_SYNC_CONFIG: AutoSyncConfig = {
  enabled: true,
  networkIntervalHours: 24,
  scheduleDaysAhead: 3,
  keyRoutes: [
    { from: 'HAN', to: 'SGN' },
    { from: 'SGN', to: 'HAN' },
    { from: 'HAN', to: 'DAD' },
    { from: 'DAD', to: 'HAN' },
    { from: 'SGN', to: 'DAD' },
    { from: 'SGN', to: 'PQC' },
  ],
  autoImport: true,
};

const CONFIG_KEY = 'openclaw_auto_sync_config';

/** Lấy cấu hình tự động hóa từ DB system_config */
export async function getAutoSyncConfig(): Promise<AutoSyncConfig> {
  try {
    const rows = await sql`
      SELECT value FROM system_config WHERE key = ${CONFIG_KEY} LIMIT 1
    `;
    if (Array.isArray(rows) && rows.length > 0 && rows[0].value) {
      const parsed = JSON.parse(rows[0].value);
      return { ...DEFAULT_AUTO_SYNC_CONFIG, ...parsed };
    }
  } catch (err) {
    console.error('Lỗi đọc auto_sync_config:', err);
  }
  return DEFAULT_AUTO_SYNC_CONFIG;
}

/** Lưu cấu hình tự động hóa vào DB system_config */
export async function saveAutoSyncConfig(config: Partial<AutoSyncConfig>): Promise<AutoSyncConfig> {
  const current = await getAutoSyncConfig();
  const updated = { ...current, ...config };
  await sql`
    INSERT INTO system_config (key, value, description, updated_at)
    VALUES (
      ${CONFIG_KEY},
      ${JSON.stringify(updated)},
      'Cấu hình tự động đồng bộ dữ liệu Vietjet Air (OpenClaw Auto-Sync)',
      NOW()
    )
    ON CONFLICT (key)
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
  return updated;
}

export interface AutoSyncRunReport {
  network: {
    status: 'skipped' | 'success' | 'error';
    airportsAdded?: number;
    totalAirports?: number;
    error?: string;
  };
  schedule: {
    status: 'skipped' | 'success' | 'partial' | 'error';
    totalCombos: number;
    successfulCombos: number;
    importedFlights: number;
    skippedFlights: number;
    details: Array<{ route: string; date: string; count: number; imported: number }>;
    error?: string;
  };
  executedAt: string;
}

/**
 * Thực thi một chu kỳ tự động đồng bộ
 */
export async function runAutoSync(force = false): Promise<AutoSyncRunReport> {
  const config = await getAutoSyncConfig();
  const report: AutoSyncRunReport = {
    network: { status: 'skipped' },
    schedule: {
      status: 'skipped',
      totalCombos: 0,
      successfulCombos: 0,
      importedFlights: 0,
      skippedFlights: 0,
      details: [],
    },
    executedAt: new Date().toISOString(),
  };

  if (!config.enabled && !force) {
    return report;
  }

  // 1. Tự động đồng bộ sân bay/mạng lưới nếu đã quá hạn
  const now = Date.now();
  const lastNet = config.lastNetworkSync ? new Date(config.lastNetworkSync).getTime() : 0;
  const netDue = force || now - lastNet >= config.networkIntervalHours * 3600 * 1000;

  if (netDue) {
    try {
      const net = await collectVietjetNetwork();
      // Đọc các sân bay hiện có
      const existingRows = await sql`SELECT UPPER(code) as code FROM airports`;
      const existingCodes = new Set(existingRows.map((r: { code: string }) => r.code));
      let added = 0;

      for (const ap of net.airports) {
        const code = ap.code.toUpperCase();
        if (!existingCodes.has(code)) {
          await sql`
            INSERT INTO airports (code, name, city, country)
            VALUES (${code}, ${ap.name}, ${ap.city}, 'Vietnam')
            ON CONFLICT (code) DO NOTHING
          `;
          added++;
        }
      }

      report.network = {
        status: 'success',
        airportsAdded: added,
        totalAirports: net.airports.length,
      };
      await saveAutoSyncConfig({ lastNetworkSync: new Date().toISOString() });
    } catch (err) {
      console.error('AutoSync Network Error:', err);
      report.network = {
        status: 'error',
        error: err instanceof Error ? err.message : 'Lỗi mạng khi thu thập CMS',
      };
    }
  }

  // 2. Tự động thu thập lịch bay cho N ngày tới của các keyRoutes
  const today = todayInVietnam();
  const datesToCollect: string[] = [];
  for (let i = 0; i < config.scheduleDaysAhead; i++) {
    datesToCollect.push(addDateDays(today, i));
  }

  const combos: Array<{ from: string; to: string; date: string }> = [];
  for (const r of config.keyRoutes) {
    for (const d of datesToCollect) {
      combos.push({ from: r.from, to: r.to, date: d });
    }
  }

  report.schedule.totalCombos = combos.length;
  let totalImported = 0;
  let totalSkipped = 0;
  let successCount = 0;

  for (const item of combos) {
    try {
      const res = await collectVietjetSchedule(item.from, item.to, item.date);
      if (res.reachable) {
        successCount++;
        let impCount = 0;
        if (config.autoImport && res.flights.length > 0) {
          const impRes = await importWebFlights(
            { from: item.from, to: item.to },
            item.date,
            res.flights
          );
          impCount = impRes.imported.length;
          totalImported += impCount;
          totalSkipped += impRes.skipped.length;
        }
        report.schedule.details.push({
          route: `${item.from}-${item.to}`,
          date: item.date,
          count: res.flights.length,
          imported: impCount,
        });
      }
    } catch {
      // bỏ qua từng cặp nếu lỗi mạng hoặc WAF để tiếp tục các cặp khác
    }
  }

  report.schedule.successfulCombos = successCount;
  report.schedule.importedFlights = totalImported;
  report.schedule.skippedFlights = totalSkipped;
  report.schedule.status =
    successCount === combos.length ? 'success' : successCount > 0 ? 'partial' : 'error';

  await saveAutoSyncConfig({ lastScheduleSync: new Date().toISOString() });

  return report;
}
