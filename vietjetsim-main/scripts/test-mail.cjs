#!/usr/bin/env node
/**
 * Gui email test qua SMTP cau hinh trong .env.local (cung thu tu Next.js:
 * .env.local truoc, roi .env). Dung de xac nhan App Password / Resend API key
 * truoc khi dua vao luong dat ve.
 *
 *   node scripts/test-mail.cjs [to@domain]
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
require('dotenv').config();

const nodemailer = require('nodemailer');

const to = process.argv[2] || process.env.MAIL_TEST_TO || 'bookbooking@vietjet.shop';
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.error('Thieu SMTP_HOST / SMTP_USER / SMTP_PASS trong .env.local');
  process.exit(1);
}

const port = Number(SMTP_PORT || 587);
const tx = nodemailer.createTransport({
  host: SMTP_HOST,
  port,
  secure: port === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

tx.sendMail({
  from: process.env.MAIL_FROM || SMTP_USER,
  to,
  replyTo: process.env.MAIL_REPLY_TO,
  subject: '[Test] Vietjet Mail — ' + new Date().toISOString(),
  html: '<p>Gui thanh cong tu <b>vietjet.shop</b>.</p>',
  text: 'Gui thanh cong tu vietjet.shop.',
})
  .then((info) => {
    console.log('OK — messageId:', info.response);
    process.exit(0);
  })
  .catch((err) => {
    console.error('FAIL:', err.message);
    process.exit(1);
  });
