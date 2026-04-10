require('dotenv').config({path: '.env.local'});
const { Client } = require('@neondatabase/serverless');
const fs = require('fs');

async function run() {
  const client = new Client(process.env.DATABASE_URL);
  await client.connect();

  console.log('--- Database Update Started ---');
  
  try {
    const schemaSql = fs.readFileSync('migrations/000_core_schema.sql', 'utf8');
    await client.query(schemaSql);
    console.log('✓ Core schema reconstruction successful.');

    // Elevate admin user to super_admin to fix 403s
    await client.query(
      "UPDATE user_profiles SET role = 'super_admin' WHERE email = 'admin@vietjetsim.vn'"
    );
    console.log('✓ Elevated admin@vietjetsim.vn to super_admin.');

    // --- Seeding Data ---
    console.log('--- Seeding Sample Data ---');

    // 1. Airports
    const airports = [
      ['HAN', 'Noi Bai Intl', 'Hanoi', 'Vietnam'],
      ['SGN', 'Tan Son Nhat Intl', 'Ho Chi Minh City', 'Vietnam'],
      ['DAD', 'Da Nang Intl', 'Da Nang', 'Vietnam'],
      ['PQC', 'Phu Quoc Intl', 'Phu Quoc', 'Vietnam'],
      ['CXR', 'Cam Ranh Intl', 'Nha Trang', 'Vietnam'],
      ['HPH', 'Cat Bi Intl', 'Hai Phong', 'Vietnam'],
      ['UIH', 'Phu Cat', 'Qui Nhon', 'Vietnam'],
      ['VCA', 'Can Tho Intl', 'Can Tho', 'Vietnam']
    ];

    for (const [code, name, city, country] of airports) {
      await client.query(
        'INSERT INTO airports (code, name, city, country) VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO NOTHING',
        [code, name, city, country]
      );
    }
    console.log(`✓ Seeded ${airports.length} airports.`);

    // 2. Announcements
    const announcements = [
      ['Khuyến mãi chào hè', 'Giảm giá 20% cho các chuyến bay đi Phú Quốc.', 'promotion', 'all'],
      ['Bảo trì hệ thống', 'Hệ thống sẽ bảo trì vào lúc 2h sáng chủ nhật.', 'system', 'all'],
      ['Quy định hành lý mới', 'VietjetSim cập nhật quy định hành lý ký gửi.', 'info', 'all']
    ];

    for (const [title, content, type, role] of announcements) {
      await client.query(
        'INSERT INTO announcements (title, content, type, target_role, is_active) VALUES ($1, $2, $3, $4, true)',
        [title, content, type, role]
      );
    }
    console.log('✓ Seeded sample announcements.');

    // 3. Flights (Check if flights exist, if not seed)
    const flightCheck = await client.query('SELECT COUNT(*) as count FROM flights');
    if (parseInt(flightCheck.rows[0].count) < 10) {
        const flightNumbers = ['VJ123', 'VJ456', 'VJ789', 'VJ101', 'VJ202', 'VJ303', 'VJ404', 'VJ505'];
        const classes = ['economy', 'business'];
        let flightCount = 0;

        for (let i = 0; i < 50; i++) {
            const from = airports[Math.floor(Math.random() * airports.length)][0];
            let to = airports[Math.floor(Math.random() * airports.length)][0];
            while (to === from) to = airports[Math.floor(Math.random() * airports.length)][0];
            
            const fNo = flightNumbers[Math.floor(Math.random() * flightNumbers.length)] + '-' + (1000 + i);
            const depart = new Date();
            depart.setDate(depart.getDate() + Math.floor(Math.random() * 30));
            depart.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
            const arrive = new Date(depart.getTime() + (1.5 + Math.random() * 3) * 3600000);
            const fClass = classes[Math.floor(Math.random() * classes.length)];
            const price = fClass === 'business' ? (2000000 + Math.random() * 3000000) : (500000 + Math.random() * 1000000);
            
            await client.query(
                `INSERT INTO flights (flight_no, from_code, to_code, depart_time, arrive_time, price, class, available) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [fNo, from, to, depart.toISOString(), arrive.toISOString(), Math.round(price), fClass, 180]
            );
            flightCount++;
        }
        console.log(`✓ Seeded ${flightCount} sample flights.`);
    }

    console.log('--- Database Update Completed Successfully ---');
  } catch (err) {
    console.error('CRITICAL ERROR during update:', err);
  } finally {
    await client.end();
  }
}

run();
