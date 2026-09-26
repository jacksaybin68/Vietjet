import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const APP_DIR = join(process.cwd(), 'src', 'app');

function nestedLayouts(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(dir, entry.name, 'layout.tsx'))
    .filter((path) => {
      try {
        readFileSync(path);
        return true;
      } catch {
        return false;
      }
    });
}

describe('page metadata titles', () => {
  // The root layout sets `template: '%s | Vietjet Air'`, so a route that also
  // spells the brand in its own title renders it twice. This shipped as
  // "Dang nhap / Dang ky - Vietjet Air | Vietjet Air" until it was caught.
  it('does not repeat the brand in nested route titles', () => {
    const offenders = nestedLayouts(APP_DIR).filter((path) =>
      /title:\s*['"`][^'"`]*Vietjet Air/.test(readFileSync(path, 'utf-8'))
    );

    expect(offenders.map((path) => path.replace(APP_DIR, ''))).toEqual([]);
  });
});
