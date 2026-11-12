#!/usr/bin/env node
/**
 * Test script to verify realtime sync and seat locks end-to-end
 */
const { neon } = require('@neondatabase/serverless');
const { resolveDatabaseUrl } = require('./db-target.cjs');

async function main() {
  console.log('🧪 Starting Realtime Sync & Seat Lock Verification...\n');
  const databaseUrl = resolveDatabaseUrl(process.argv);
  const sql = neon(databaseUrl);

  // 1. Pick a flight
  const flights = await sql`SELECT id, flight_no, status FROM flights LIMIT 1`;
  if (flights.length === 0) {
    throw new Error('No flights found in database');
  }
  const flight = flights[0];
  console.log(`✈️  Testing with Flight: ${flight.flight_no} (ID: ${flight.id}, Current Status: ${flight.status})`);

  // 2. Test Seat Lock Insertion (simulation of POST /api/ghe/khoa)
  const testSeat = '15E';
  const testSession = 'test-session-' + Date.now();
  console.log(`\n🔒 Locking seat ${testSeat} for session ${testSession}...`);

  await sql`
    INSERT INTO seat_locks (flight_id, seat_number, session_id, expires_at)
    VALUES (${flight.id}, ${testSeat}, ${testSession}, NOW() + INTERVAL '10 minutes')
    ON CONFLICT (flight_id, seat_number)
    DO UPDATE SET
      session_id = EXCLUDED.session_id,
      expires_at = EXCLUDED.expires_at
  `;
  console.log('✅ Seat lock inserted.');

  // 3. Test SSE Seat Map Query (as run in /api/sse/ghe-ngoi)
  console.log('\n📡 Testing /api/sse/ghe-ngoi DB query...');
  const activeLocks = await sql`
    SELECT seat_number, expires_at
    FROM seat_locks
    WHERE flight_id = ${flight.id}
      AND expires_at > NOW()
  `;
  console.log(`Active locks found: ${activeLocks.length}`);
  const hasOurSeat = activeLocks.some((l) => l.seat_number === testSeat);
  if (!hasOurSeat) {
    throw new Error(`Expected seat ${testSeat} to be locked in query results!`);
  }
  console.log(`✅ Verified: Seat ${testSeat} is visible in active locks for realtime SSE push.`);

  // 4. Test Seat Unlock (simulation of DELETE /api/ghe/khoa)
  console.log(`\n🔓 Unlocking seat ${testSeat}...`);
  await sql`
    DELETE FROM seat_locks
    WHERE flight_id = ${flight.id}
      AND seat_number = ${testSeat}
      AND session_id = ${testSession}
  `;
  const afterUnlock = await sql`
    SELECT seat_number
    FROM seat_locks
    WHERE flight_id = ${flight.id}
      AND seat_number = ${testSeat}
      AND expires_at > NOW()
  `;
  if (afterUnlock.length > 0) {
    throw new Error(`Seat ${testSeat} was not properly unlocked!`);
  }
  console.log(`✅ Verified: Seat ${testSeat} has been unlocked and cleared.`);

  // 5. Test Flight Status retrieval (as run in /api/sse/trang-thai-chuyen-bay)
  console.log('\n📡 Testing /api/sse/trang-thai-chuyen-bay DB query...');
  const flightQuery = await sql`
    SELECT id, flight_no, status, depart_time, arrive_time, updated_at
    FROM flights
    WHERE id = ${flight.id}
  `;
  if (flightQuery.length === 0) {
    throw new Error('Flight not retrieved');
  }
  console.log(`✅ Verified: Flight status query returned status="${flightQuery[0].status}" for ${flightQuery[0].flight_no}`);

  console.log('\n🎉 ALL REALTIME SYNC & SEAT LOCK TESTS PASSED SUCCESSFULLY!\n');
}

main().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});

