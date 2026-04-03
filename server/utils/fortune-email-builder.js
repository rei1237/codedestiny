/**
 * fortune-email-builder.js
 * 일일/월별 운세 데이터 JSON → HTML 이메일 본문 생성
 */

const ANIMAL_IDS = ["rat","ox","tiger","rabbit","dragon","snake","horse","goat","monkey","rooster","dog","pig"];
const ANIMAL_KR  = ["쥐(子)","소(丑)","호랑이(寅)","토끼(卯)","용(辰)","뱀(巳)","말(午)","양(未)","원숭이(申)","닭(酉)","개(戌)","돼지(亥)"];
const ANIMAL_EMOJI = ["🐭","🐮","🐯","🐰","🐲","🐍","🐴","🐑","🐵","🐓","🐶","🐷"];

function getBirthAnimalId(birthYear) {
  if (!birthYear || birthYear < 1900) return null;
  const idx = ((birthYear - 4) % 12 + 12) % 12;
  return ANIMAL_IDS[idx];
}

function getAnimalKr(animalId) {
  const i = ANIMAL_IDS.indexOf(animalId);
  return i >= 0 ? ANIMAL_KR[i] : null;
}

function getAnimalEmoji(animalId) {
  const i = ANIMAL_IDS.indexOf(animalId);
  return i >= 0 ? ANIMAL_EMOJI[i] : "🌸";
}

function scoreBar(score, max) {
  const filled  = Math.round((score / max) * 5);
  const circles = [];
  for (let i = 0; i < 5; i++) {
    circles.push(i < filled ? "●" : "○");
  }
  return circles.join(" ");
}

/**
 * 일일 운세 JSON → HTML 이메일 (구독자 birthYear 기반 맞춤)
 */
