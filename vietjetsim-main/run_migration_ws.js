const { neonConfig, Client } = require('@neondatabase/serverless');
const ws = require('ws');
neonConfig.webSocketConstructor = ws;
neonConfig.pipelineConnect = 'password';
const fs = require('fs');

const url = process.env.DATABASE_URL;
if (!url) { console.error('Thieu DATABASE_URL'); process.exit(1); }

// Tach statement co ban: do sau $n luon chan (even), semicolon ngoai $${}'s = ket thuc
function splitSql(text) {
  const out = [];
  let cur = '', i = 0; const stack = [];
  while (i < text.length) {
    if (text[i] === '$') {
      const m = /^\$[a-zA-Z_]*\$/.exec(text.slice(i));
      if (m) {
        const top = stack[stack.length - 1];
        if (!top) stack.push(m[0]);
        else if (m[0] === top) stack.pop();
        else stack.push(m[0]); // tag long moi ben trong
        cur += m[0]; i += m[0].length; continue;
      }
    }
    if (text[i] === ';' && stack.length === 0) { if (cur.trim()) out.push(cur.trim()); cur = ''; i++; continue; }
    cur += text[i]; i++;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

(async () => {
  const client = new Client(url);
  const t = setTimeout(() => { console.error('TIMEOUT ket noi'); process.exit(2); }, 30000);
  await client.connect();
  clearTimeout(t);
  console.log('Da ket noi Neon');
  for (const file of ['migrations/011_checkin_system.sql', 'migrations/012_add_booking_code.sql']) {
    console.log('=== ' + file + ' ===');
    const statements = splitSql(fs.readFileSync(file, 'utf8'));
    let ok = 0, skipped = 0;
    for (const stmt of statements) {
      try { await client.query(stmt); ok++; }
      catch (e) {
        const msg = String(e.message || e);
        if (/already exists|duplicate/i.test(msg)) { skipped++; continue; }
        console.error('  LOI: ' + msg.slice(0, 180));
        console.error('  @ ' + stmt.slice(0, 100).replace(/\n/g, ' '));
        process.exitCode = 1;
      }
    }
    console.log('  OK:' + ok + ' bo-qua:' + skipped);
  }
  const r = await client.query("SELECT to_regclass('public.check_in') t, (SELECT count(*) FROM information_schema.columns WHERE table_name='bookings' AND column_name='booking_code') c");
  console.log('check_in=' + (r.rows[0].t ? 'TON TAI' : 'THIEU') + ' | booking_code=' + (r.rows[0].c > 0 ? 'TON TAI' : 'THIEU'));
  await client.end();
  console.log('XONG');
})().catch(e => { console.error('FATAL: ' + (e.message || e)); process.exit(1); });
