import { connectDb } from "./db.js";
import { DailyFortuneSubscription } from "./models.js";
import { sendEmail } from "./resend.js";

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const GANJI_LIST = Array.from({ length: 60 }, (_, i) => STEMS[i % 10] + BRANCHES[i % 12]);
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 🔴 일일 발송은 구독자 1인당 메일 1통을 직렬로 보낸다. 종전에는 .limit() 도 시간 상한도 없어
// 구독자 수에 선형 비례했고, 같은 일일 크론의 나머지 4개 태스크와 한 실행을 공유한다
// (worker/index.js 의 scheduled → Promise.allSettled). 나머지 넷은 전부 배치 상한이 있다.
//
// 🔴 상한만 거는 것은 틀린 답이다 — 잘린 구독자는 그날 메일을 영영 못 받는다(크론이 하루 1회다).
// 그래서 정렬을 lastSentAt 오름차순으로 둔다. 오늘 아직 못 받은 사람(=lastSentAt 이 가장 오래됐거나
// 없는 사람)이 앞에 오고, 잘리는 쪽은 이미 오늘 받아서 어차피 skipped 될 사람이다.
const DAILY_FORTUNE_BATCH_LIMIT = 500;
const DAILY_FORTUNE_TIME_BUDGET_MS = 60000;

function clampInt(value, fallback, min, max) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function getKstDateParts(value = Date.now()) {
  const base = value instanceof Date ? value : new Date(value);
  const kst = new Date(base.getTime() + KST_OFFSET_MS);
  return {
    y: kst.getUTCFullYear(),
    m: kst.getUTCMonth() + 1,
    d: kst.getUTCDate(),
    day: kst.getUTCDay(),
  };
}

