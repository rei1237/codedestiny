import { Solar } from "lunar-javascript";
import { generateWithGemini } from "./gemini-client.js";
import { buildCanonicalSukuyoCompatibility, buildSukuyoFromLunar } from "./sukuyo-premium.js";
import { SUKYO_PREMIUM_CHAPTERS_V2, SUKYO_PREMIUM_CHAPTER_PLAN_VERSION } from "./pdf-v2/sukyo-premium-chapter-plan.js";

export const SUKYO_PDF_FEATURE_KEY = "premium-sukuyo-report-compat";
export const SUKYO_PDF_ALIAS_FEATURE_KEY = "premium_pdf_sukyo_compat";
export const SUKYO_PDF_CHAPTER_COUNT = 15;
export const SUKYO_PDF_CONFIG = Object.freeze({
  generationMode: "llm-html-v2",
  provider: "workers-ai-primary-gemini-fallback",
  templateVersion: "sukuyo-premium-html-v2.2.0",
});
export const SUKYO_PDF_CHAPTERS = SUKYO_PREMIUM_CHAPTERS_V2;

const PROVIDER_TIMEOUT_MS = 45000;
const CHAPTER_CACHE = new Map();
const SYUKU_LABELS = Object.freeze([
  "각숙", "항숙", "저숙", "방숙", "심숙", "미숙", "기숙", "두숙", "여숙",
  "허숙", "위숙", "실숙", "벽숙", "규숙", "루숙", "위숙", "묘숙", "필숙",
  "자숙", "삼숙", "정숙", "귀숙", "류숙", "성숙", "장숙", "익숙", "진숙",
]);
const SYUKU_MIXED_LABELS = Object.freeze([
  "각宿", "항宿", "저宿", "방宿", "심宿", "미宿", "기宿", "두宿", "여宿",
  "허宿", "위宿", "실宿", "벽宿", "규宿", "루宿", "위宿", "묘宿", "필宿",
  "자宿", "삼宿", "정宿", "귀宿", "류宿", "성宿", "장宿", "익宿", "진宿",
]);
const FORBIDDEN_PDF_TOKENS = Object.freeze([
  "json",
  "payload",
  "fallback",
  "llm",
  "api",
  "debug",
  "engine",
  "internal server error",
  "localdraft",
  "local draft",
  "local generated",
  "자동 복구",
  "복구 생성",
  "내부 데이터",
  "데이터에 따르면",
  "분석 결과",
  "이 결과는",
  "이 기능은",
  "계산 시그니처",
  "생성 지침",
  "프롬프트",
  "템플릿",
  "schema",
  "스키마",
  "검증",
  "undefined",
  "null",
  "nan",
  "about:blank",
  "[object object]",
]);
const DANGEROUS_HTML_RE = /<(script|iframe|object|embed|link|meta|base|form|input|button|textarea|select)\b[\s\S]*?<\/\1>|<(script|iframe|object|embed|link|meta|base|form|input|button|textarea|select)\b[^>]*\/?>/gi;
const SUKYO_RELATION_GUIDES = Object.freeze({
  "명": {
    axis: "같은 숙의 거울 관계",
    strength: "서로의 감정 결을 빠르게 알아차리고 편안함이 깊어집니다.",
    caution: "비슷한 약점이 동시에 올라오면 같은 방식으로 물러서거나 고집할 수 있습니다.",
    counsel: "한 사람이 멈추면 다른 한 사람이 다른 선택지를 열어 주는 회복 규칙이 필요합니다.",
  },
  "업태": {
    axis: "전생 인연감과 성장 과제",
    strength: "익숙함과 끌림이 강해 관계가 빠르게 깊어질 수 있습니다.",
    caution: "감정의 숙제가 반복되면 관계가 운명감보다 부담으로 느껴질 수 있습니다.",
    counsel: "감정의 의미를 단정하지 말고 현실 약속, 휴식, 역할을 분리해 다루어야 합니다.",
  },
  "영친": {
    axis: "보살핌과 지지의 인연",
    strength: "서로를 살리고 북돋우는 온기가 강해 장기 안정감이 살아납니다.",
    caution: "편안함에 기대면 성장 과제를 미루거나 한쪽의 돌봄이 과해질 수 있습니다.",
    counsel: "고마움과 요구를 동시에 말하는 습관이 관계의 균형을 지켜줍니다.",
  },
  "우쇠": {
    axis: "정서 교류와 섬세한 피로의 인연",
    strength: "감정의 미세한 변화를 잘 읽고 친밀한 공감이 빠르게 생깁니다.",
    caution: "작은 오해가 오래 남거나 한쪽이 더 많이 맞춘다고 느끼기 쉽습니다.",
    counsel: "서운함을 누적하지 말고 짧고 자주 확인하는 대화가 필요합니다.",
  },
  "안괴": {
    axis: "강한 끌림과 변화 압력의 인연",
    strength: "서로의 정체된 마음을 깨우고 관계에 생동감과 결단을 불러옵니다.",
    caution: "끌림이 강한 만큼 말의 충격, 통제감, 불안이 크게 번질 수 있습니다.",
    counsel: "뜨거운 순간에는 결론보다 거리 조절과 회복 시간을 먼저 정해야 합니다.",
  },
  "성위": {
    axis: "현실 목표와 역할 조율의 인연",
    strength: "목표를 함께 세울 때 추진력과 현실 감각이 살아납니다.",
    caution: "관계가 성과나 책임 중심으로 흐르면 감정 확인이 늦어질 수 있습니다.",
    counsel: "실행 계획 앞에 마음 상태를 먼저 묻는 순서를 두어야 합니다.",
  },
  "위성": {
    axis: "현실 목표와 역할 조율의 인연",
    strength: "목표를 함께 세울 때 추진력과 현실 감각이 살아납니다.",
    caution: "관계가 성과나 책임 중심으로 흐르면 감정 확인이 늦어질 수 있습니다.",
    counsel: "실행 계획 앞에 마음 상태를 먼저 묻는 순서를 두어야 합니다.",
  },
});
const SUKYO_DISTANCE_GUIDES = Object.freeze({
  "동일숙": "같은 결이 강하게 겹치므로 편안함과 반복 습관을 함께 읽습니다.",
  "근거리": "반응이 빠르고 체감이 가까워 작은 말과 행동도 크게 닿습니다.",
  "중거리": "끌림과 완충이 함께 있어 주기적인 확인 대화가 관계를 안정시킵니다.",
  "원거리": "각자의 리듬과 자율성이 중요하며 연락 간격과 약속의 기준이 관계를 지킵니다.",
  "거리 미확인": "거리 정보가 흐릴 때는 단정 대신 관찰 가능한 반응과 합의 기준을 먼저 봅니다.",
});
const SUKYO_CHAPTER_EXPERT_FOCUS = Object.freeze({
  1: "본명숙, 관계분류, 거리감을 한 흐름으로 묶어 첫 상담 총론을 제시한다.",
  2: "각자의 본명숙 기질을 사랑의 반응, 방어, 안정 욕구로 번역한다.",
  3: "관계분류와 양방향 작용을 분리해 A가 받는 힘과 B가 받는 힘을 다르게 읽는다.",
  4: "첫 끌림을 외형보다 숙의 반응, 낯섦, 신뢰 형성 속도로 설명한다.",
  5: "애착 속도, 불안 반응, 회복 대화를 달의 리듬으로 풀어낸다.",
  6: "연락 빈도, 말투, 화해 표현을 거리감과 관계분류의 실제 운영으로 연결한다.",
  7: "갈등을 성격 탓으로 단정하지 않고 관계분류의 그림자와 회복 문턱으로 읽는다.",
  8: "데이트, 친밀감, 권태를 두 숙의 안정 욕구와 변화 욕구로 조율한다.",
  9: "동거와 결혼은 단정하지 말고 생활 리듬, 책임 분담, 가족 경계로 상담한다.",
  10: "다름을 약점이 아니라 상보 작용과 성장 과제로 번역한다.",
  11: "돈, 일, 루틴은 감정의 문제가 아니라 안정감과 선택 기준의 차이로 읽는다.",
  12: "주변 인연과 환경이 관계 안으로 들어오는 방식을 경계선 상담으로 풀어낸다.",
  13: "전생 인연감은 신비롭게 다루되 운명 단정 없이 반복 감정과 성장 과제로 말한다.",
  14: "12개월 흐름은 예언처럼 단정하지 말고 가까워질 때와 거리를 둘 때의 운영법으로 제시한다.",
  15: "전체 상담을 행동 약속, 말의 규칙, 회복 루틴으로 정리한다.",
});
const SUKYO_RELATION_METRIC_PROFILES = Object.freeze({
  "명": { magnetism: 78, temperature: 76, chemistry: 80, stability: 76, growth: 68, communication: 74, conflict: 46 },
  "업태": { magnetism: 88, temperature: 78, chemistry: 82, stability: 62, growth: 86, communication: 64, conflict: 62 },
  "영친": { magnetism: 78, temperature: 82, chemistry: 84, stability: 88, growth: 74, communication: 82, conflict: 34 },
  "우쇠": { magnetism: 74, temperature: 84, chemistry: 76, stability: 66, growth: 72, communication: 78, conflict: 52 },
  "안괴": { magnetism: 92, temperature: 86, chemistry: 84, stability: 50, growth: 84, communication: 58, conflict: 74 },
  "성위": { magnetism: 70, temperature: 68, chemistry: 72, stability: 74, growth: 76, communication: 68, conflict: 48 },
  "위성": { magnetism: 70, temperature: 68, chemistry: 72, stability: 74, growth: 76, communication: 68, conflict: 48 },
});
const SUKYO_DISTANCE_METRIC_ADJUSTMENTS = Object.freeze({
  "동일숙": { stability: 5, communication: 2, conflict: 3 },
  "근거리": { magnetism: 6, temperature: 4, communication: -2, conflict: 8 },
  "중거리": { stability: 4, communication: 3, conflict: -2 },
  "원거리": { growth: 5, magnetism: -3, communication: -4, conflict: 5 },
  "거리 미확인": {},
});
const SUKYO_METRIC_LABELS = Object.freeze({
  overall: "종합 점수",
  magnetism: "끌림",
  temperature: "감정 온도",
  chemistry: "관계 화학",
  stability: "안정도",
  growth: "성장성",
  communication: "소통",
  conflict: "긴장 완화",
});

function clean(value, max = 100000) {
  const text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  return Number.isFinite(max) ? text.slice(0, max) : text;
}

