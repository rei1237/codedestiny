const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const fs   = require('fs');
const cron = require('node-cron');
const connectDB = require('../config/db');
const DailyFortuneSubscription = require('../models/DailyFortuneSubscription');
const { buildUnsubscribeUrl } = require('../utils/subscription-link');
const { buildDailyHtml, buildMonthlyHtml } = require('../utils/fortune-email-builder');

function kstTodayString() {
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  return kst.toISOString().slice(0, 10);
}
function kstYearMonth() {
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  return kst.toISOString().slice(0, 7);
}
function loadFortuneData(dateStr) {
  const p = path.resolve(__dirname, '..', '..', 'fortune', 'data', 'daily-' + dateStr + '.json');
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; }
}
function loadLatestFortuneData() {
  const today = loadFortuneData(kstTodayString());
  if (today) return today;
  const dir = path.resolve(__dirname, '..', '..', 'fortune', 'data');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter(f => /^daily-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort()
    .reverse();
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (data && data.date) return data;
    } catch (_) {}
  }
  return null;
}

async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.EMAILAPI_KEY;
  if (!apiKey) {
    throw new Error('Resend API 키(EMAILAPI_KEY)가 설정되지 않았습니다.');
  }
  const payload = {
    from: 'Code Destiny <admin@code-destiny.com>',
    to: Array.isArray(to) ? to : [to],
    subject,
    html: html || '<pre>' + (text || '') + '</pre>',
  };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error('[Resend] ' + (data.message || JSON.stringify(data)));
  }
}

async function getDailyRecipients() {
  const docs = await DailyFortuneSubscription.find({ isActive: true, subDaily: true })
    .select('email birthYear')
    .lean();
  return docs
    .map(d => ({ email: String(d.email || ''), birthYear: d.birthYear || null }))
    .filter(d => d.email);
}

async function getMonthlyRecipients() {
  const docs = await DailyFortuneSubscription.find({ isActive: true, subMonthly: true })
    .select('email birthYear')
    .lean();
  return docs
    .map(d => ({ email: String(d.email || ''), birthYear: d.birthYear || null }))
    .filter(d => d.email);
}

async function markSentAt(email) {
  if (!email) return;
  await DailyFortuneSubscription.updateOne(
    { email: String(email).trim().toLowerCase() },
    { $set: { lastSentAt: new Date() } }
  );
}

// ─── 일일 운세 발송 (매일 07:30 KST) ──────────────────────────────────────
cron.schedule('30 7 * * *', async () => {
  console.log('[daily-cron] 일일 운세 이메일 발송 시작...');
  try {
    const fortune = loadLatestFortuneData();
    if (!fortune) {
      console.warn('[daily-cron] 운세 데이터 파일이 없습니다.');
      return;
    }
    const recipients = await getDailyRecipients();
    if (!recipients.length) {
      console.log('[daily-cron] 일일 구독자 없음.');
      return;
    }
    const dateStr  = fortune.date || kstTodayString();
    const subject  = dateStr + ' 오늘의 운세 — CODE DESTINY';
    let ok = 0;
    for (const { email, birthYear } of recipients) {
      try {
        const html = buildDailyHtml({
          fortune,
          email,
          birthYear,
          unsubscribeUrl: buildUnsubscribeUrl(email),
        });
        await sendEmail({ to: email, subject, html });
        await markSentAt(email);
        ok++;
      } catch (e) {
        console.error('[daily-cron] 발송 실패 (' + email + '):', e.message);
      }
    }
    console.log('[daily-cron] 완료: ' + ok + '/' + recipients.length);
  } catch (e) {
    console.error('[daily-cron] 오류:', e.message);
  }
}, { timezone: 'Asia/Seoul' });

// ─── 월별 운세 발송 (매달 1일 08:00 KST) ────────────────────────────────
cron.schedule('0 8 1 * *', async () => {
  console.log('[monthly-cron] 월별 운세 이메일 발송 시작...');
  try {
    const ym       = kstYearMonth();
    const fortune  = loadFortuneData(ym + '-01') || loadLatestFortuneData();
    const recipients = await getMonthlyRecipients();
    if (!recipients.length) {
      console.log('[monthly-cron] 월별 구독자 없음.');
      return;
    }
    const subject = ym + ' 이달의 운세 — CODE DESTINY';
    let ok = 0;
    for (const { email, birthYear } of recipients) {
      try {
        const html = buildMonthlyHtml({
          fortune,
          email,
          birthYear,
          unsubscribeUrl: buildUnsubscribeUrl(email),
          yearMonth: ym,
        });
        await sendEmail({ to: email, subject, html });
        await markSentAt(email);
        ok++;
      } catch (e) {
        console.error('[monthly-cron] 발송 실패 (' + email + '):', e.message);
      }
    }
    console.log('[monthly-cron] 완료: ' + ok + '/' + recipients.length);
  } catch (e) {
    console.error('[monthly-cron] 오류:', e.message);
  }
}, { timezone: 'Asia/Seoul' });

connectDB()
  .then(() => console.log('daily-content cron 시작됨 (Asia/Seoul 07:30 / 매달 1일 08:00)'))
  .catch(e => { console.error('DB 연결 실패:', e.message); process.exit(1); });