export function getKstDateKey(value = Date.now()) {
  const { y, m, d } = getKstDateParts(value);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function maskEmail(value) {
  const text = String(value || "");
  const at = text.indexOf("@");
  if (at <= 0) return "***";
  const local = text.slice(0, at);
  const domain = text.slice(at + 1);
  const dot = domain.indexOf(".");
  const domainHead = dot > 0 ? domain.slice(0, dot) : domain;
  const domainTail = dot > 0 ? domain.slice(dot) : "";
  return `${local[0] || ""}***@${domainHead[0] || ""}***${domainTail}`;
}

function isSameKstDate(value, dateKey = getKstDateKey()) {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return false;
  return getKstDateKey(date) === dateKey;
}

function getJulianDay(year, month, day) {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
}

export function getTodayPillars(now = Date.now()) {
  const { y, m, d, day } = getKstDateParts(now);

  const jd = getJulianDay(y, m, d);
  const dayIdx = (Math.floor(jd + 0.5) + 49) % 60;
  const dayPillar = GANJI_LIST[dayIdx];

  const yearIdx = (y - 4) % 60;
  const yearPillar = GANJI_LIST[yearIdx];

  return {
    date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    yearPillar,
    dayPillar,
    dayName: ["일", "월", "화", "수", "목", "금", "토"][day],
  };
}

const ELEMENT_LABELS = {
  wood: "목(木)",
  fire: "화(火)",
  earth: "토(土)",
  metal: "금(金)",
  water: "수(水)",
};

export function getSiteBaseUrl(env) {
  return String(env?.SITE_BASE_URL || env?.AUTH_FRONTEND_BASE_URL || "https://code-destiny.com").replace(/\/+$/, "");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeText(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function formatPillar(value) {
  if (!value || typeof value !== "object") return "정보 없음";
  return `${safeText(value.g)}${safeText(value.j)}` || "정보 없음";
}

function formatBirth(sub) {
  const date = safeText(sub.birthDate);
  if (!date) return "출생 정보 저장됨";
  const hour = Number.isFinite(Number(sub.birthHour)) ? String(sub.birthHour).padStart(2, "0") : "12";
  const minute = Number.isFinite(Number(sub.birthMinute)) ? String(sub.birthMinute).padStart(2, "0") : "00";
  return `${date} ${hour}:${minute} ${safeText(sub.calendarType, "solar")}`;
}

function formatElementName(value) {
  return ELEMENT_LABELS[value] || safeText(value);
}

function formatElementBalance(natal) {
  const source = natal && typeof natal === "object" && natal.elements && typeof natal.elements === "object"
    ? natal.elements
    : natal;
  if (!source || typeof source !== "object") return "오행 분포 저장";
  const parts = ["wood", "fire", "earth", "metal", "water"]
    .map((key) => {
      const amount = Number(source[key]);
      return Number.isFinite(amount) ? `${ELEMENT_LABELS[key]} ${Math.round(amount)}` : "";
    })
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : "오행 분포 저장";
}

function formatElementList(value) {
  const list = Array.isArray(value)
    ? value
    : (value && typeof value === "object" ? Object.values(value) : [value]);
  return list.map((item) => formatElementName(item)).filter(Boolean).join(", ") || "균형 조율";
}

function getPreviewLine(preview) {
  if (!preview || typeof preview !== "object") return "";
  const score = Number(preview.score);
  const scoreText = Number.isFinite(score) ? `${Math.round(score)}점` : "";
  const grade = safeText(preview.grade || preview.band || preview.level);
  const advice = safeText(preview.advice || preview.summary || preview.text || preview.msg);
  return [scoreText, grade, advice].filter(Boolean).join(" · ");
}

function buildSajuMailContext(sub, today) {
  const snapshot = sub.sajuSnapshot && typeof sub.sajuSnapshot === "object" ? sub.sajuSnapshot : null;
  if (!snapshot || !snapshot.pillars || !snapshot.pillars.d) {
    throw new Error("missing_saju_snapshot");
  }
  const p = snapshot.pillars;
  return {
    birth: formatBirth(sub),
    yearPillar: formatPillar(p.y),
    monthPillar: formatPillar(p.m),
    dayPillar: formatPillar(p.d),
    hourPillar: formatPillar(p.h),
    dayMaster: safeText(p.d.g, "일간"),
    dayBranch: safeText(p.d.j, "일지"),
    elementBalance: formatElementBalance(snapshot.natal),
    yongshin: formatElementList(snapshot.power && (snapshot.power.yongshin || snapshot.power.useful || snapshot.power.good)),
    avoidElements: formatElementList(snapshot.power && (snapshot.power.kijishin || snapshot.power.bad || snapshot.power.avoid)),
    johuType: safeText(snapshot.johu && (snapshot.johu.type || snapshot.johu.badgeTxt), "기운 조율"),
    todayPillar: today.dayPillar,
    yearFlow: today.yearPillar,
    dailyPreview: getPreviewLine(snapshot.dailyPreview),
    monthlyPreview: getPreviewLine(snapshot.monthlyPreview),
  };
}

function buildSajuFortuneHtml(ctx) {
  const focus = ctx.dailyPreview || `${ctx.dayMaster}${ctx.dayBranch} 원국 위로 ${ctx.todayPillar} 일진이 내려앉으며 하루의 결이 선명하게 드러납니다.`;
  const monthlyLine = ctx.monthlyPreview
    ? `<div style="margin:16px 0 0; padding:14px 16px; border-radius:16px; background:#fffaf0; border:1px solid #fde68a;"><div style="margin:0 0 5px; color:#92400e; font-size:12px; font-weight:900; letter-spacing:.08em;">이번 달 배경</div><p style="margin:0; color:#78350f; font-size:14px; line-height:1.72;">${escapeHtml(ctx.monthlyPreview)}</p></div>`
    : "";
  return `
    <div style="margin:0 0 18px;">
      <div style="display:inline-block; margin:0 0 10px; padding:6px 12px; border-radius:999px; background:#eef2ff; color:#4338ca; font-size:12px; font-weight:900; letter-spacing:.08em;">오늘의 사주 리듬</div>
      <h2 style="margin:0 0 12px; color:#1f1b4d; font-size:24px; line-height:1.32;">${escapeHtml(ctx.todayPillar)} 일진이 비추는 하루</h2>
      <p style="margin:0; color:#334155; font-size:15px; line-height:1.82;">${escapeHtml(focus)}</p>
    </div>
    <div style="margin:18px 0; padding:18px; border-radius:22px; background:linear-gradient(135deg,#f8fafc 0%,#eef2ff 100%); border:1px solid #dbeafe;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <tr><td style="padding:0 0 12px; color:#475569; font-size:13px; line-height:1.6;">중심 기운</td><td style="padding:0 0 12px; color:#312e81; font-size:15px; font-weight:900; text-align:right;">${escapeHtml(ctx.dayPillar)} 일주</td></tr>
        <tr><td style="padding:0 0 12px; color:#475569; font-size:13px; line-height:1.6;">오늘의 보완</td><td style="padding:0 0 12px; color:#047857; font-size:15px; font-weight:900; text-align:right;">${escapeHtml(ctx.yongshin)}</td></tr>
        <tr><td style="padding:0; color:#475569; font-size:13px; line-height:1.6;">잠시 낮출 결</td><td style="padding:0; color:#be123c; font-size:15px; font-weight:900; text-align:right;">${escapeHtml(ctx.avoidElements)}</td></tr>
      </table>
    </div>
    <div style="margin:18px 0; padding:18px; border-radius:22px; background:#ffffff; border:1px solid #e2e8f0; box-shadow:0 10px 24px rgba(15,23,42,.06);">
      <p style="margin:0 0 12px; color:#475569; font-size:14px; line-height:1.78;"><strong style="color:#4f46e5;">중심 기운</strong> ${escapeHtml(ctx.dayPillar)} 일주의 ${escapeHtml(ctx.dayMaster)} 기운이 오늘의 ${escapeHtml(ctx.todayPillar)} 일진과 만나, 먼저 마음의 결을 정돈한 뒤 움직일 때 복이 맑게 열립니다.</p>
      <p style="margin:0; color:#475569; font-size:14px; line-height:1.78;"><strong style="color:#4f46e5;">오늘의 처방</strong> ${escapeHtml(ctx.yongshin)} 기운을 살리는 선택을 가까이 두고, ${escapeHtml(ctx.avoidElements)} 기운이 과해지는 말과 소비는 한 박자 늦추세요.</p>
    </div>
    ${monthlyLine}
    <p style="margin:18px 0 10px; color:#334155; font-size:15px; line-height:1.82;">오늘은 큰 결론보다 작은 질서를 세우는 날입니다. 아침에는 해야 할 일을 세 가지로 줄이고, 오후에는 관계에서 먼저 부드러운 표현을 고르세요. 밤에는 내일로 넘길 감정과 오늘 마무리할 감정을 조용히 나누면 운의 흐름이 한결 가벼워집니다.</p>
    <div style="margin:18px 0; padding:18px; border-radius:22px; background:linear-gradient(135deg,#fff7ed 0%,#fff1f2 100%); border:1px solid #fed7aa;">
      <p style="margin:0 0 10px; color:#7c2d12; font-size:14px; line-height:1.78;"><strong>행운 포인트</strong> 보완 기운 ${escapeHtml(ctx.yongshin)}을 떠올리게 하는 색이나 물건을 가까이 두세요.</p>
      <p style="margin:0; color:#7c2d12; font-size:14px; line-height:1.78;"><strong>주의 신호</strong> ${escapeHtml(ctx.avoidElements)}의 결이 강해지는 순간에는 바로 답하지 말고 숨을 고른 뒤 움직이면 좋습니다.</p>
    </div>
    <p style="margin:0; color:#312e81; font-size:15px; line-height:1.75; font-weight:700;">당신의 오늘이 어제보다 더 반짝이길 바랄게요. - 꽃돼지 연이 드림</p>
  `;
}

function hasUsableSnapshot(sub) {
  const snapshot = sub && sub.sajuSnapshot;
  return !!(snapshot && typeof snapshot === "object" && snapshot.pillars && snapshot.pillars.d && snapshot.pillars.d.g && snapshot.pillars.d.j);
}

function buildGenericCoordBlockHtml(today) {
  return `
    <div style="margin:0 0 22px; padding:18px; border-radius:20px; background:linear-gradient(135deg,#eef2ff,#faf5ff); border:1px solid #ddd6fe;">
      <div style="color:#4c1d95; font-size:13px; font-weight:800; letter-spacing:.03em; margin-bottom:10px;">오늘의 하늘 기운</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <tr>
          <td style="padding:7px 0; color:#64748b; font-size:13px;">오늘 일진</td>
          <td style="padding:7px 0; color:#1e1b4b; font-size:14px; font-weight:800; text-align:right;">${escapeHtml(today.dayPillar)}</td>
        </tr>
        <tr>
          <td style="padding:7px 0; color:#64748b; font-size:13px;">요일</td>
          <td style="padding:7px 0; color:#1e1b4b; font-size:14px; font-weight:800; text-align:right;">${escapeHtml(today.dayName)}요일</td>
        </tr>
        <tr>
          <td style="padding:7px 0; color:#64748b; font-size:13px;">올해 흐름</td>
          <td style="padding:7px 0; color:#1e1b4b; font-size:14px; font-weight:800; text-align:right;">${escapeHtml(today.yearPillar)}</td>
        </tr>
      </table>
    </div>`;
}

function buildGenericFortuneHtml(today) {
  return `
    <div style="margin:0 0 18px;">
      <div style="display:inline-block; margin:0 0 10px; padding:6px 12px; border-radius:999px; background:#eef2ff; color:#4338ca; font-size:12px; font-weight:900; letter-spacing:.08em;">오늘의 기운 흐름</div>
      <h2 style="margin:0 0 12px; color:#1f1b4d; font-size:24px; line-height:1.32;">${escapeHtml(today.dayPillar)} 일진이 비추는 하루</h2>
      <p style="margin:0; color:#334155; font-size:15px; line-height:1.82;">오늘은 ${escapeHtml(today.dayPillar)} 일진의 기운이 하루의 결을 이끕니다. 큰 결론보다 작은 질서를 세울 때 흐름이 맑게 열립니다.</p>
    </div>
    <div style="margin:18px 0; padding:18px; border-radius:22px; background:#ffffff; border:1px solid #e2e8f0; box-shadow:0 10px 24px rgba(15,23,42,.06);">
      <p style="margin:0 0 12px; color:#475569; font-size:14px; line-height:1.78;"><strong style="color:#4f46e5;">아침</strong> 해야 할 일을 세 가지로 줄이고, 가장 마음이 가벼운 것부터 시작하세요.</p>
      <p style="margin:0 0 12px; color:#475569; font-size:14px; line-height:1.78;"><strong style="color:#4f46e5;">오후</strong> 관계에서는 먼저 부드러운 표현을 고르면 오늘의 운이 한결 순해집니다.</p>
      <p style="margin:0; color:#475569; font-size:14px; line-height:1.78;"><strong style="color:#4f46e5;">밤</strong> 내일로 넘길 감정과 오늘 마무리할 감정을 조용히 나누면 마음이 가지런해집니다.</p>
    </div>
    <div style="margin:18px 0; padding:18px; border-radius:22px; background:linear-gradient(135deg,#fff7ed 0%,#fff1f2 100%); border:1px solid #fed7aa;">
      <p style="margin:0 0 10px; color:#7c2d12; font-size:14px; line-height:1.78;"><strong>행운 포인트</strong> 오늘 마주치는 작은 호의를 놓치지 말고, 먼저 웃어 주세요.</p>
      <p style="margin:0; color:#7c2d12; font-size:14px; line-height:1.78;"><strong>주의 신호</strong> 서두른 판단은 한 박자 늦추고 숨을 고른 뒤 움직이면 좋습니다.</p>
    </div>
    <div style="margin:18px 0 0; padding:14px 16px; border-radius:16px; background:#f5f3ff; border:1px solid #ddd6fe;">
      <p style="margin:0; color:#4c1d95; font-size:13px; line-height:1.7;">생년월일과 태어난 시각을 등록하면, 내일부터 <strong>당신의 사주에 맞춘 개인 운세</strong>로 보내드립니다.</p>
    </div>
    <p style="margin:18px 0 0; color:#312e81; font-size:15px; line-height:1.75; font-weight:700;">당신의 오늘이 어제보다 더 반짝이길 바랄게요. - 꽃돼지 연이 드림</p>
  `;
}

function buildPaidFeatureLinks(env) {
  const base = getSiteBaseUrl(env);
  return [
    {
      title: "사주 인생의 책",
      desc: "오늘의 흐름 너머 평생의 기질, 대운, 관계, 재물의 결이 한 권의 운명서로 열립니다.",
      href: `${base}/life-book-ai?utm_source=daily_email&utm_medium=email&utm_campaign=daily_saju_cta_lifebook`,
      cta: "인생의 책 열기",
    },
    {
      title: "사주 연애 비책",
      desc: "내 사주의 사랑 방식과 관계에서 되풀이되는 선택의 그림자가 더 깊은 빛으로 떠오릅니다.",
      href: `${base}/love-secret-ai?utm_source=daily_email&utm_medium=email&utm_campaign=daily_saju_cta_love`,
      cta: "연애 비책 보기",
    },
    {
      title: "자미두수 심화 명반",
      desc: "12궁의 운명 지도 위로 커리어, 재물, 관계의 장기 흐름이 차례로 비춥니다.",
      href: `${base}/ziwei/chart?utm_source=daily_email&utm_medium=email&utm_campaign=daily_saju_cta_ziwei`,
      cta: "명반 열기",
    },
  ];
}

function buildPaidFeatureCtaHtml(env) {
  const links = buildPaidFeatureLinks(env);
  const cards = links.map((item) => `
    <div style="margin:0 0 12px; padding:16px; border-radius:18px; background:#ffffff; border:1px solid #e9d5ff;">
      <h3 style="margin:0 0 6px; color:#4c1d95; font-size:16px;">${escapeHtml(item.title)}</h3>
      <p style="margin:0 0 12px; color:#64748b; font-size:13px; line-height:1.65;">${escapeHtml(item.desc)}</p>
      <a href="${escapeHtml(item.href)}" style="display:inline-block; color:#ffffff; background:#7c3aed; text-decoration:none; padding:10px 15px; border-radius:999px; font-size:13px; font-weight:800;">${escapeHtml(item.cta)}</a>
    </div>
  `).join("");
  return `
    <div style="margin:28px 0 0; padding:18px; border-radius:22px; background:linear-gradient(135deg,#faf5ff,#fff7ed); border:1px solid #e9d5ff;">
      <div style="margin:0 0 12px; color:#6d28d9; font-size:13px; font-weight:900; letter-spacing:.04em;">오늘의 흐름을 더 깊게 여는 길</div>
      ${cards}
    </div>
  `;
}

export async function sendSingleFortune(env, sub, options = {}) {
  const dateKey = options.todayKey || getKstDateKey();
  if (options.skipIfSentToday && isSameKstDate(sub?.lastSentAt, dateKey)) {
    return {
      status: "skipped",
      reason: "already_sent_today",
      dateKey,
    };
  }

  const pillars = getTodayPillars();
  const dateLabel = pillars.date;
  const personalized = hasUsableSnapshot(sub);
  const headerSubtitle = personalized
    ? `${dateLabel} 사주 기반 오늘의 맞춤 운세`
    : `${dateLabel} 오늘의 운세`;
  const emailSubject = personalized
    ? `[CODE DESTINY] ${dateLabel} 오늘의 맞춤 운세가 도착했습니다.`
    : `[CODE DESTINY] ${dateLabel} 오늘의 운세가 도착했습니다.`;
  let coordBlockHtml;
  let fortuneHtmlContent;
  if (personalized) {
    const ctx = buildSajuMailContext(sub, pillars);
    coordBlockHtml = `
        <div style="margin:0 0 22px; padding:18px; border-radius:20px; background:linear-gradient(135deg,#eef2ff,#faf5ff); border:1px solid #ddd6fe;">
          <div style="color:#4c1d95; font-size:13px; font-weight:800; letter-spacing:.03em; margin-bottom:10px;">오늘의 명식 좌표</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            <tr>
              <td style="padding:7px 0; color:#64748b; font-size:13px;">일주</td>
              <td style="padding:7px 0; color:#1e1b4b; font-size:14px; font-weight:800; text-align:right;">${escapeHtml(ctx.dayPillar)}</td>
            </tr>
            <tr>
              <td style="padding:7px 0; color:#64748b; font-size:13px;">오늘 일진</td>
              <td style="padding:7px 0; color:#1e1b4b; font-size:14px; font-weight:800; text-align:right;">${escapeHtml(ctx.todayPillar)}</td>
            </tr>
            <tr>
              <td style="padding:7px 0; color:#64748b; font-size:13px;">보완 기운</td>
              <td style="padding:7px 0; color:#1e1b4b; font-size:14px; font-weight:800; text-align:right;">${escapeHtml(ctx.yongshin)}</td>
            </tr>
          </table>
        </div>`;
    fortuneHtmlContent = buildSajuFortuneHtml(ctx);
  } else {
    coordBlockHtml = buildGenericCoordBlockHtml(pillars);
    fortuneHtmlContent = buildGenericFortuneHtml(pillars);
  }
  const paidFeatureCtaHtml = buildPaidFeatureCtaHtml(env);
  const siteBaseUrl = getSiteBaseUrl(env);
  const unsubscribeUrl = `${siteBaseUrl}/api/subscriptions/daily-fortune/unsubscribe?email=${encodeURIComponent(sub.email)}`;
  
  const emailHtml = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; background-color: #f9fafb; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; }
  </style>
</head>
<body>
  <div style="background-color: #f9fafb; padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px 20px; text-align: center;">
        <div style="font-size: 40px; margin-bottom: 10px;">🌸</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">CODE DESTINY</h1>
        <p style="margin: 5px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">${escapeHtml(headerSubtitle)}</p>
      </div>

      <!-- Content -->
      <div style="padding: 30px 25px;">
        ${coordBlockHtml}
        ${fortuneHtmlContent}
        ${paidFeatureCtaHtml}
        
        <div style="margin-top: 30px; text-align: center;">
          <a href="${escapeHtml(siteBaseUrl)}?utm_source=daily_email&utm_medium=email&utm_campaign=daily_saju_home" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 999px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">✨ 내 사주 더 깊이 열기</a>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #f1f5f9;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">
          구독 신청을 남긴 분께 매일 아침의 운이 조용히 닿습니다.<br>
          하루의 첫 빛 속에서 필요한 기운만 고요히 머뭅니다.
        </p>
        <div style="margin-top: 15px; font-size: 12px;">
          <a href="${escapeHtml(unsubscribeUrl)}" style="color: #64748b; text-decoration: underline;">구독 해지 (Unsubscribe)</a>
        </div>
        <p style="margin-top: 20px; font-size: 11px; color: #cbd5e1;">© 2026 CODE DESTINY. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

  const emailResult = await sendEmail(env, {
    to: sub.email,
    subject: emailSubject,
    html: emailHtml,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (emailResult.ok) {
    let trackingUpdated = true;
    let trackingError = "";
    await DailyFortuneSubscription.updateOne(
      { _id: sub._id },
      { $set: { lastSentAt: new Date(), lastMailError: "", lastMailErrorAt: null } }
    ).catch((error) => {
      trackingUpdated = false;
      trackingError = String(error?.message || "last_sent_update_failed").slice(0, 240);
      console.error(`[EMAIL] Sent but failed to update daily fortune tracking for ${maskEmail(sub.email)}:`, error);
    });

    return {
      status: "sent",
      dateKey,
      trackingUpdated,
      trackingError,
      providerStatus: emailResult.status || 0,
      providerId: String(emailResult.data?.id || ""),
    };
  }

  return {
    status: "error",
    errorCode: emailResult.error || "email_send_failed",
    providerStatus: emailResult.status || 0,
    providerData: emailResult.data || null,
  };
}

export async function runDailyFortuneTask(env) {
  console.log("[CRON] Starting Daily Fortune Task...");
  await connectDb(env);
  const todayKey = getKstDateKey();

  const batchLimit = clampInt(env?.DAILY_FORTUNE_BATCH_LIMIT, DAILY_FORTUNE_BATCH_LIMIT, 1, 5000);
  const timeBudgetMs = clampInt(env?.DAILY_FORTUNE_TIME_BUDGET_MS, DAILY_FORTUNE_TIME_BUDGET_MS, 5000, 600000);

  const subscribers = await DailyFortuneSubscription.find({
    isActive: true,
    subDaily: true,
  })
    // 오늘 아직 못 받은 사람 우선. lastSentAt 이 없는 구독자가 오름차순 맨 앞에 온다.
    .sort({ lastSentAt: 1 })
    .limit(batchLimit)
    .lean();

  if (subscribers.length === 0) {
    console.log("[CRON] No active subscribers found.");
    return;
  }

  console.log(`[CRON] Found ${subscribers.length} subscribers.`);
  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  const startedAt = Date.now();
  let processed = 0;
  let abortedReason = "";

  for (const sub of subscribers) {
    if (Date.now() - startedAt >= timeBudgetMs) {
      abortedReason = "time_budget";
      break;
    }
    processed += 1;
    try {
      console.log(`[CRON] Processing ${maskEmail(sub.email)}...`);
      const result = await sendSingleFortune(env, sub, { skipIfSentToday: true, todayKey });
      if (result.status === "skipped") {
        skippedCount += 1;
        console.log(`[CRON] Skipped ${maskEmail(sub.email)}: ${result.reason}`);
        continue;
      }
      if (result.status === "error") {
        failedCount += 1;
        const mailErrorCode = String(result.errorCode || "daily_mail_failed").slice(0, 240);
        console.error(`[CRON] Email send failed for ${maskEmail(sub.email)}: ${mailErrorCode}`);
        await DailyFortuneSubscription.updateOne(
          { _id: sub._id },
          { $set: { lastMailError: mailErrorCode, lastMailErrorAt: new Date() } }
        );
        continue;
      }
      sentCount += 1;
      console.log(`[CRON] Successfully sent ${maskEmail(sub.email)}`);
    } catch (err) {
      failedCount += 1;
      console.error(`[CRON] Error processing subscriber ${maskEmail(sub.email)}:`, err);
      await DailyFortuneSubscription.updateOne(
        { _id: sub._id },
        { $set: { lastMailError: String(err?.message || "daily_mail_failed").slice(0, 240), lastMailErrorAt: new Date() } }
      );
    }
  }

  // 🔴 잘린 건수를 반드시 남긴다. 조용한 절단은 요약에서 "다 보냈다"로 읽힌다.
  const unprocessed = subscribers.length - processed;
  const batchFull = subscribers.length >= batchLimit;
  if (abortedReason) {
    console.warn(
      `[CRON] Daily Fortune: 시간 예산 ${timeBudgetMs}ms 소진 — ${unprocessed}명을 이번 실행에서 처리하지 못했다.`,
    );
  }
  if (batchFull) {
    console.warn(
      `[CRON] Daily Fortune: 배치 상한 ${batchLimit}명에 닿았다 — 구독자가 더 있으면 이번 실행에 포함되지 않았다.`,
    );
  }
  console.log(
    `[CRON] Daily Fortune Task completed. sent=${sentCount} skipped=${skippedCount} failed=${failedCount}`
    + ` processed=${processed}/${subscribers.length}${abortedReason ? ` aborted=${abortedReason}` : ""}`,
  );
}