function block(value, max = 100000) {
  const text = String(value == null ? "" : value).replace(/\r/g, "").trim();
  return Number.isFinite(max) ? text.slice(0, max) : text;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function stripTags(value) {
  return clean(decodeEntities(String(value || "").replace(/<[^>]+>/g, " ")));
}

function hashStable(value) {
  const input = JSON.stringify(value, Object.keys(value || {}).sort());
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalizeDate(profile = {}) {
  const y = Number(profile.birthYear ?? profile.year ?? profile.birth?.year);
  const m = Number(profile.birthMonth ?? profile.month ?? profile.birth?.month);
  const d = Number(profile.birthDay ?? profile.day ?? profile.birth?.day);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "";
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function normalizeProfile(profile = {}, fallbackName = "이름 미입력") {
  return {
    ...profile,
    name: clean(profile.name || profile.displayName || fallbackName, 80),
    birthYear: Number(profile.birthYear ?? profile.year ?? profile.birth?.year),
    birthMonth: Number(profile.birthMonth ?? profile.month ?? profile.birth?.month),
    birthDay: Number(profile.birthDay ?? profile.day ?? profile.birth?.day),
    birthHour: Number.isFinite(Number(profile.birthHour ?? profile.hour)) ? Number(profile.birthHour ?? profile.hour) : 12,
    birthMinute: Number.isFinite(Number(profile.birthMinute ?? profile.minute)) ? Number(profile.birthMinute ?? profile.minute) : 0,
    gender: clean(profile.gender || profile.sex || "", 30),
    calendarType: clean(profile.calendarType || profile.calendar || "solar", 20),
  };
}

function buildSukuyoForProfile(profile = {}) {
  const p = normalizeProfile(profile);
  if (!Number.isFinite(p.birthYear) || !Number.isFinite(p.birthMonth) || !Number.isFinite(p.birthDay)) return null;
  if (p.calendarType === "lunar") {
    return buildSukuyoFromLunar(p.birthMonth, p.birthDay, { isLeapMonth: false, source: "user-lunar-input" });
  }
  const lunar = Solar.fromYmdHms(p.birthYear, p.birthMonth, p.birthDay, p.birthHour, p.birthMinute, 0).getLunar();
  const lunarMonth = Number(lunar.getMonth());
  return buildSukuyoFromLunar(Math.abs(lunarMonth), Number(lunar.getDay()), {
    isLeapMonth: lunarMonth < 0,
    source: "lunar-javascript",
  });
}

function syukuLabel(sukuyo = {}) {
  const index = Number(sukuyo.index);
  if (Number.isFinite(index) && SYUKU_LABELS[index]) {
    return {
      index,
      ko: SYUKU_LABELS[index],
      mixed: SYUKU_MIXED_LABELS[index],
      element: clean(sukuyo.element || ""),
      direction: clean(sukuyo.direction || ""),
    };
  }
  const raw = clean(sukuyo.syukuKorean || sukuyo.nameKo || sukuyo.syuku || "");
  const ko = raw ? raw.replace(/宿/g, "숙") : "본명숙";
  return {
    index: Number.isFinite(index) ? index : null,
    ko,
    mixed: raw ? raw.replace(/숙/g, "宿") : "본명宿",
    element: clean(sukuyo.element || ""),
    direction: clean(sukuyo.direction || ""),
  };
}

function relationLabelFromDistance(forwardDistance) {
  if (forwardDistance == null || !Number.isFinite(Number(forwardDistance))) return "관계 미확인";
  const d = ((Number(forwardDistance) % 27) + 27) % 27;
  if (d === 0) return "명";
  if (d === 9 || d === 18) return "업태";
  if ([1, 8, 10, 17, 19, 26].includes(d)) return "영친";
  if ([2, 7, 11, 16, 20, 25].includes(d)) return "우쇠";
  if ([3, 6, 12, 15, 21, 24].includes(d)) return "안괴";
  if ([4, 13, 22].includes(d)) return "성위";
  if ([5, 14, 23].includes(d)) return "위성";
  return "관계 미확인";
}

function normalizeSukyoDistance(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return ((Math.round(n) % 27) + 27) % 27;
}

function reverseSukyoDistance(forwardDistance) {
  const forward = normalizeSukyoDistance(forwardDistance);
  if (forward == null) return null;
  return (27 - forward) % 27;
}

function shortestSukyoDistance(forwardDistance, reverseDistance, explicitDistance = null) {
  const explicit = Number(explicitDistance);
  if (Number.isFinite(explicit)) return Math.max(0, Math.min(13, Math.round(explicit)));
  const distances = [normalizeSukyoDistance(forwardDistance), normalizeSukyoDistance(reverseDistance)]
    .filter((value) => value != null)
    .map((value) => Math.min(value, 27 - value));
  if (!distances.length) return null;
  return Math.min(...distances);
}

function distanceLabel(shortestDistance, relationType = "") {
  if (shortestDistance == null || !Number.isFinite(Number(shortestDistance))) {
    return relationType === "명" ? "동일숙" : "거리 미확인";
  }
  const d = Number(shortestDistance);
  if (relationType === "명" || d === 0) return "동일숙";
  if (d <= 4) return "근거리";
  if (d <= 10) return "중거리";
  return "원거리";
}

function scoreLabel(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return "조율형 궁합";
  if (n >= 80) return "강한 결합과 성장을 품은 궁합";
  if (n >= 65) return "끌림과 현실 조율이 함께 필요한 궁합";
  if (n >= 50) return "조율할수록 안정되는 현실형 궁합";
  return "천천히 신뢰를 쌓아야 하는 신중형 궁합";
}

function relationConsultationGuide(relationType = "") {
  const key = clean(relationType).replace(/[()（）\s]/g, "");
  return SUKYO_RELATION_GUIDES[key] || {
    axis: "관계 결 미확정",
    strength: "두 사람의 실제 반응을 중심으로 안정되는 지점을 살핍니다.",
    caution: "계산값이 흐릴수록 단정 대신 관찰 가능한 말과 행동을 기준으로 봅니다.",
    counsel: "먼저 맞는 부분과 어긋나는 부분을 분리해 대화하는 것이 좋습니다.",
  };
}

function distanceConsultationGuide(distance = "") {
  const key = clean(distance);
  return SUKYO_DISTANCE_GUIDES[key] || SUKYO_DISTANCE_GUIDES["거리 미확인"];
}

function resolveMetricNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? clampScore(n, 0) : fallback;
}

function deriveCompatibilityMetrics({ relationType = "", distance = "", score = null } = {}) {
  const profile = SUKYO_RELATION_METRIC_PROFILES[clean(relationType)] || {
    magnetism: 66,
    temperature: 66,
    chemistry: 66,
    stability: 64,
    growth: 64,
    communication: 64,
    conflict: 50,
  };
  const adjustment = SUKYO_DISTANCE_METRIC_ADJUSTMENTS[clean(distance)] || {};
  const total = resolveMetricNumber(score, null);
  return Object.fromEntries(
    Object.keys(SUKYO_METRIC_LABELS)
      .filter((key) => key !== "overall")
      .map((key) => {
        const base = Number(profile[key] ?? 60);
        const blended = total == null ? base : (base * 0.68) + (total * 0.32);
        return [key, clampScore(blended + Number(adjustment[key] || 0), 0)];
      }),
  );
}

function resolveCompatibilityMetrics(rawMetrics = {}, context = {}) {
  const derived = deriveCompatibilityMetrics(context);
  const metricKeys = ["magnetism", "temperature", "chemistry", "stability", "growth", "communication", "conflict"];
  const metrics = Object.fromEntries(
    metricKeys.map((key) => [key, resolveMetricNumber(rawMetrics[key], derived[key])]),
  );
  metrics.overall = resolveMetricNumber(context.score, Math.round((metrics.chemistry + metrics.stability + metrics.growth + metrics.communication + (100 - metrics.conflict)) / 5));
  metrics.source = metricKeys.some((key) => resolveMetricNumber(rawMetrics[key], null) != null)
    ? "canonical"
    : "relation-distance";
  return metrics;
}

function clampScore(score, fallback = 0) {
  const n = Number(score);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function scoreColor(score) {
  const n = clampScore(score, 0);
  if (n >= 80) return "#34d399";
  if (n >= 60) return "#a78bfa";
  if (n >= 40) return "#f59e0b";
  return "#f87171";
}

function scoreStars(score) {
  const filled = Math.max(0, Math.min(5, Math.round(clampScore(score, 0) / 20)));
  return `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`;
}

function scoreGrade(score, fallback = "") {
  const label = clean(fallback, 80);
  if (label) return label;
  const n = clampScore(score, 0);
  if (n >= 80) return "깊은 인연의 동반자";
  if (n >= 60) return "서로를 키우는 조율의 인연";
  if (n >= 40) return "천천히 맞춰 가는 배움의 인연";
  return "거리를 살피며 다가가는 신중한 인연";
}

function drawScoreGauge(_doc, _x, _y, width, score, height = 8) {
  const n = clampScore(score, 0);
  const style = [
    `--score-fill:${n}%`,
    `--score-color:${scoreColor(n)}`,
    `--score-height:${Math.max(4, Number(height) || 8)}px`,
    Number(width) > 0 ? `width:${Number(width)}pt` : "",
  ].filter(Boolean).join(";");
  return `<span class="score-gauge" data-score="${n}" data-fill="${n}" style="${style}"><span></span></span>`;
}

function drawChapterHeader(_doc, chapterNum, title, score, icon = "◈", basis = "") {
  const safeScore = clampScore(score, 0);
  return `
    <header class="chapter-header" data-chapter-no="${Number(chapterNum) || 0}" data-chapter-score="${safeScore}" data-score-basis="${escapeHtml(basis || "종합 점수")}">
      <div class="chapter-header__title">
        <span>Chapter ${String(chapterNum).padStart(2, "0")}</span>
        <strong>${escapeHtml(icon)} ${escapeHtml(title)}</strong>
      </div>
      <div class="chapter-header__rule"></div>
      <div class="chapter-header__score">
        <span>이 챕터 점수</span>
        ${drawScoreGauge(null, 0, 0, 180, safeScore, 6)}
        <b>${safeScore}점</b>
      </div>
      ${basis ? `<p class="chapter-header__basis">계산축: ${escapeHtml(basis)}</p>` : ""}
    </header>`;
}

function drawComparisonTable(_doc, headers = [], rows = []) {
  const normalizedRows = asArray(rows).filter((row) => Array.isArray(row) && (clean(row[0]) || clean(row[1])));
  if (!normalizedRows.length) return "";
  return `
    <table class="comparison-table">
      <thead>
        <tr>
          <th>${escapeHtml(headers[0] || "이 궁합의 강점")}</th>
          <th>${escapeHtml(headers[1] || "함께 보완할 부분")}</th>
        </tr>
      </thead>
      <tbody>
        ${normalizedRows.map((row) => `
          <tr>
            <td>${escapeHtml(row[0] || "")}</td>
            <td>${escapeHtml(row[1] || "")}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
}

function drawCalloutBox(_doc, text, title = "핵심 조언") {
  const body = clean(text, 260);
  if (!body) return "";
  return `
    <aside class="advice-callout">
      <strong>✦ ${escapeHtml(title)}</strong>
      <p>“${escapeHtml(body.replace(/^["“”']+|["“”']+$/g, ""))}”</p>
    </aside>`;
}

function drawScoreSummaryTable(_doc, chapters = []) {
  const rows = asArray(chapters)
    .map((chapter) => ({
      num: Number(chapter.num || chapter.order || chapter.chapterNo),
      name: clean(chapter.name || chapter.title, 120),
      score: clampScore(chapter.score, NaN),
      basis: clean(chapter.basis || chapter.scoreBasis || "", 80),
    }))
    .filter((chapter) => Number.isFinite(chapter.num) && chapter.name && Number.isFinite(chapter.score));
  if (!rows.length) return "";
  const avg = clampScore(rows.reduce((sum, row) => sum + row.score, 0) / rows.length, 0);
  return `
    <section class="score-summary-page">
      <h1>✦ 15개 영역 종합 점수표</h1>
      <table class="score-summary-table">
        <thead>
          <tr><th>#</th><th>챕터명</th><th>계산축</th><th>점수</th><th>게이지</th></tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${row.num}</td>
              <td>${escapeHtml(row.name)}</td>
              <td>${escapeHtml(row.basis || "종합 점수")}</td>
              <td>${row.score}점</td>
              <td>${drawScoreGauge(null, 0, 0, 120, row.score, 4)}</td>
            </tr>`).join("")}
          <tr class="score-summary-table__total">
            <td colspan="3">총점 평균</td>
            <td>${avg}점</td>
            <td>${drawScoreGauge(null, 0, 0, 120, avg, 4)}</td>
          </tr>
        </tbody>
      </table>
    </section>`;
}

function resolveCanonical(input = {}) {
  if (input?.canonical?.personA) return input.canonical;
  if (input?.sukuyoCompatibilityJson?.personA) return input.sukuyoCompatibilityJson;
  if (input?.localSukuyoCompatibilityJson?.personA) return input.localSukuyoCompatibilityJson;

  const userProfile = normalizeProfile(input.userProfile || input.self || input.personA || input.person1 || {});
  const partnerProfile = normalizeProfile(input.partnerProfile || input.partner || input.personB || input.person2 || {}, "상대");
  const userSukyo = input.userSukyo || buildSukuyoForProfile(userProfile);
  const partnerSukyo = input.partnerSukyo || buildSukuyoForProfile(partnerProfile);
  if (!userSukyo || !partnerSukyo) return null;

  return buildCanonicalSukuyoCompatibility({
    reportType: "compatibility",
    personAName: userProfile.name,
    personBName: partnerProfile.name,
    personAInput: {
      year: userProfile.birthYear,
      month: userProfile.birthMonth,
      day: userProfile.birthDay,
      hour: userProfile.birthHour,
      minute: userProfile.birthMinute,
    },
    personBInput: {
      year: partnerProfile.birthYear,
      month: partnerProfile.birthMonth,
      day: partnerProfile.birthDay,
      hour: partnerProfile.birthHour,
      minute: partnerProfile.birthMinute,
    },
    personASukuyo: userSukyo,
    personBSukuyo: partnerSukyo,
    calendarSource: "lunar-javascript",
    methodVersion: "sukyo-premium-pdf-v2",
  });
}

function buildFacts(seed = {}) {
  const canonical = resolveCanonical(seed) || {};
  const userProfile = normalizeProfile(seed.userProfile || seed.self || seed.personA || seed.person1 || canonical.personA || {}, "본인");
  const partnerProfile = normalizeProfile(seed.partnerProfile || seed.partner || seed.personB || seed.person2 || canonical.personB || {}, "상대");
  const personA = canonical.personA || {};
  const personB = canonical.personB || {};
  const compatibility = canonical.compatibility || seed.compatibility || {};
  const aSyuku = syukuLabel(seed.userSukyo || personA.sukuyo || {});
  const bSyuku = syukuLabel(seed.partnerSukyo || personB.sukuyo || {});
  const forwardDistance = normalizeSukyoDistance(compatibility.forwardDistance ?? compatibility.distanceFromAToB);
  const reverseDistance = normalizeSukyoDistance(compatibility.reverseDistance ?? compatibility.distanceFromBToA ?? reverseSukyoDistance(forwardDistance));
  const shortestDistance = shortestSukyoDistance(
    forwardDistance,
    reverseDistance,
    compatibility.shortestDistance ?? compatibility.distanceMetrics?.shortestDistance,
  );
  const relationType = relationLabelFromDistance(forwardDistance);
  const distance = distanceLabel(shortestDistance, relationType);
  const score = Number(compatibility.compatibilityIndex ?? compatibility.score ?? seed.score);
  const rawMetrics = {
    magnetism: compatibility.magnetism,
    temperature: compatibility.temperature,
    chemistry: compatibility.chemistryScore,
    stability: compatibility.stabilityScore,
    growth: compatibility.growthScore,
    conflict: compatibility.conflictScore,
    communication: compatibility.communicationScore,
  };
  const metrics = resolveCompatibilityMetrics(rawMetrics, { relationType, distance, score });

  return {
    reportId: clean(seed.reportId || ""),
    sessionId: clean(seed.sessionId || ""),
    requestId: clean(seed.requestId || ""),
    mode: "compatibility",
    personA: {
      name: userProfile.name || clean(personA.name || "본인"),
      birthDate: normalizeDate(userProfile) || clean(personA.birth?.solarDate || ""),
      gender: clean(userProfile.gender || ""),
      syuku: aSyuku.ko,
      syukuMixed: aSyuku.mixed,
      syukuIndex: aSyuku.index,
      element: aSyuku.element,
      direction: aSyuku.direction,
    },
    personB: {
      name: partnerProfile.name || clean(personB.name || "상대"),
      birthDate: normalizeDate(partnerProfile) || clean(personB.birth?.solarDate || ""),
      gender: clean(partnerProfile.gender || ""),
      syuku: bSyuku.ko,
      syukuMixed: bSyuku.mixed,
      syukuIndex: bSyuku.index,
      element: bSyuku.element,
      direction: bSyuku.direction,
    },
    compatibility: {
      relationType,
      distance,
      forwardDistance: Number.isFinite(forwardDistance) ? forwardDistance : null,
      reverseDistance: Number.isFinite(reverseDistance) ? reverseDistance : null,
      shortestDistance: Number.isFinite(shortestDistance) ? shortestDistance : null,
      score: Number.isFinite(score) ? score : null,
      scoreLabel: scoreLabel(score),
      relationGuide: relationConsultationGuide(relationType),
      distanceGuide: distanceConsultationGuide(distance),
      aToB: clean(compatibility.directionFromAToB || ""),
      bToA: clean(compatibility.directionFromBToA || ""),
      elementHarmony: clean(compatibility.elementHarmony?.relation || ""),
      metrics,
    },
    calculation: {
      relationType,
      distance,
      score: Number.isFinite(score) ? score : null,
      scoreLabel: scoreLabel(score),
      aSyuku: aSyuku.ko,
      bSyuku: bSyuku.ko,
      aSyukuIndex: aSyuku.index,
      bSyukuIndex: bSyuku.index,
      forwardDistance: Number.isFinite(forwardDistance) ? forwardDistance : null,
      reverseDistance: Number.isFinite(reverseDistance) ? reverseDistance : null,
      shortestDistance: Number.isFinite(shortestDistance) ? shortestDistance : null,
      metrics,
    },
  };
}

export function buildSukyoPdfSeed(input = {}) {
  const canonical = resolveCanonical(input);
  const userProfile = normalizeProfile(input.userProfile || input.self || input.personA || input.person1 || canonical?.personA || {}, "본인");
  const partnerProfile = normalizeProfile(input.partnerProfile || input.partner || input.personB || input.person2 || canonical?.personB || {}, "상대");
  return {
    ...input,
    mode: "compatibility",
    userProfile,
    partnerProfile,
    userSukyo: input.userSukyo || canonical?.personA?.sukuyo || buildSukuyoForProfile(userProfile),
    partnerSukyo: input.partnerSukyo || canonical?.personB?.sukuyo || buildSukuyoForProfile(partnerProfile),
    canonical,
    sukuyoCompatibilityJson: canonical,
    localSukuyoCompatibilityJson: canonical,
  };
}

export function validateSukyoPdfInput(raw = {}) {
  const self = normalizeProfile(raw.self || raw.userProfile || raw.personA || raw.person1 || {});
  const partner = normalizeProfile(raw.partner || raw.partnerProfile || raw.personB || raw.person2 || {}, "상대");
  const hardMissingFields = [];
  const softMissingFields = [];

  if (!self.name) softMissingFields.push("self.name");
  if (!partner.name) softMissingFields.push("partner.name");
  if (!Number.isFinite(self.birthYear) || !Number.isFinite(self.birthMonth) || !Number.isFinite(self.birthDay)) hardMissingFields.push("self.birthDate");
  if (!Number.isFinite(partner.birthYear) || !Number.isFinite(partner.birthMonth) || !Number.isFinite(partner.birthDay)) hardMissingFields.push("partner.birthDate");
  if (!Number.isFinite(self.birthHour)) softMissingFields.push("self.birthTime");
  if (!Number.isFinite(partner.birthHour)) softMissingFields.push("partner.birthTime");

  return {
    ok: hardMissingFields.length === 0,
    canGenerate: hardMissingFields.length === 0,
    hardMissingFields,
    softMissingFields,
    normalized: { self, partner, mode: "compatibility" },
  };
}

function withTimeout(promise, timeoutMs) {
  let timer = null;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error("provider_timeout"), { status: 504 })), Math.max(1000, Number(timeoutMs) || PROVIDER_TIMEOUT_MS));
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function cleanBlock(value) {
  let html = block(value);
  html = html.replace(/^```(?:html)?/i, "").replace(/```$/i, "").trim();
  const start = html.search(/<article\b/i);
  const end = html.toLowerCase().lastIndexOf("</article>");
  if (start >= 0 && end >= start) html = html.slice(start, end + "</article>".length);
  return html.replace(DANGEROUS_HTML_RE, "").trim();
}

function hasForbiddenPdfToken(value = "") {
  const text = String(value || "").toLowerCase();
  return FORBIDDEN_PDF_TOKENS.some((token) => text.includes(String(token).toLowerCase()));
}

function findForbiddenPdfTokens(value = "") {
  const text = String(value || "").toLowerCase();
  return FORBIDDEN_PDF_TOKENS.filter((token) => text.includes(String(token).toLowerCase()));
}

function containsKorean(value = "") {
  return /[가-힣]/.test(String(value || ""));
}

function extractTag(html, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  return stripTags(html.match(re)?.[1] || "");
}

function extractSections(html) {
  const sections = [];
  const re = /<section\b[^>]*>([\s\S]*?)<\/section>/gi;
  let match;
  while ((match = re.exec(html))) {
    const fragment = match[1] || "";
    const title = extractTag(fragment, "h2");
    const paragraphs = [];
    const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
    let pMatch;
    while ((pMatch = pRe.exec(fragment))) {
      const text = stripTags(pMatch[1]);
      if (text) paragraphs.push(text);
    }
    const body = paragraphs.length ? paragraphs.join("\n\n") : stripTags(fragment.replace(/<h2\b[\s\S]*?<\/h2>/i, ""));
    sections.push({ title, paragraphs: paragraphs.length ? paragraphs : body.split(/\n{2,}/).map((item) => clean(item)).filter(Boolean), body });
  }
  return sections;
}

function validateSukyoPremiumChapterHtml(html, chapterSpec) {
  const issues = [];
  const source = cleanBlock(html);
  if (!source) issues.push("html.empty");
  const sourceForbiddenTokens = findForbiddenPdfTokens(source);
  if (sourceForbiddenTokens.length) issues.push(`html.forbidden-token:${sourceForbiddenTokens.join("|")}`);
  if (DANGEROUS_HTML_RE.test(source)) issues.push("html.unsafe-tag");
  if (!new RegExp(`<article\\b[^>]*data-chapter-id=["']${chapterSpec.id}["']`, "i").test(source)) issues.push("chapter.id");
  const h1 = extractTag(source, "h1");
  if (!h1.includes(chapterSpec.title)) issues.push("chapter.title");
  const sections = extractSections(source);
  const expected = asArray(chapterSpec.sections);
  if (sections.length !== expected.length) issues.push("section.count");
  expected.forEach((title, index) => {
    const section = sections[index] || {};
    if (clean(section.title) !== clean(title)) issues.push(`section.title.${index + 1}`);
    if (!clean(section.body) || clean(section.body).length < 120) issues.push(`section.body.${index + 1}`);
    const sectionForbiddenTokens = findForbiddenPdfTokens(section.body);
    if (sectionForbiddenTokens.length) issues.push(`section.forbidden.${index + 1}:${sectionForbiddenTokens.join("|")}`);
    if (!containsKorean(section.body)) issues.push(`section.korean.${index + 1}`);
  });
  const minChapterLength = Math.max(1000, Math.floor((Number(chapterSpec.minLength) || 1600) * 0.75));
  if (stripTags(source).length < minChapterLength) issues.push("chapter.length");
  return { ok: issues.length === 0, issues, html: source };
}

function parseSukyoPremiumChapterHtml(html, chapterSpec) {
  const source = cleanBlock(html);
  const sections = extractSections(source).map((section, index) => ({
    id: `${chapterSpec.id}-s${index + 1}`,
    heading: chapterSpec.sections[index] || section.title,
    title: chapterSpec.sections[index] || section.title,
    body: section.body,
    paragraphs: section.paragraphs,
  }));
  const firstBody = sections[0]?.body || "";
  const lastBody = sections[sections.length - 1]?.body || "";
  return {
    key: chapterSpec.key || chapterSpec.id,
    id: chapterSpec.id,
    order: chapterSpec.order,
    chapterNo: chapterSpec.order,
    title: chapterSpec.title,
    summary: clean(firstBody, 700),
    opening: clean(firstBody, 700),
    prescription: {
      lead: clean(lastBody, 700),
      actions: sections.slice(-3).map((section) => clean(section.heading, 100)),
    },
    sections,
    html: source,
  };
}

function buildSystemPrompt() {
  return [
    "너는 숙요점 27숙 궁합을 상담하는 전문 숙요점 상담가다.",
    "계산은 절대 새로 하지 말고, 제공된 계산 요약만 사실 기준으로 삼아라.",
    "해석의 중심축은 본명숙, 관계분류, 근거리·중거리·원거리, 양방향 작용, 감정 회복 리듬이다.",
    "명·업태·영친·우쇠·안괴·성위/위성의 의미를 관계의 장점, 그림자, 조율법으로 풀어라.",
    "출력은 반드시 HTML 조각 하나만 작성한다.",
    "허용 태그는 article, h1, section, h2, p, strong, em뿐이다.",
    "JSON, 마크다운 코드블록, 내부 키 이름, 기술 설명, 실패 사유, 로컬 생성 흔적을 출력하지 마라.",
    "각 소제목마다 2문단 이상 쓰고, 현실 장면 예시를 포함하라.",
    "공포를 조장하거나 이별과 결혼을 단정하지 말고, 상담가처럼 부드럽고 구체적으로 말하라.",
    "본문에는 json, payload, fallback, llm, api, debug, engine, local, localdraft, undefined, null, NaN, about:blank 단어를 절대 쓰지 마라.",
    "데이터, 템플릿, 프롬프트, 생성 지침, 검증 같은 제작 과정 표현을 본문에 남기지 마라.",
  ].join("\n");
}

function buildChapterPrompt({ facts, chapterSpec, previousSummary = "" }) {
  const sections = chapterSpec.sections.map((title) => `<section><h2>${escapeHtml(title)}</h2><p>...</p><p>...</p></section>`).join("\n");
  const relationGuide = facts.compatibility.relationGuide || relationConsultationGuide(facts.compatibility.relationType);
  const distanceGuide = facts.compatibility.distanceGuide || distanceConsultationGuide(facts.compatibility.distance);
  const chapterFocus = SUKYO_CHAPTER_EXPERT_FOCUS[chapterSpec.order] || chapterSpec.purpose;
  return [
    "아래 숙요 계산 요약과 상담 기준을 바탕으로 숙요점 프리미엄 궁합 PDF 한 장을 작성해 주세요.",
    "반드시 지정된 HTML 구조와 소제목을 그대로 사용해 주세요.",
    "소제목은 빠짐없이 모두 포함하고, 각 소제목마다 최소 2문단을 작성해 주세요.",
    "각 문단은 숙요점 상담가가 직접 말하듯 자연스럽게 쓰고, 관계분류와 거리감이 실제 대화, 생활, 가족, 돈, 재회, 결혼 주제에서 어떻게 나타나는지 구체적으로 풀어 주세요.",
    previousSummary ? `앞 장의 마지막 흐름 요약: ${previousSummary}` : "",
    "",
    `A: ${facts.personA.name} / ${facts.personA.syuku} / 생년월일 ${facts.personA.birthDate || "미상"} / 성별 ${facts.personA.gender || "미상"}`,
    `B: ${facts.personB.name} / ${facts.personB.syuku} / 생년월일 ${facts.personB.birthDate || "미상"} / 성별 ${facts.personB.gender || "미상"}`,
    `관계 분류: ${facts.compatibility.relationType}`,
    `관계분류 상담축: ${relationGuide.axis}`,
    `관계분류 강점: ${relationGuide.strength}`,
    `관계분류 그림자: ${relationGuide.caution}`,
    `관계분류 조율법: ${relationGuide.counsel}`,
    `거리: ${facts.compatibility.distance}`,
    `거리 상담축: ${distanceGuide}`,
    `A에서 B로 향하는 거리: ${facts.compatibility.forwardDistance ?? "미상"}`,
    `B에서 A로 향하는 거리: ${facts.compatibility.reverseDistance ?? "미상"}`,
    `종합 점수: ${facts.compatibility.score ?? "미상"} / ${facts.compatibility.scoreLabel}`,
    facts.compatibility.elementHarmony ? `오행 흐름: ${facts.compatibility.elementHarmony}` : "",
    "",
    `현재 장: ${chapterSpec.order}. ${chapterSpec.title}`,
    `장 목적: ${chapterSpec.purpose}`,
    `전문 상담 초점: ${chapterFocus}`,
    `최소 본문 길이: 공백을 제외하고 ${Number(chapterSpec.minLength || 1600)}자 이상`,
    "문체 기준: 기능 설명처럼 쓰지 말고 숙요점 상담가가 두 사람에게 직접 전하는 말로 쓴다.",
    "금지 문체: 이 결과는, 이 기능은, 분석 결과는, 데이터에 따르면, 템플릿, 로컬, 자동 생성, 검증, 스키마.",
    "",
    "출력 형식:",
    `<article data-chapter-id="${chapterSpec.id}">`,
    `<h1>${escapeHtml(chapterSpec.title)}</h1>`,
    sections,
    "</article>",
  ].filter(Boolean).join("\n");
}

function buildRepairPrompt({ facts, chapterSpec, previousHtml, issues, previousSummary }) {
  return [
    "아래 HTML은 숙요점 PDF 검증에 실패했습니다. 같은 장을 새 HTML 조각으로 다시 작성해 주세요.",
    `검증 실패 항목: ${asArray(issues).join(", ")}`,
    "이전 출력은 참고만 하고 그대로 반복하지 마세요.",
    previousHtml ? `이전 출력 일부: ${clean(stripTags(previousHtml), 1200)}` : "",
    buildChapterPrompt({ facts, chapterSpec, previousSummary }),
  ].filter(Boolean).join("\n\n");
}

async function callWorkersAi(env, prompt, options = {}) {
  const started = Date.now();
  try {
    if (!env?.AI?.run) {
      return { ok: false, provider: "workers-ai", errorCode: "workers_ai_not_configured", latencyMs: Date.now() - started };
    }
    const model = clean(env.SUKYO_PREMIUM_WORKERS_AI_MODEL || env.WORKERS_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct");
    const result = await withTimeout(env.AI.run(model, {
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: prompt },
      ],
      temperature: Number(env.SUKYO_PREMIUM_LLM_TEMPERATURE || 0.72),
      max_tokens: Number(options.maxTokens || env.SUKYO_PREMIUM_CHAPTER_MAX_TOKENS || 12000),
    }), Number(options.timeoutMs || env.SUKYO_PREMIUM_LLM_TIMEOUT_MS || PROVIDER_TIMEOUT_MS));
    const rawText = cleanBlock(result?.response || result?.result?.response || result?.text || result?.content || "");
    if (!rawText) return { ok: false, provider: "workers-ai", errorCode: "empty_response", latencyMs: Date.now() - started };
    return { ok: true, provider: "workers-ai", rawText, usage: result?.usage, latencyMs: Date.now() - started };
  } catch (error) {
    return {
      ok: false,
      provider: "workers-ai",
      errorCode: "provider_exception",
      errorMessage: clean(error?.message || String(error), 300),
      latencyMs: Date.now() - started,
    };
  }
}

async function callGemini(env, prompt, options = {}) {
  const started = Date.now();
  try {
    const result = await generateWithGemini(env, `${buildSystemPrompt()}\n\n${prompt}`, {
      modelEnvKeys: ["SUKYO_PREMIUM_GEMINI_MODEL", "SUKUYO_GEMINI_MODEL", "GEMINI_MODEL"],
      timeoutMs: Number(options.timeoutMs || env.SUKYO_PREMIUM_LLM_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || PROVIDER_TIMEOUT_MS),
      maxOutputTokens: Number(options.maxTokens || env.SUKYO_PREMIUM_GEMINI_MAX_TOKENS || env.SUKYO_PREMIUM_CHAPTER_MAX_TOKENS || 12000),
      temperature: Number(env.SUKYO_PREMIUM_LLM_TEMPERATURE || 0.72),
      requestId: options.requestId,
    });
    if (result?.ok === false) {
      return {
        ok: false,
        provider: "gemini",
        errorCode: clean(result.error || result.code || "gemini_failed"),
        errorMessage: clean(result.message || "", 300),
        status: Number(result.status || 0) || null,
        latencyMs: Date.now() - started,
      };
    }
    const rawText = cleanBlock(result?.text || result?.rawText || result?.content || result?.response || "");
    if (!rawText) return { ok: false, provider: "gemini", errorCode: "empty_response", latencyMs: Date.now() - started };
    return { ok: true, provider: "gemini", rawText, usage: result?.usage, latencyMs: Date.now() - started };
  } catch (error) {
    return {
      ok: false,
      provider: "gemini",
      errorCode: "provider_exception",
      errorMessage: clean(error?.message || String(error), 300),
      latencyMs: Date.now() - started,
    };
  }
}

async function readCache(env, key) {
  const cached = CHAPTER_CACHE.get(key);
  if (cached) return cached;
  const kv = env?.SUKYO_PREMIUM_LLM_CACHE || env?.PDF_V2_CACHE || env?.REPORT_CACHE;
  if (!kv?.get) return null;
  const text = await kv.get(key);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function writeCache(env, key, value) {
  CHAPTER_CACHE.set(key, value);
  const kv = env?.SUKYO_PREMIUM_LLM_CACHE || env?.PDF_V2_CACHE || env?.REPORT_CACHE;
  if (kv?.put) {
    await kv.put(key, JSON.stringify(value), { expirationTtl: 60 * 60 * 24 * 30 });
  }
}

function buildCacheKey(facts, chapterSpec, providerModel = "") {
  return [
    "sukyo-premium-pdf-v2",
    SUKYO_PREMIUM_CHAPTER_PLAN_VERSION,
    SUKYO_PDF_CONFIG.templateVersion,
    clean(providerModel || "workers-ai-gemini"),
    chapterSpec.id,
    hashStable({
      aBirth: facts.personA.birthDate,
      bBirth: facts.personB.birthDate,
      aSyuku: facts.personA.syukuIndex,
      bSyuku: facts.personB.syukuIndex,
      relationType: facts.compatibility.relationType,
      distance: facts.compatibility.distance,
      score: facts.compatibility.score,
    }),
  ].join(":");
}

function resolveLlmProviders(env = {}) {
  const providers = String(env?.SUKYO_PREMIUM_LLM_PROVIDERS || "workers-ai,gemini")
    .split(",")
    .map((item) => clean(item))
    .filter(Boolean);
  const unique = [];
  for (const provider of providers) {
    if (!unique.includes(provider)) unique.push(provider);
  }
  if (!unique.includes("workers-ai")) unique.unshift("workers-ai");
  if (clean(env?.SUKYO_PREMIUM_DISABLE_GEMINI_FALLBACK).toLowerCase() !== "true" && !unique.includes("gemini")) {
    unique.push("gemini");
  }
  return unique;
}

function logSukyoPdfEvent(event, data = {}) {
  console.info(`[SukyoPremiumPDF][${event}]`, {
    reportId: clean(data.reportId || ""),
    requestId: clean(data.requestId || ""),
    chapterId: clean(data.chapterId || ""),
    chapterOrder: Number(data.chapterOrder || 0) || undefined,
    provider: clean(data.provider || ""),
    retry: Number.isFinite(Number(data.retry)) ? Number(data.retry) : undefined,
    errorCode: clean(data.errorCode || ""),
    issues: Array.isArray(data.issues) ? data.issues.slice(0, 12).map((issue) => clean(issue)) : undefined,
    latencyMs: Number(data.latencyMs || 0) || undefined,
  });
}

function isRetryableProviderFailure(result = {}) {
  const status = Number(result?.status || 0) || 0;
  const errorCode = clean(result?.errorCode || "").toLowerCase();
  if (status === 429 || status >= 500) return true;
  return ["provider_exception", "timeout", "empty_response"].includes(errorCode);
}

async function generateChapter(env, facts, chapterSpec, previousSummary) {
  const modelName = clean(env?.SUKYO_PREMIUM_WORKERS_AI_MODEL || env?.WORKERS_AI_MODEL || env?.SUKYO_PREMIUM_GEMINI_MODEL || env?.GEMINI_MODEL || "workers-ai-gemini");
  const cacheKey = buildCacheKey(facts, chapterSpec, modelName);
  const cached = await readCache(env, cacheKey);
  if (cached?.html) {
    const validation = validateSukyoPremiumChapterHtml(cached.html, chapterSpec);
    if (validation.ok) {
      return {
        ok: true,
        html: validation.html,
        provider: cached.provider || "cache",
        cached: true,
        attempts: [],
      };
    }
  }

  const providers = resolveLlmProviders(env);
  const repairLimit = Math.max(0, Number(env?.SUKYO_PREMIUM_LLM_REPAIR_LIMIT ?? 2));
  const attempts = [];
  logSukyoPdfEvent("ChapterGenerationStarted", {
    reportId: facts.reportId,
    requestId: facts.requestId,
    chapterId: chapterSpec.id,
    chapterOrder: chapterSpec.order,
  });

  for (const provider of providers) {
    let prompt = buildChapterPrompt({ facts, chapterSpec, previousSummary });
    let previousHtml = "";
    for (let retry = 0; retry <= repairLimit; retry += 1) {
      const result = provider === "workers-ai"
        ? await callWorkersAi(env, prompt, { requestId: `${facts.requestId}:${chapterSpec.id}` })
        : await callGemini(env, prompt, { requestId: `${facts.requestId}:${chapterSpec.id}` });
      const attempt = {
        provider,
        retry,
        ok: Boolean(result.ok),
        errorCode: result.errorCode || "",
        status: result.status || null,
        latencyMs: result.latencyMs || 0,
      };
      attempts.push(attempt);
      if (!result.ok) {
        logSukyoPdfEvent("ChapterProviderFailed", {
          reportId: facts.reportId,
          requestId: facts.requestId,
          chapterId: chapterSpec.id,
          chapterOrder: chapterSpec.order,
          provider,
          retry,
          errorCode: attempt.errorCode,
          latencyMs: attempt.latencyMs,
        });
        if (retry >= repairLimit || !isRetryableProviderFailure(result)) break;
        continue;
      }
      previousHtml = cleanBlock(result.rawText);
      const validation = validateSukyoPremiumChapterHtml(previousHtml, chapterSpec);
      if (validation.ok) {
        await writeCache(env, cacheKey, {
          html: validation.html,
          provider,
          promptVersion: SUKYO_PDF_CONFIG.templateVersion,
          storedAt: new Date().toISOString(),
        });
        return {
          ok: true,
          html: validation.html,
          provider,
          cached: false,
          attempts,
        };
      }
      attempt.ok = false;
      attempt.errorCode = "validation_failed";
      attempt.issues = validation.issues;
      logSukyoPdfEvent("ChapterValidationFailed", {
        reportId: facts.reportId,
        requestId: facts.requestId,
        chapterId: chapterSpec.id,
        chapterOrder: chapterSpec.order,
        provider,
        retry,
        issues: validation.issues,
      });
      if (retry < repairLimit) {
        logSukyoPdfEvent("ChapterRepairStarted", {
          reportId: facts.reportId,
          requestId: facts.requestId,
          chapterId: chapterSpec.id,
          chapterOrder: chapterSpec.order,
          provider,
          retry: retry + 1,
        });
        prompt = buildRepairPrompt({
          facts,
          chapterSpec,
          previousHtml,
          issues: validation.issues,
          previousSummary,
        });
      }
    }
  }

  return {
    ok: false,
    errorCode: "chapter_generation_failed",
    chapterId: chapterSpec.id,
    chapterOrder: chapterSpec.order,
    title: chapterSpec.title,
    attempts,
  };
}

const CHAPTER_ICONS = Object.freeze(["✦", "◈", "❋", "◇", "✧", "◆"]);
const CHAPTER_SCORE_METRIC_BY_ORDER = Object.freeze({
  1: "overall",
  2: "temperature",
  3: "chemistry",
  4: "magnetism",
  5: "temperature",
  6: "communication",
  7: "conflict",
  8: "chemistry",
  9: "stability",
  10: "growth",
  11: "stability",
  12: "communication",
  13: "growth",
  14: "stability",
  15: "overall",
});

function resolveChapterScoreMeta(chapter = {}, facts = {}) {
  const explicit = clampScore(chapter.score ?? chapter.chapterScore ?? chapter.compatibilityScore, NaN);
  if (Number.isFinite(explicit)) {
    return { score: explicit, key: "overall", label: "챕터 지정값" };
  }
  const metrics = facts.compatibility?.metrics || {};
  const metricKey = CHAPTER_SCORE_METRIC_BY_ORDER[Number(chapter.order || chapter.chapterNo)];
  const metricValue = metricKey === "overall" ? Number(facts.compatibility?.score ?? metrics.overall) : Number(metrics[metricKey]);
  if (Number.isFinite(metricValue)) {
    const score = metricKey === "conflict" ? 100 - metricValue : metricValue;
    return {
      score: clampScore(score, 0),
      key: metricKey || "overall",
      label: SUKYO_METRIC_LABELS[metricKey] || "종합 점수",
    };
  }
  return { score: clampScore(facts.compatibility?.score, 0), key: "overall", label: "종합 점수" };
}

function resolveChapterScore(chapter = {}, facts = {}) {
  return resolveChapterScoreMeta(chapter, facts).score;
}

function sentenceList(value = "", limit = 2, max = 260) {
  const source = clean(stripTags(value), max * 2);
  if (!source) return [];
  const matches = source.match(/[^.!?。]+(?:다\.|요\.|니다\.|습니다\.|[.!?。])/g);
  const pieces = matches?.length ? matches : source.split(/(?<=\.)\s+/);
  return pieces.map((item) => clean(item, max)).filter(Boolean).slice(0, limit);
}

function excerpt(value = "", max = 90) {
  const sentence = sentenceList(value, 1, max)[0];
  return clean(sentence || stripTags(value), max);
}

function uniquePush(list, value, max = 4) {
  const text = clean(value, 120);
  if (!text || list.includes(text) || list.length >= max) return;
  list.push(text);
}

function sectionMatches(section = {}, keywords = []) {
  const source = `${section.heading || ""} ${section.title || ""}`.toLowerCase();
  return keywords.some((keyword) => source.includes(keyword));
}

function buildChapterComparisonRows(chapter = {}) {
  const sections = asArray(chapter.sections);
  const strengths = [];
  const improvements = [];
  const strengthWords = ["장점", "강점", "맞는", "살리는", "좋게", "안정", "끌림", "깊어", "보완"];
  const improvementWords = ["조심", "약점", "갈등", "오해", "차이", "부딪", "멀어", "불안", "위험", "주의", "다툼"];

  sections.forEach((section) => {
    const item = excerpt(section.body, 84);
    if (sectionMatches(section, strengthWords)) uniquePush(strengths, `• ${item}`, 4);
    if (sectionMatches(section, improvementWords)) uniquePush(improvements, `• ${item}`, 4);
  });

  sections.forEach((section, index) => {
    const item = excerpt(section.body, 84);
    if (index < Math.ceil(sections.length / 2)) uniquePush(strengths, `• ${item}`, 3);
    else uniquePush(improvements, `• ${item}`, 3);
  });

  const length = Math.max(strengths.length, improvements.length);
  return Array.from({ length }, (_, index) => [strengths[index] || "", improvements[index] || ""]);
}

function metricDisplayRows(facts = {}) {
  const metrics = facts.compatibility?.metrics || {};
  return [
    ["overall", "종합", facts.compatibility?.score ?? metrics.overall],
    ["magnetism", "끌림", metrics.magnetism],
    ["temperature", "감정", metrics.temperature],
    ["stability", "안정", metrics.stability],
    ["growth", "성장", metrics.growth],
    ["communication", "소통", metrics.communication],
    ["tensionRelief", "긴장 완화", Number.isFinite(Number(metrics.conflict)) ? 100 - Number(metrics.conflict) : null],
  ]
    .map(([key, label, value]) => ({ key, label, score: clampScore(value, NaN) }))
    .filter((item) => Number.isFinite(item.score));
}

function distanceGraphBar(label, value) {
  const distance = normalizeSukyoDistance(value);
  if (distance == null) return "";
  const percent = Math.max(0, Math.min(100, Math.round((distance / 26) * 100)));
  return `
    <div class="distance-row" data-distance="${distance}" data-fill="${percent}">
      <strong>${escapeHtml(label)}</strong>
      <span class="distance-track"><i style="width:${percent}%"></i></span>
      <b>${distance}칸</b>
    </div>`;
}

function renderCalculationDashboard(facts = {}) {
  const metrics = metricDisplayRows(facts);
  const metricSource = facts.compatibility?.metrics?.source === "canonical"
    ? "제공 계산 지표"
    : "관계분류·거리 산식";
  return `
    <section class="calculation-dashboard" data-relation="${escapeHtml(facts.compatibility?.relationType || "")}" data-distance-label="${escapeHtml(facts.compatibility?.distance || "")}" data-forward-distance="${facts.compatibility?.forwardDistance ?? ""}" data-reverse-distance="${facts.compatibility?.reverseDistance ?? ""}" data-shortest-distance="${facts.compatibility?.shortestDistance ?? ""}">
      <h2>계산 기반 숙요 시각 지도</h2>
      <div class="calculation-grid">
        <div>
          <span>관계분류</span>
          <strong>${escapeHtml(facts.compatibility?.relationType || "미확인")}</strong>
          <p>${escapeHtml(facts.compatibility?.relationGuide?.axis || "관계 결을 확인합니다.")}</p>
        </div>
        <div>
          <span>거리감</span>
          <strong>${escapeHtml(facts.compatibility?.distance || "미확인")}</strong>
          <p>${escapeHtml(facts.compatibility?.distanceGuide || "거리 흐름을 확인합니다.")}</p>
        </div>
        <div>
          <span>본명숙 위치</span>
          <strong>${escapeHtml(facts.personA?.syuku || "A")} · ${escapeHtml(facts.personB?.syuku || "B")}</strong>
          <p>${escapeHtml(`${facts.personA?.syukuIndex ?? "?"}번 숙 ↔ ${facts.personB?.syukuIndex ?? "?"}번 숙`)}</p>
        </div>
      </div>
      <div class="distance-graph">
        ${distanceGraphBar(`${facts.personA?.name || "A"} → ${facts.personB?.name || "B"}`, facts.compatibility?.forwardDistance)}
        ${distanceGraphBar(`${facts.personB?.name || "B"} → ${facts.personA?.name || "A"}`, facts.compatibility?.reverseDistance)}
      </div>
      <div class="metric-source">지표 기준: ${escapeHtml(metricSource)}</div>
      <div class="metric-grid">
        ${metrics.map((item) => `
          <div class="metric-item" data-metric="${escapeHtml(item.key)}" data-score="${item.score}">
            <span>${escapeHtml(item.label)}</span>
            ${drawScoreGauge(null, 0, 0, 88, item.score, 5)}
            <b>${item.score}</b>
          </div>`).join("")}
      </div>
    </section>`;
}

function renderSummaryTable(facts = {}) {
  const relationGuide = facts.compatibility?.relationGuide || relationConsultationGuide(facts.compatibility?.relationType);
  const distanceGuide = facts.compatibility?.distanceGuide || distanceConsultationGuide(facts.compatibility?.distance);
  const rows = [
    ["본명숙", facts.personA?.syukuMixed || facts.personA?.syuku, facts.personB?.syukuMixed || facts.personB?.syuku],
    ["관계분류", facts.compatibility?.relationType || "미확인", relationGuide.axis],
    ["거리감", facts.compatibility?.distance || "미확인", distanceGuide],
    ["양방향 작용", facts.compatibility?.aToB || `${facts.compatibility?.forwardDistance ?? "──"}`, facts.compatibility?.bToA || `${facts.compatibility?.reverseDistance ?? "──"}`],
    ["상담 핵심", relationGuide.strength, relationGuide.counsel],
  ];
  return `
    <table class="chapter-summary-table">
      <thead>
        <tr>
          <th>항목</th>
          <th>${escapeHtml(facts.personA?.name || "A")}</th>
          <th>${escapeHtml(facts.personB?.name || "B")}</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td>${escapeHtml(row[0])}</td>
            <td>${escapeHtml(row[1] || "──")}</td>
            <td>${escapeHtml(row[2] || "──")}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
}

function renderDialogueBlocks(chapter = {}, facts = {}) {
  const text = asArray(chapter.sections).map((section) => section.body).join("\n");
  const names = [facts.personA?.name || "A", facts.personB?.name || "B"].map((name) => clean(name, 30)).filter(Boolean);
  const speakerPattern = [...names, "A", "B"].map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`(?:^|\\n)\\s*(${speakerPattern})\\s*[:：]\\s*["“]?([^"”\\n]{8,180})`, "g");
  const blocks = [];
  let match;
  while ((match = re.exec(text)) && blocks.length < 4) {
    blocks.push({
      speaker: clean(match[1], 30),
      body: clean(match[2], 180),
      side: blocks.length % 2 === 0 ? "left" : "right",
    });
  }
  if (!blocks.length) return "";
  return `
    <div class="dialogue-block">
      ${blocks.map((item) => `
        <p class="dialogue-block__line dialogue-block__line--${item.side}">
          <strong>${escapeHtml(item.speaker)}</strong><span>╸</span>${escapeHtml(item.body)}
        </p>`).join("")}
    </div>`;
}

function renderChapterSections(chapter = {}) {
  return asArray(chapter.sections).map((section) => {
    const paragraphs = asArray(section.paragraphs).length
      ? asArray(section.paragraphs)
      : block(section.body).split(/\n{2,}/).map((item) => clean(item)).filter(Boolean);
    return `
      <section class="chapter-section">
        <h2>${escapeHtml(section.heading || section.title)}</h2>
        ${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
      </section>`;
  }).join("");
}

function renderChapterArticle(chapter = {}, facts = {}) {
  const scoreMeta = resolveChapterScoreMeta(chapter, facts);
  const icon = CHAPTER_ICONS[(Number(chapter.order || 1) - 1) % CHAPTER_ICONS.length] || "◈";
  const advice = sentenceList(chapter.prescription?.lead || asArray(chapter.sections).at(-1)?.body || "", 2, 260).join(" ");
  return `
    <article data-chapter-id="${escapeHtml(chapter.id)}" class="chapter-article">
      ${drawChapterHeader(null, chapter.order || chapter.chapterNo, chapter.title, scoreMeta.score, icon, scoreMeta.label)}
      ${renderSummaryTable(facts)}
      ${renderChapterSections(chapter)}
      ${drawComparisonTable(null, ["💚 이 궁합의 강점", "🔸 함께 보완할 부분"], buildChapterComparisonRows(chapter))}
      ${renderDialogueBlocks(chapter, facts)}
      ${drawCalloutBox(null, advice, "이 챕터의 핵심")}
    </article>`;
}

function renderReportHtml({ facts, chapters }) {
  const toc = chapters
    .map((chapter) => `<li>제${chapter.order}장 ${escapeHtml(chapter.title)}</li>`)
    .join("");
  const chapterHtml = chapters.map((chapter) => renderChapterArticle(chapter, facts)).join("\n");
  const summaryChapters = chapters.map((chapter) => {
    const scoreMeta = resolveChapterScoreMeta(chapter, facts);
    return {
      num: chapter.order,
      name: chapter.title,
      score: scoreMeta.score,
      basis: scoreMeta.label,
    };
  });
  const totalScore = clampScore(facts.compatibility.score, 0);
  const totalScoreText = Number.isFinite(Number(facts.compatibility.score)) ? `${totalScore}점 / 100점` : "점수 미상";
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(facts.personA.name)} · ${escapeHtml(facts.personB.name)} 숙요점 프리미엄 궁합</title>
  <style>
    @page{size:A4;margin:16mm}
    *{box-sizing:border-box}
    body{margin:0;background:#0a0818;color:#e2e8f0;font-family:"Noto Serif KR","Pretendard","Noto Sans KR",serif;line-height:1.72}
    .page{max-width:980px;margin:0 auto;background:linear-gradient(180deg,#13102a 0%,#0a0818 100%);min-height:100vh;padding:52px 58px}
    h1,h2,.kicker,.chapter-header,.cover-score,.cover-grade,.toc li,.chapter-summary-table th,.comparison-table th,.score-summary-table th{font-family:"Pretendard","Noto Sans KR",sans-serif}
    .cover{break-after:page;padding:54px 0 38px;text-align:center}
    .kicker{letter-spacing:.18em;color:#c4b5fd;font-size:12px;font-weight:700}
    .cover h1{font-size:30px;margin:18px 0 24px;color:#e2e8f0}
    .cover-card{margin:0 auto;max-width:700px;border:1px solid rgba(167,139,250,.28);border-left:4px solid #6d28d9;border-radius:8px;background:linear-gradient(135deg,rgba(19,16,42,.96),rgba(10,8,24,.98));padding:30px 34px;box-shadow:0 18px 40px rgba(0,0,0,.24)}
    .cover-card h2{margin:0 0 24px;color:#c4b5fd;font-size:18px}
    .cover-names{display:flex;justify-content:center;align-items:center;gap:20px;margin-bottom:26px;color:#e2e8f0;font-size:24px;font-weight:700}
    .cover-names span{color:#a78bfa;font-size:24px}
    .cover-score{display:grid;grid-template-columns:54px 1fr 110px;gap:12px;align-items:center;margin:18px 0;color:#e2e8f0;font-size:13px;font-weight:700}
    .cover-grade{display:flex;justify-content:center;gap:12px;align-items:center;margin-top:20px;color:#c4b5fd}
    .cover-grade span{color:#a78bfa;letter-spacing:2px}
    .cover-note{max-width:650px;margin:28px auto 0;color:#94a3b8;font-size:13px}
    .calculation-dashboard{margin:24px auto 0;max-width:760px;text-align:left;border:1px solid rgba(167,139,250,.22);border-radius:8px;background:rgba(167,139,250,.06);padding:16px}
    .calculation-dashboard h2{margin:0 0 12px;color:#c4b5fd;font-size:15px;text-align:center}
    .calculation-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}
    .calculation-grid div{border:1px solid rgba(167,139,250,.16);border-radius:8px;padding:10px;background:rgba(10,8,24,.45)}
    .calculation-grid span,.metric-source{display:block;color:#94a3b8;font-family:"Pretendard","Noto Sans KR",sans-serif;font-size:9pt}
    .calculation-grid strong{display:block;margin:4px 0;color:#e2e8f0;font-family:"Pretendard","Noto Sans KR",sans-serif;font-size:12pt}
    .calculation-grid p{margin:0;color:#c4b5fd;font-size:9pt}
    .distance-graph{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0 12px}
    .distance-row{display:grid;grid-template-columns:70px 1fr 34px;gap:8px;align-items:center;color:#e2e8f0;font-family:"Pretendard","Noto Sans KR",sans-serif;font-size:9pt}
    .distance-track{display:block;height:6px;border-radius:999px;background:rgba(167,139,250,.15);overflow:hidden}
    .distance-track i{display:block;height:100%;border-radius:999px;background:#a78bfa}
    .metric-source{margin:6px 0 8px;text-align:center}
    .metric-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
    .metric-item{min-width:0;border:1px solid rgba(167,139,250,.16);border-radius:8px;background:rgba(10,8,24,.38);padding:8px}
    .metric-item span{display:block;margin-bottom:5px;color:#94a3b8;font-family:"Pretendard","Noto Sans KR",sans-serif;font-size:8pt}
    .metric-item b{display:block;margin-top:4px;color:#e2e8f0;font-family:"Pretendard","Noto Sans KR",sans-serif;font-size:9pt;text-align:right}
    .score-gauge{display:inline-block;position:relative;height:var(--score-height);width:100%;min-width:70px;border-radius:999px;background:rgba(167,139,250,.15);overflow:hidden;vertical-align:middle}
    .score-gauge span{display:block;width:var(--score-fill);height:100%;border-radius:999px;background:var(--score-color)}
    .toc{break-after:page;padding:38px 0}
    .toc h1,.score-summary-page h1{margin:0 0 22px;color:#e2e8f0;font-size:24px;text-align:center}
    .toc ol{margin:0;padding:0 0 0 24px;columns:2;column-gap:36px}
    .toc li{break-inside:avoid;margin:7px 0;color:#c4b5fd;font-size:12px}
    .chapter-article{break-before:page;padding:18px 0 22px}
    .chapter-header{break-inside:avoid;border:1px solid rgba(167,139,250,.2);border-left:3px solid #6d28d9;border-radius:8px;background:rgba(167,139,250,.07);padding:16px 18px;margin-bottom:16px}
    .chapter-header__title{display:flex;align-items:baseline;gap:12px}
    .chapter-header__title span{color:#a78bfa;font-size:10pt;font-weight:800}
    .chapter-header__title strong{color:#e2e8f0;font-size:13pt;font-weight:600}
    .chapter-header__rule{height:1px;background:rgba(167,139,250,.2);margin:11px 0}
    .chapter-header__score{display:grid;grid-template-columns:82px 180px 52px;gap:10px;align-items:center;color:#94a3b8;font-size:9pt}
    .chapter-header__score b{color:#e2e8f0}
    .chapter-header__basis{margin:9px 0 0;color:#94a3b8;font-size:8.5pt}
    .chapter-summary-table,.comparison-table,.score-summary-table{width:100%;border-collapse:collapse;margin:14px 0 22px;border:1px solid rgba(167,139,250,.3)}
    .chapter-summary-table th,.chapter-summary-table td,.comparison-table th,.comparison-table td,.score-summary-table th,.score-summary-table td{padding:6px 10px;border:1px solid rgba(167,139,250,.18);font-size:9pt;vertical-align:top}
    .chapter-summary-table th,.score-summary-table th{background:rgba(109,40,217,.3);color:#c4b5fd;font-weight:800}
    .chapter-summary-table td,.score-summary-table td{color:#e2e8f0}
    .chapter-summary-table tr:nth-child(odd) td,.score-summary-table tr:nth-child(odd) td{background:rgba(167,139,250,.05)}
    .chapter-section{margin:24px 0}
    .chapter-section h2{margin:0 0 10px;color:#c4b5fd;font-size:15px}
    .chapter-section p{margin:0 0 12px;color:#e2e8f0;font-size:14px}
    .comparison-table th:first-child{background:rgba(52,211,153,.15);color:#34d399}
    .comparison-table th:last-child{background:rgba(245,158,11,.15);color:#f59e0b}
    .comparison-table td:first-child{color:#34d399}
    .comparison-table td:last-child{color:#f59e0b}
    .advice-callout{break-inside:avoid;margin:24px 0 0;padding:12px 16px;border-left:4px solid #a78bfa;border-radius:8px;background:rgba(167,139,250,.1)}
    .advice-callout strong{display:block;margin-bottom:8px;color:#c4b5fd;font-family:"Pretendard","Noto Sans KR",sans-serif;font-size:9pt}
    .advice-callout p{margin:0;color:#e2e8f0;font-size:10pt;font-style:italic}
    .dialogue-block{margin:18px 0;padding:12px 14px;border:1px solid rgba(167,139,250,.16);border-radius:8px;background:rgba(167,139,250,.06)}
    .dialogue-block__line{margin:0 0 8px;color:#e2e8f0;font-size:10pt}
    .dialogue-block__line--right{padding-left:34px}
    .dialogue-block strong{color:#a78bfa;font-family:"Pretendard","Noto Sans KR",sans-serif;font-size:9pt}
    .dialogue-block span{padding:0 8px;color:rgba(167,139,250,.5)}
    .score-summary-page{break-before:page;padding:30px 0}
    .score-summary-table th:nth-child(1),.score-summary-table td:nth-child(1){width:20pt;text-align:center}
    .score-summary-table th:nth-child(2),.score-summary-table td:nth-child(2){width:180pt}
    .score-summary-table th:nth-child(3),.score-summary-table td:nth-child(3){width:78pt;text-align:center}
    .score-summary-table th:nth-child(4),.score-summary-table td:nth-child(4){width:52pt;text-align:center}
    .score-summary-table__total td{background:rgba(109,40,217,.3)!important;font-weight:800;color:#c4b5fd}
    .notice{margin-top:32px;padding:16px 0;border-top:1px solid rgba(167,139,250,.2);color:#94a3b8;font-size:12px}
  </style>
</head>
<body>
  <main class="page">
    <section class="cover">
      <div class="kicker">SUKYO PREMIUM COMPATIBILITY</div>
      <h1>${escapeHtml(facts.personA.name)} · ${escapeHtml(facts.personB.name)} 숙요점 프리미엄 궁합</h1>
      <div class="cover-card">
        <h2>✦ 두 사람의 숙요 궁합 종합 결과</h2>
        <div class="cover-names">
          <strong>${escapeHtml(facts.personA.name)}</strong>
          <span>∞</span>
          <strong>${escapeHtml(facts.personB.name)}</strong>
        </div>
        <div class="cover-score">
          <span>총점</span>
          ${drawScoreGauge(null, 0, 0, 320, totalScore, 10)}
          <strong>${escapeHtml(totalScoreText)}</strong>
        </div>
        <div class="cover-grade">
          <span>${escapeHtml(scoreStars(totalScore))}</span>
          <b>“${escapeHtml(scoreGrade(totalScore, facts.compatibility.scoreLabel))}”</b>
        </div>
      </div>
      ${renderCalculationDashboard(facts)}
      <p class="cover-note">${escapeHtml(facts.personA.syuku)}과 ${escapeHtml(facts.personB.syuku)}의 달빛 결이 관계의 온도, 거리, 회복의 리듬으로 드러납니다.</p>
    </section>
    <section class="toc">
      <h1>목차</h1>
      <ol>${toc}</ol>
    </section>
    ${chapterHtml}
    ${drawScoreSummaryTable(null, summaryChapters)}
    <section class="notice">
      숙요의 달빛은 두 사람의 관계 결을 비추는 참고가 됩니다. 중요한 선택 앞에서는 이 흐름을 두 사람의 실제 대화, 약속, 현실 조건과 함께 살펴 주세요.
    </section>
  </main>
</body>
</html>`;
}

function buildChapterQuality(chapters = []) {
  const issues = [];
  if (chapters.length !== SUKYO_PDF_CHAPTER_COUNT) issues.push("chapter.count");
  chapters.forEach((chapter, index) => {
    const spec = SUKYO_PDF_CHAPTERS[index];
    if (!spec) return;
    if (clean(chapter.id) !== spec.id) issues.push(`chapter.id.${index + 1}`);
    if (asArray(chapter.sections).length !== spec.sections.length) issues.push(`chapter.sections.${index + 1}`);
  });
  return {
    ok: issues.length === 0,
    issues,
    chapters: chapters.map((chapter) => ({
      id: chapter.id,
      order: chapter.order,
      sectionCount: asArray(chapter.sections).length,
      ok: true,
    })),
  };
}

export function validateSukyoPdfCompletionPayload({ pdfReady = {}, chapters = [], requireDownloadUrl = false } = {}) {
  const issues = [];
  const llmAssembly = pdfReady?.llmAssembly || {};
  const html = String(pdfReady.html || "");
  if (!clean(html)) issues.push("pdfReady.html");
  if (requireDownloadUrl && !clean(pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl)) issues.push("pdfReady.url");
  const htmlForbiddenTokens = findForbiddenPdfTokens(html);
  if (htmlForbiddenTokens.length) issues.push(`pdfReady.forbidden-token:${htmlForbiddenTokens.join("|")}`);
  if (html) {
    if (!html.includes("class=\"calculation-dashboard\"")) issues.push("visual.calculation-dashboard");
    if (!html.includes("class=\"distance-graph\"")) issues.push("visual.distance-graph");
    if (!html.includes("class=\"metric-grid\"")) issues.push("visual.metric-grid");
    if (!html.includes("class=\"chapter-header__basis\"")) issues.push("visual.chapter-score-basis");
    if (!html.includes("class=\"score-summary-table\"")) issues.push("visual.score-summary-table");
    if (!/data-forward-distance="\d+"/.test(html) || !/data-reverse-distance="\d+"/.test(html)) issues.push("visual.distance-values");
    if (!/data-metric="overall"\s+data-score="\d+"/.test(html)) issues.push("visual.metric-values");
    if (!/data-chapter-no="1"\s+data-chapter-score="\d+"/.test(html)) issues.push("visual.chapter-score-values");
  }
  if (chapters.length !== SUKYO_PDF_CHAPTER_COUNT) issues.push("chapter.count");
  if (llmAssembly.enabled !== true) issues.push("llmAssembly.enabled");
  if (llmAssembly.externalGeneration !== true) issues.push("llmAssembly.externalGeneration");
  if (llmAssembly.externalCallsAllowed !== true) issues.push("llmAssembly.externalCallsAllowed");
  if (llmAssembly.fallbackUsed === true) issues.push("llmAssembly.fallbackUsed");
  if (clean(llmAssembly.templateVersion) !== SUKYO_PDF_CONFIG.templateVersion) issues.push("llmAssembly.templateVersion");
  if (Number(llmAssembly.chapterCount || 0) !== SUKYO_PDF_CHAPTER_COUNT) issues.push("llmAssembly.chapterCount");
  chapters.forEach((chapter, index) => {
    const spec = SUKYO_PDF_CHAPTERS[index];
    if (!spec) return;
    if (clean(chapter.title) !== spec.title) issues.push(`chapter.title.${index + 1}`);
    if (asArray(chapter.sections).length !== spec.sections.length) issues.push(`chapter.sections.${index + 1}`);
    asArray(chapter.sections).forEach((section, sectionIndex) => {
      if (!clean(section.heading) || !clean(section.body)) issues.push(`section.body.${index + 1}.${sectionIndex + 1}`);
    });
  });
  return { ok: issues.length === 0, issues };
}

export function assertSukyoCompatibilityPdfComplete({ chapters = [] } = {}) {
  const chapterQuality = buildChapterQuality(chapters);
  const issues = [...chapterQuality.issues];
  if (chapters.length !== SUKYO_PDF_CHAPTER_COUNT) issues.push("chapter.count");
  chapters.forEach((chapter, index) => {
    const spec = SUKYO_PDF_CHAPTERS[index];
    if (!spec) return;
    if (clean(chapter.title) !== spec.title) issues.push(`chapter.title.${index + 1}`);
    asArray(chapter.sections).forEach((section, sectionIndex) => {
      const body = clean(section.body);
      if (!clean(section.heading) || !body) issues.push(`section.body.${index + 1}.${sectionIndex + 1}`);
      const forbiddenTokens = findForbiddenPdfTokens(body);
      if (forbiddenTokens.length) issues.push(`section.forbidden.${index + 1}.${sectionIndex + 1}:${forbiddenTokens.join("|")}`);
      if (body && !containsKorean(body)) issues.push(`section.korean.${index + 1}.${sectionIndex + 1}`);
    });
  });
  const uniqueIssues = [...new Set(issues)];
  if (uniqueIssues.length > 0) {
    throw Object.assign(new Error("숙요점 PDF 챕터가 완성되지 않았습니다."), {
      code: "SUKUYO_PDF_INCOMPLETE",
      issues: uniqueIssues,
    });
  }
  return true;
}

export function buildSukyoChapterQualityReport(chapters = []) {
  return buildChapterQuality(chapters);
}

export function validateSukyoCompatibilityPdfQuality(chapters = []) {
  return buildChapterQuality(chapters);
}

export async function generateSukyoPremiumReport(env = {}, seed = {}, options = {}) {
  const facts = buildFacts(seed);
  if (SUKYO_PDF_CHAPTERS.length !== SUKYO_PDF_CHAPTER_COUNT) {
    throw Object.assign(new Error("숙요점 PDF 장 구성이 완성되지 않았습니다."), {
      status: 500,
      code: "SUKUYO_CHAPTER_MANIFEST_INVALID",
    });
  }

  const generated = [];
  const failedChapters = [];
  let previousSummary = "";
  const providerSet = new Set();

  for (const chapterSpec of SUKYO_PDF_CHAPTERS) {
    const result = await generateChapter(env, facts, chapterSpec, previousSummary);
    if (!result.ok) {
      failedChapters.push({
        id: chapterSpec.id,
        order: chapterSpec.order,
        title: chapterSpec.title,
        errorCode: result.errorCode,
        attempts: result.attempts || [],
      });
      break;
    }
    const parsed = parseSukyoPremiumChapterHtml(result.html, chapterSpec);
    parsed.provider = result.provider;
    parsed.cached = Boolean(result.cached);
    generated.push(parsed);
    providerSet.add(result.provider);
    previousSummary = clean(stripTags(result.html).slice(-800), 800);
  }

  if (failedChapters.length > 0 || generated.length !== SUKYO_PDF_CHAPTER_COUNT) {
    throw Object.assign(new Error("숙요점 PDF 원고 생성이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요."), {
      status: 503,
      code: "SUKUYO_PREMIUM_GENERATION_FAILED",
      failedChapters,
      chapterCount: generated.length,
      expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
    });
  }

  const html = renderReportHtml({ facts, chapters: generated });
  if (hasForbiddenPdfToken(html)) {
    throw Object.assign(new Error("숙요점 PDF 문장 검증에 실패했습니다. 잠시 후 다시 시도해 주세요."), {
      status: 422,
      code: "SUKUYO_PREMIUM_VALIDATION_FAILED",
    });
  }

  const provider = providerSet.has("gemini") && providerSet.size === 1
    ? "gemini"
    : providerSet.has("gemini")
      ? "workers-ai-gemini"
      : "workers-ai";
  const llmAssembly = {
    enabled: true,
    source: SUKYO_PDF_CONFIG.generationMode,
    provider,
    templateVersion: SUKYO_PDF_CONFIG.templateVersion,
    chapterCount: generated.length,
    expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
    externalGeneration: true,
    externalCallsAllowed: true,
    fallbackUsed: false,
  };
  const chapterQuality = buildChapterQuality(generated);
  const pdfReady = {
    html,
    filename: `${clean(facts.reportId || "sukyo-premium-report")}.pdf`,
    mimeType: "application/pdf",
    contentType: "application/pdf",
    renderFormat: "pdf-archive",
    manuscriptSource: SUKYO_PDF_CONFIG.generationMode,
    chapterCount: generated.length,
    expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
    llmAssembly,
    canDownload: true,
  };
  const pdfCompletionValidation = validateSukyoPdfCompletionPayload({ pdfReady, chapters: generated });
  if (!chapterQuality.ok || !pdfCompletionValidation.ok) {
    throw Object.assign(new Error("숙요점 PDF 완료 검증에 실패했습니다. 잠시 후 다시 시도해 주세요."), {
      status: 422,
      code: "SUKUYO_PREMIUM_COMPLETION_FAILED",
      issues: [...chapterQuality.issues, ...pdfCompletionValidation.issues],
    });
  }

  const payload = {
    ok: true,
    status: "completed",
    serverStatus: "completed",
    qualityStatus: "passed",
    reportId: clean(facts.reportId || seed.reportId || ""),
    mode: "compatibility",
    personA: facts.personA,
    personB: facts.personB,
    compatibility: facts.compatibility,
    sukuyoCompatibilityJson: facts,
    chapters: generated,
    chapterCount: generated.length,
    expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
    manuscriptSource: SUKYO_PDF_CONFIG.generationMode,
    generationMode: SUKYO_PDF_CONFIG.generationMode,
    provider,
    writingPipeline: "sukyo-calculation-to-llm-authored-pdf",
    llmAssembly,
    llmDraftChapterCount: generated.length,
    llmAssemblyOnly: true,
    externalCallsAllowed: true,
    chapterQuality,
    pdfCompletionValidation,
    pdfReady,
  };

  return {
    ok: true,
    ...payload,
    payload,
    html,
    pdfReady,
  };
}
