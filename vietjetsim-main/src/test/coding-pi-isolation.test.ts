/**
 * Coding Pi — khoá API không được lọt vào bundle của trình duyệt.
 *
 * `NVIDIA_API_KEY` chỉ nằm ở server. Phần client (feature `coding-pi`, mọi
 * component trong `src/app`, `src/shared`) chỉ được import phần thuần —
 * `@/lib/coding-pi/protocol` và `@/lib/coding-pi/stream`.
 *
 * Import thẳng tệp server-only (`config.ts`, `provider.ts`, `service.ts`) hoặc
 * import barrel `@/lib/coding-pi` sẽ kéo `process.env` vào bundle: khoá
 * không còn là khoá nữa mà là một chuỗi trong file JavaScript tải về.
 *
 * Test đọc mã nguồn thay vì build, vì build không báo "tệp này không được
 * import" — nó chỉ âm thầm gộp khoá vào bundle.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();

/** Thư mục chạy trong trình duyệt. `src/app/api` là route server-side. */
const CLIENT_ROOTS = ['src/features', 'src/shared', 'src/app'] as const;

const SERVER_ONLY_DIR = 'api';

/** Tệp server-only: đọc `process.env` hoặc giữ khoá API. */
const SERVER_ONLY_MODULES = [
  '@/lib/coding-pi',
  '@/lib/coding-pi/config',
  '@/lib/coding-pi/provider',
  '@/lib/coding-pi/service',
] as const;

function collectFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Route trong `src/app/api` chạy ở server nên được phép import khoá.
      if (dir.endsWith('src/app') && entry.name === SERVER_ONLY_DIR) continue;
      collectFiles(path, files);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name)) files.push(path);
  }
  return files;
}

function clientFiles(): string[] {
  const files: string[] = [];
  for (const root of CLIENT_ROOTS) {
    collectFiles(join(ROOT, root), files);
  }
  return files;
}

describe('Coding Pi: khoá API không lọt vào phía trình duyệt', () => {
  it('có tệp client để quét', () => {
    expect(clientFiles().length).toBeGreaterThan(0);
  });

  it('không tệp phía trình duyệt nào import tầng server-only của Coding Pi', () => {
    const offenders: string[] = [];

    for (const file of clientFiles()) {
      const source = readFileSync(file, 'utf8');
      for (const serverModule of SERVER_ONLY_MODULES) {
        // Bỏ qua `provider`/`service` của feature khác: chỉ so khớp chính xác
        // tới đường dẫn Coding Pi.
        const pattern = new RegExp(
          `from ['"]${serverModule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`
        );
        if (pattern.test(source)) {
          offenders.push(`${relative(ROOT, file)} → ${serverModule}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('mọi import của lib/coding-pi trong phía client chỉ tới phần thuần', () => {
    const allowed = new Set(['@/lib/coding-pi/protocol', '@/lib/coding-pi/stream']);
    const offenders: string[] = [];

    for (const file of clientFiles()) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/from ['"](@\/lib\/coding-pi[^'"]*)['"]/g)) {
        if (!allowed.has(match[1])) {
          offenders.push(`${relative(ROOT, file)} → ${match[1]}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