function buildDailyHtml({ fortune, email, birthYear, unsubscribeUrl }) {
  const animalId = getBirthAnimalId(birthYear);
  const animal   = animalId && fortune.animals ? fortune.animals[animalId] : null;
  const animalKr = animalId ? getAnimalKr(animalId) : null;
  const animalEmoji = animalId ? getAnimalEmoji(animalId) : "🌸";

  const cal   = fortune.calendar || {};
  const sky   = fortune.sky_today || {};
  const ziwei = fortune.ziwei_today || {};
  const sukuyo = fortune.sukuyo_meta || {};
  const panch  = fortune.panchanga_today || {};
  const dateStr = fortune.date || "";

  // 띠별 오늘의 운세
  let animalSection = "";
  if (animal) {
    const scores = animal.score || {};
    const keyword = (animal.keyword  || {}).kr || "";
    const overall  = (animal.overall  || {}).kr || "";
    const love     = (animal.love     || {}).kr || "";
    const money    = (animal.money    || {}).kr || "";
    const health   = (animal.health   || {}).kr || "";
    const work     = (animal.work     || {}).kr || "";
    const advice   = (animal.advice   || {}).kr || "";
    const insight  = animal.saju_insight || "";
    const lucky    = animal.lucky || {};

    animalSection = `
    <div style="background:linear-gradient(135deg,#1a0a2e,#2d1154);border:1px solid rgba(200,150,255,.35);border-radius:16px;padding:24px 20px;margin:0 0 20px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <span style="font-size:2rem;">${animalEmoji}</span>
        <div>
          <div style="color:#e2d5ff;font-size:1rem;font-weight:700;">${animalEmoji} 오늘의 맞춤 운세 — ${animalKr} 띠</div>
          <div style="color:#c4a4ff;font-size:.85rem;margin-top:3px;">키워드: <strong>${keyword}</strong></div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
        <tr><td style="width:60px;color:#9d79d0;font-size:.78rem;padding:3px 0;">종합운</td><td style="color:#fcd262;font-family:monospace;">${scoreBar(scores.overall||7,10)}</td></tr>
        <tr><td style="color:#9d79d0;font-size:.78rem;padding:3px 0;">애정운</td><td style="color:#ff9cc0;font-family:monospace;">${scoreBar(scores.love||7,10)}</td></tr>
        <tr><td style="color:#9d79d0;font-size:.78rem;padding:3px 0;">금전운</td><td style="color:#fcd262;font-family:monospace;">${scoreBar(scores.money||7,10)}</td></tr>
        <tr><td style="color:#9d79d0;font-size:.78rem;padding:3px 0;">건강운</td><td style="color:#6ee7b7;font-family:monospace;">${scoreBar(scores.health||7,10)}</td></tr>
        <tr><td style="color:#9d79d0;font-size:.78rem;padding:3px 0;">직업운</td><td style="color:#93c5fd;font-family:monospace;">${scoreBar(scores.work||7,10)}</td></tr>
      </table>
      ${lucky.color_kr ? `<div style="background:rgba(255,255,255,.06);border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:.82rem;color:#d4c4f7;">🎨 행운 컬러: <strong>${lucky.color_kr}</strong> &nbsp;|&nbsp; 🎯 행운 숫자: <strong>${lucky.number||""}</strong></div>` : ""}
      <div style="background:rgba(255,255,255,.05);border-radius:10px;padding:14px;margin-bottom:10px;">
        <div style="color:#c4b5fd;font-size:.82rem;font-weight:700;margin-bottom:6px;">🌸 종합 한 줄</div>
        <div style="color:#e8e0ff;font-size:.9rem;line-height:1.6;">${overall}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
        <div style="background:rgba(255,150,200,.08);border-radius:10px;padding:12px;">
          <div style="color:#ff9cc0;font-size:.75rem;font-weight:700;margin-bottom:4px;">💕 애정</div>
          <div style="color:#ffe0ef;font-size:.82rem;line-height:1.55;">${love}</div>
        </div>
        <div style="background:rgba(255,215,80,.08);border-radius:10px;padding:12px;">
          <div style="color:#fcd262;font-size:.75rem;font-weight:700;margin-bottom:4px;">💰 금전</div>
          <div style="color:#fff9e0;font-size:.82rem;line-height:1.55;">${money}</div>
        </div>
        <div style="background:rgba(100,220,150,.08);border-radius:10px;padding:12px;">
          <div style="color:#6ee7b7;font-size:.75rem;font-weight:700;margin-bottom:4px;">🌿 건강</div>
          <div style="color:#e0fff0;font-size:.82rem;line-height:1.55;">${health}</div>
        </div>
        <div style="background:rgba(100,180,255,.08);border-radius:10px;padding:12px;">
          <div style="color:#93c5fd;font-size:.75rem;font-weight:700;margin-bottom:4px;">💼 직업</div>
          <div style="color:#e0f0ff;font-size:.82rem;line-height:1.55;">${work}</div>
        </div>
      </div>
      ${advice ? `<div style="background:linear-gradient(135deg,rgba(250,130,100,.12),rgba(255,180,60,.10));border:1px solid rgba(255,180,100,.25);border-radius:10px;padding:12px;margin-bottom:10px;"><div style="color:#ffcc80;font-size:.82rem;font-weight:700;margin-bottom:4px;">✨ 연이의 조언</div><div style="color:#fff3e0;font-size:.88rem;line-height:1.6;">${advice}</div></div>` : ""}
      ${insight ? `<div style="border-top:1px solid rgba(180,120,255,.18);padding-top:10px;margin-top:4px;color:#a78bca;font-size:.78rem;line-height:1.5;"># 사주 인사이트: ${insight}</div>` : ""}
    </div>`;
  }

  // 오늘의 일진 & 천체 정보
  const calSection = `
    <div style="background:linear-gradient(135deg,#0d1a1a,#0a2020);border:1px solid rgba(100,200,200,.25);border-radius:14px;padding:18px 16px;margin-bottom:16px;">
      <div style="color:#7ed8d8;font-weight:700;font-size:.92rem;margin-bottom:12px;">📅 오늘의 일진 &amp; 천체 기운</div>
      <table style="width:100%;border-collapse:collapse;font-size:.84rem;">
        <tr><td style="color:#5fa8a8;padding:4px 0;width:80px;">날짜</td><td style="color:#d0f0f0;">${dateStr}</td></tr>
        <tr><td style="color:#5fa8a8;padding:4px 0;">일진</td><td style="color:#d0f0f0;">${cal.ilchin || ""} (${cal.wolgeon || ""} ${cal.year_ganji || ""})</td></tr>
        <tr><td style="color:#5fa8a8;padding:4px 0;">음력</td><td style="color:#d0f0f0;">${cal.lunar_date || ""}</td></tr>
        ${sky.moon_phase ? `<tr><td style="color:#5fa8a8;padding:4px 0;">달의 위상</td><td style="color:#d0f0f0;">${sky.moon_phase}</td></tr>` : ""}
        ${sky.moon_sign ? `<tr><td style="color:#5fa8a8;padding:4px 0;">달의 별자리</td><td style="color:#d0f0f0;">${sky.moon_sign}</td></tr>` : ""}
        ${sky.retrograde && sky.retrograde.length ? `<tr><td style="color:#5fa8a8;padding:4px 0;">역행</td><td style="color:#d0f0f0;">${sky.retrograde.join(", ")}</td></tr>` : ""}
      </table>
      ${sky.key_transits && sky.key_transits.length ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(100,200,200,.15);"><div style="color:#5fa8a8;font-size:.75rem;font-weight:700;margin-bottom:5px;">오늘의 천체 흐름</div>${sky.key_transits.map(t => `<div style="color:#b0e0e0;font-size:.8rem;padding:2px 0;">• ${t}</div>`).join("")}</div>` : ""}
    </div>`;

  // 자미두수
  const ziweiSection = ziwei.ilchin ? `
    <div style="background:linear-gradient(135deg,#1a0a1e,#240a32);border:1px solid rgba(200,100,255,.25);border-radius:14px;padding:18px 16px;margin-bottom:16px;">
      <div style="color:#da8fff;font-weight:700;font-size:.92rem;margin-bottom:10px;">🌌 자미두수(紫微斗數) 오늘의 기운</div>
      ${ziwei.sihua_today ? `<div style="color:#e8d0ff;font-size:.88rem;line-height:1.6;margin-bottom:8px;">${ziwei.sihua_today}</div>` : ""}
      ${ziwei.sihua_this_month ? `<div style="color:#c4a4ff;font-size:.82rem;line-height:1.55;margin-bottom:6px;">이달: ${ziwei.sihua_this_month}</div>` : ""}
      ${ziwei.sihua_this_year ? `<div style="color:#9d79d0;font-size:.8rem;line-height:1.5;">올해: ${ziwei.sihua_this_year}</div>` : ""}
    </div>` : "";

  // 숙요
  const mansion = (sukuyo.today_mansion || {});
  const sukuyoSection = mansion.name_kr ? `
    <div style="background:linear-gradient(135deg,#0a0a1e,#0d0d2e);border:1px solid rgba(150,150,255,.22);border-radius:14px;padding:18px 16px;margin-bottom:16px;">
      <div style="color:#9999ff;font-weight:700;font-size:.92rem;margin-bottom:10px;">💫 숙요점(宿曜占) — ${mansion.name_kr}</div>
      ${mansion.energy_kr ? `<div style="color:#e0e0ff;font-size:.88rem;line-height:1.6;">${mansion.energy_kr}</div>` : ""}
      <div style="margin-top:10px;color:#7070c0;font-size:.78rem;">이달 주관 수: ${sukuyo.this_month_dominant || ""} &nbsp;|&nbsp; 올해: ${sukuyo.this_year_dominant || ""}</div>
    </div>` : "";

  // 베다 점성술 (판차앙가)
  const panchSection = panch.summary_kr ? `
    <div style="background:linear-gradient(135deg,#1a1000,#2a1800);border:1px solid rgba(255,200,80,.2);border-radius:14px;padding:18px 16px;margin-bottom:16px;">
      <div style="color:#fcd262;font-weight:700;font-size:.92rem;margin-bottom:10px;">🪐 베다 점성술 — 판차앙가</div>
      <div style="color:#fff3d0;font-size:.88rem;line-height:1.6;margin-bottom:8px;">${panch.summary_kr}</div>
      <div style="color:#b0900a;font-size:.78rem;">나크샤트라: ${panch.nakshatra || ""} &nbsp;|&nbsp; 티티: ${panch.tithi || ""}</div>
      ${panch.key_graha_now && panch.key_graha_now.length ? `<div style="margin-top:6px;color:#90720a;font-size:.78rem;">${panch.key_graha_now.join(" · ")}</div>` : ""}
    </div>` : "";

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CODE DESTINY — ${dateStr} 오늘의 운세</title>
</head>
<body style="margin:0;padding:0;background:#07050f;font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#0d0818;border-radius:16px;overflow:hidden;">

  <!-- 헤더 -->
  <div style="background:linear-gradient(135deg,#1a0845,#2d0f6b);padding:28px 24px 22px;text-align:center;">
    <div style="font-size:2rem;">🌸</div>
    <h1 style="color:#f0e8ff;font-size:1.35rem;font-weight:800;margin:8px 0 4px;">CODE DESTINY</h1>
    <div style="color:#a88fe0;font-size:.88rem;">${dateStr} 오늘의 운세</div>
    ${animalKr ? `<div style="margin-top:8px;display:inline-block;background:rgba(255,255,255,.08);border:1px solid rgba(180,120,255,.35);border-radius:999px;padding:5px 16px;color:#d4b8ff;font-size:.82rem;">${animalEmoji} ${animalKr} 띠 맞춤 운세</div>` : ""}
  </div>

  <!-- 본문 -->
  <div style="padding:24px 20px;">
    ${animalSection}
    ${calSection}
    ${ziweiSection}
    ${sukuyoSection}
    ${panchSection}

    <!-- CTA -->
    <div style="text-align:center;padding:20px 0 8px;">
      <a href="https://code-destiny.com" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;font-weight:800;font-size:.95rem;padding:14px 32px;border-radius:999px;box-shadow:0 6px 24px rgba(124,58,237,.45);">✨ 꿀꿀 만세력에서 전체 운세 보기</a>
    </div>
  </div>

  <!-- 푸터 -->
  <div style="background:rgba(255,255,255,.04);border-top:1px solid rgba(255,255,255,.08);padding:16px 20px;text-align:center;">
    <div style="color:#555;font-size:.75rem;line-height:1.6;">
      CODE DESTINY 운세 뉴스레터 &nbsp;|&nbsp; code-destiny.com<br>
      <a href="${unsubscribeUrl}" style="color:#7c5fc0;text-decoration:underline;">수신 거부 (Unsubscribe)</a>
    </div>
  </div>
</div>
</body>
</html>`;

  return html;
}

/**
 * 월별 운세 HTML 이메일 빌드
 */
function buildMonthlyHtml({ fortune, email, birthYear, unsubscribeUrl, yearMonth }) {
  const animalId  = getBirthAnimalId(birthYear);
  const animalKr  = animalId ? getAnimalKr(animalId) : null;
  const animalEmoji = animalId ? getAnimalEmoji(animalId) : "🌸";

  const cal    = (fortune && fortune.calendar) || {};
  const ziwei  = (fortune && fortune.ziwei_today) || {};
  const panch  = (fortune && fortune.panchanga_today) || {};
  const sukuyo = (fortune && fortune.sukuyo_meta) || {};

  const monthLabel = yearMonth || (cal.this_month || new Date().toISOString().slice(0, 7));
  const thisYear   = cal.this_year || new Date().getFullYear();
  const yearGanji  = cal.year_ganji || "";

  const animalData = animalId && fortune && fortune.animals ? fortune.animals[animalId] : null;

  let personalSection = "";
  if (animalData) {
    const advice = (animalData.advice || {}).kr || "";
    const insight = animalData.saju_insight || "";
    personalSection = `
    <div style="background:linear-gradient(135deg,#1a0a2e,#2d1154);border:1px solid rgba(200,150,255,.35);border-radius:14px;padding:20px 18px;margin-bottom:16px;">
      <div style="color:#e2d5ff;font-weight:700;margin-bottom:10px;">${animalEmoji} ${animalKr} 띠 이달의 조언</div>
      ${advice ? `<div style="color:#f0e8ff;font-size:.9rem;line-height:1.7;margin-bottom:8px;">${advice}</div>` : ""}
      ${insight ? `<div style="color:#9d79d0;font-size:.8rem;line-height:1.5;">${insight}</div>` : ""}
    </div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CODE DESTINY — ${monthLabel} 월별 운세</title>
</head>
<body style="margin:0;padding:0;background:#07050f;font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#0d0818;border-radius:16px;overflow:hidden;">

  <!-- 헤더 -->
  <div style="background:linear-gradient(135deg,#0f1a45,#1a2d6b);padding:28px 24px 22px;text-align:center;">
    <div style="font-size:2rem;">🌕</div>
    <h1 style="color:#e8f0ff;font-size:1.35rem;font-weight:800;margin:8px 0 4px;">CODE DESTINY</h1>
    <div style="color:#90a8e0;font-size:.88rem;">${monthLabel} 월별 운세</div>
    ${yearGanji ? `<div style="margin-top:6px;color:#7090d0;font-size:.82rem;">${yearGanji} ${thisYear}년</div>` : ""}
    ${animalKr ? `<div style="margin-top:8px;display:inline-block;background:rgba(255,255,255,.07);border:1px solid rgba(120,160,255,.35);border-radius:999px;padding:5px 16px;color:#b8d0ff;font-size:.82rem;">${animalEmoji} ${animalKr} 띠 맞춤 월운</div>` : ""}
  </div>

  <div style="padding:24px 20px;">
    ${personalSection}

    <!-- 이달의 사주 흐름 -->
    <div style="background:linear-gradient(135deg,#101828,#182038);border:1px solid rgba(150,180,255,.2);border-radius:14px;padding:18px 16px;margin-bottom:16px;">
      <div style="color:#93c5fd;font-weight:700;font-size:.92rem;margin-bottom:10px;">📅 이달의 만세력 흐름</div>
      ${cal.wolgeon ? `<div style="color:#e0f0ff;font-size:.88rem;line-height:1.6;margin-bottom:6px;">월건: <strong>${cal.wolgeon}</strong></div>` : ""}
      ${cal.current_jeolgi ? `<div style="color:#90b8d0;font-size:.84rem;line-height:1.5;">절기: ${cal.current_jeolgi}</div>` : ""}
    </div>

    <!-- 자미두수 이달 -->
    ${ziwei.sihua_this_month ? `
    <div style="background:linear-gradient(135deg,#1a0a1e,#240a32);border:1px solid rgba(200,100,255,.22);border-radius:14px;padding:18px 16px;margin-bottom:16px;">
      <div style="color:#da8fff;font-weight:700;font-size:.92rem;margin-bottom:8px;">🌌 자미두수 이달의 기운</div>
      <div style="color:#e8d0ff;font-size:.88rem;line-height:1.6;">${ziwei.sihua_this_month}</div>
      ${ziwei.sihua_this_year ? `<div style="margin-top:8px;color:#8a5aaa;font-size:.8rem;">올해 흐름: ${ziwei.sihua_this_year}</div>` : ""}
    </div>` : ""}

    <!-- 숙요 이달 -->
    ${sukuyo.this_month_dominant ? `
    <div style="background:linear-gradient(135deg,#0a0a1e,#0d0d2e);border:1px solid rgba(150,150,255,.2);border-radius:14px;padding:18px 16px;margin-bottom:16px;">
      <div style="color:#9999ff;font-weight:700;font-size:.92rem;margin-bottom:8px;">💫 숙요점 이달의 수(宿)</div>
      <div style="color:#d0d0ff;font-size:.88rem;">이달 주관 수: <strong>${sukuyo.this_month_dominant}</strong></div>
      ${sukuyo.this_year_dominant ? `<div style="margin-top:6px;color:#7070c0;font-size:.8rem;">올해 주관 수: ${sukuyo.this_year_dominant}</div>` : ""}
    </div>` : ""}

    <!-- 베다 이달 -->
    ${panch.this_year_theme_kr ? `
    <div style="background:linear-gradient(135deg,#1a1000,#2a1800);border:1px solid rgba(255,200,80,.18);border-radius:14px;padding:18px 16px;margin-bottom:16px;">
      <div style="color:#fcd262;font-weight:700;font-size:.92rem;margin-bottom:8px;">🪐 베다 점성술 연간 테마</div>
      <div style="color:#fff3d0;font-size:.88rem;line-height:1.6;">${panch.this_year_theme_kr}</div>
    </div>` : ""}

    <div style="text-align:center;padding:20px 0 8px;">
      <a href="https://code-destiny.com" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;text-decoration:none;font-weight:800;font-size:.95rem;padding:14px 32px;border-radius:999px;box-shadow:0 6px 24px rgba(59,130,246,.45);">🌕 꿀꿀 만세력에서 전체 월간 운세 보기</a>
    </div>
  </div>

  <div style="background:rgba(255,255,255,.04);border-top:1px solid rgba(255,255,255,.08);padding:16px 20px;text-align:center;">
    <div style="color:#555;font-size:.75rem;line-height:1.6;">
      CODE DESTINY 운세 뉴스레터 &nbsp;|&nbsp; code-destiny.com<br>
      <a href="${unsubscribeUrl}" style="color:#5f7fc0;text-decoration:underline;">수신 거부 (Unsubscribe)</a>
    </div>
  </div>
</div>
</body>
</html>`;
  return html;
}

module.exports = { buildDailyHtml, buildMonthlyHtml, getBirthAnimalId };
