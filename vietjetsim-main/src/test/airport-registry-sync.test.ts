import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { AIRPORT_CITIES } from '@/shared/constants';

/**
 * The `airports` table and the `AIRPORT_CITIES` map have to stay in step.
 *
 * AGENTS.md is explicit that they are two halves of one fact: the table feeds
 * the picker via `/api/san-bay`, while the map feeds every screen that renders
 * a bare code with no join to it (the results step, "My bookings", the
 * dashboard). When a migration adds an airport and forgets the map, the flight
 * books fine and then shows the customer "ICN" instead of "Seoul" — a bug no
 * amount of UI work can hide, because the data is genuinely there and only the
 * display is wrong.
 *
 * jsdom has no database, so the table is read from the migration files
 * themselves: the seeds are the source of truth in this repository, and a
 * migration that inserts an airport is exactly what this must catch.
 */
const MIGRATIONS_DIR = join(process.cwd(), 'migrations');

/** Every airport code inserted by any seed migration, across all files. */
function seededAirportCodes(): string[] {
  const codes = new Set<string>();
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'))) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    // Only the airports INSERT, not the route VALUES lists that also hold codes.
    for (const [, block] of sql.matchAll(
      /INSERT\s+INTO\s+airports\s*\([^)]*\)\s*VALUES([\s\S]*?);/gi
    )) {
      for (const [, code] of block.matchAll(/\(\s*'([A-Z]{3})'\s*,/g)) {
        codes.add(code);
      }
    }
  }
  return [...codes];
}

/**
 * Codes that a later migration deliberately retired.
 *
 * 025 replaced three codes 024 had seeded with the ones those airports actually
 * fly under: DIH -> DIN (Điện Biên Phủ), CXL -> VCL (Chu Lai), RKG -> VKG
 * (Rạch Giá). The old rows are `DELETE`d in the same file, so they are
 * correctly absent from `AIRPORT_CITIES` — a code that appears in a seed but
 * not in the map is only a bug if nothing later removed it.
 */
const RETIRED_CODES = new Set(['DIH', 'CXL', 'RKG']);

describe('airports table and AIRPORT_CITIES stay in step', () => {
  const seeded = seededAirportCodes();
  const live = seeded.filter((code) => !RETIRED_CODES.has(code));

  it('finds the airport seeds at all', () => {
    // A silently empty result would make every assertion below vacuously pass.
    expect(seeded.length).toBeGreaterThan(20);
    expect(seeded).toContain('HAN');
    expect(seeded).toContain('SIN');
  });

  it('maps every live seeded airport to a city name', () => {
    expect(live.filter((code) => !AIRPORT_CITIES[code])).toEqual([]);
  });

  it('does not map a retired code to a city', () => {
    // The wrong entry is worse than a missing one: 025's whole reason for
    // retiring them was that a ticket would print the wrong code.
    expect([...RETIRED_CODES].filter((code) => AIRPORT_CITIES[code])).toEqual([]);
  });

  it('carries the international airports added by 028', () => {
    // Bangkok and Tokyo each have two airports in the table, which is why this
    // is 13 codes for 11 cities.
    for (const code of [
      'SIN',
      'BKK',
      'DMK',
      'KUL',
      'CGK',
      'MNL',
      'PNH',
      'RGN',
      'VTE',
      'ICN',
      'KIX',
      'NRT',
      'HKG',
    ]) {
      expect(AIRPORT_CITIES[code]).toBeTruthy();
    }
    expect(AIRPORT_CITIES.BKK).toBe('Bangkok');
    expect(AIRPORT_CITIES.DMK).toBe('Bangkok');
    expect(AIRPORT_CITIES.KIX).toBe('Osaka');
    expect(AIRPORT_CITIES.NRT).toBe('Tokyo');
  });

  it('keeps Cà Mau (CAH) out while its airport is closed for upgrade', () => {
    // 025 removed it deliberately: it closed in November 2025 for a twelve-month
    // upgrade, so offering it would point a customer at an airport with no
    // service. This pins the decision so a later "just add everything" change
    // has to be a deliberate edit to both this and 025's reasoning.
    expect(seeded).not.toContain('CAH');
    expect(AIRPORT_CITIES.CAH).toBeUndefined();
  });
});
