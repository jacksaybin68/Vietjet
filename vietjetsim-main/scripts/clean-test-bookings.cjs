#!/usr/bin/env node
/**
 * Remove test bookings created while verifying the booking flow.
 * Run: node scripts/clean-test-bookings.cjs                       (dry run — lists what would go)
 *      node scripts/clean-test-bookings.cjs --apply               (performs the delete)
 *      node scripts/clean-test-bookings.cjs --apply --allow-remote --yes   (remote DB)
 *
 * Targets an explicit list of booking codes rather than a pattern, so the two
 * seeded demo bookings and the one a unit test references (`VJ644052`) can never
 * be caught by accident.
 *
 * `seats.booking_id` is ON DELETE SET NULL, so the seat rows have to be removed
 * by hand: letting the cascade null them would leave reserved-looking rows in
 * the cabin with no booking behind them.
 */

const { neon } = require('@neondatabase/serverless');
const { resolveDatabaseUrl } = require('./db-target.cjs');

const DATABASE_URL = resolveDatabaseUrl();
const APPLY = process.argv.includes('--apply');

/** Booking codes this repo's own verification runs created. */
const TEST_CODES = [
  'VJ564074',
  'VJ325626',
  'VJ335028',
  'VJ140821',
  'VJ257683',
  'VJ531568',
  'VJ018705',
  'VJ361615',
  'VJ353816',
  'VJ082765',
  'VJ444559',
  'VJ999763',
  'VJ395234',
  'VJ199433',
  'VJ538616',
  'VJ326722',
];

async function main() {
  console.log(`🎯 Target database: ${new URL(DATABASE_URL).hostname}`);
  const sql = neon(DATABASE_URL);

  const rows = await sql`
    SELECT id, booking_code, total_price FROM bookings WHERE booking_code = ANY(${TEST_CODES})
  `;
  if (rows.length === 0) {
    console.log('✅ No test bookings found — nothing to do.');
    return;
  }

  console.log(`${APPLY ? 'Removing' : 'Would remove'} ${rows.length} test booking(s):`);
  rows.forEach((r) => console.log(`   ${r.booking_code}   ${r.total_price}`));

  const ids = rows.map((r) => r.id);

  // A loyalty row would block the delete (that FK is NO ACTION). Report instead
  // of silently failing halfway.
  const blocked = await sql`
    SELECT COUNT(*)::int AS n FROM loyalty_transactions WHERE booking_id = ANY(${ids})
  `;
  if (blocked[0].n > 0) {
    console.error(`\n❌ ${blocked[0].n} loyalty_transaction row(s) reference these bookings.`);
    console.error('   Remove them first — the FK is ON DELETE NO ACTION.');
    process.exit(1);
  }

  if (!APPLY) {
    const seats = await sql`SELECT COUNT(*)::int AS n FROM seats WHERE booking_id = ANY(${ids})`;
    console.log(`\nAlso removes ${seats[0].n} seat row(s); the rest cascades.`);
    console.log('Re-run with --apply to perform the delete.');
    return;
  }

  await sql`DELETE FROM seats WHERE booking_id = ANY(${ids})`;
  await sql`DELETE FROM bookings WHERE id = ANY(${ids})`;
  console.log(`\n✅ Removed ${rows.length} booking(s) and their seat rows.`);
}

main().catch((error) => {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
});
