import { Body, Ecliptic, GeoVector } from "astronomy-engine";
import { callVertexGemini } from "@/app/_lib/callVertexGemini";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

function pickGeminiKeys(): string[] {
  return [
    process.env.GEMINIF_API_KEY1,
    process.env.GEMINIF_API_KEY2,
    process.env.GEMINIF_API_KEY3,
    process.env.GEMINIF_API_KEY4,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
}

let geminiKeyCursor = 0;

function rotateGeminiKeys(keys: string[], seed = 0): string[] {
  if (!keys.length) return [];
  const len = keys.length;
  const base = Number.isFinite(Number(seed)) ? Number(seed) : 0;
  const start = ((geminiKeyCursor + base) % len + len) % len;
  geminiKeyCursor = (start + 1) % len;
  return [...keys.slice(start), ...keys.slice(0, start)];
}

function parseGeminiText(payload: unknown): string {
  const p = payload as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  for (const c of p?.candidates ?? []) {
    for (const part of c?.content?.parts ?? []) {
      if (part?.text?.trim()) return part.text.trim();
    }
  }
  return "";
}

const SIGN_KO = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "궁수자리", "염소자리", "물병자리", "물고기자리"];
const SIGN_EMOJI = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
const PLANETS: Array<[string, Body]> = [
  ["Sun", Body.Sun],
  ["Moon", Body.Moon],
  ["Mercury", Body.Mercury],
  ["Venus", Body.Venus],
  ["Mars", Body.Mars],
  ["Jupiter", Body.Jupiter],
  ["Saturn", Body.Saturn],
  ["Uranus", Body.Uranus],
  ["Neptune", Body.Neptune],
  ["Pluto", Body.Pluto],
];

export const ASTRO_CHAPTER_META = [
  { num: 1, title: "페르소나와 존재의 핵", subtitle: "ASC·Sun·Moon의 입체적 결합", icon: "🌌" },
  { num: 2, title: "감정의 뿌리", subtitle: "Moon & 4하우스", icon: "🌊" },
  { num: 3, title: "인지 체계와 정보의 연금술", subtitle: "Mercury & 3·9하우스", icon: "🧠" },
  { num: 4, title: "욕망의 미학과 가치 자산", subtitle: "Venus & 2·7하우스", icon: "💎" },
  { num: 5, title: "추진력과 갈등 처리", subtitle: "Mars & 1·8하우스", icon: "⚡" },
  { num: 6, title: "확장과 행운의 문", subtitle: "Jupiter & 9·11하우스", icon: "🪐" },
  { num: 7, title: "한계와 성취의 구조", subtitle: "Saturn & 10하우스", icon: "🏛️" },
  { num: 8, title: "관계와 계약의 지도", subtitle: "7하우스와 주요 에스펙트", icon: "🤝" },
  { num: 9, title: "상처와 회복 코드", subtitle: "Chiron·12하우스 그림자", icon: "🕯️" },
  { num: 10, title: "노드와 영혼의 목적", subtitle: "North Node/South Node", icon: "☊" },
  { num: 11, title: "트랜짓 운세 전략", subtitle: "현재 행성 흐름 적용", icon: "📡" },
  { num: 12, title: "마스터 플랜", subtitle: "12개월 실행 로드맵", icon: "📜" },
  { num: 13, title: "90일 현실 전환 플랜", subtitle: "관계·커리어·재정 실천 설계", icon: "🧭" },
];

export const ASTRO_TOTAL_CHAPTERS = ASTRO_CHAPTER_META.length;

function nd(n: number) {
  return ((n % 360) + 360) % 360;
}

function signInfo(lon: number, ascLon = 0) {
  const normalized = nd(lon);
  const sign = Math.floor(normalized / 30);
  const degree = Math.round((normalized % 30) * 100) / 100;
  return {
    longitude: Math.round(normalized * 100) / 100,
    sign,
    signKo: SIGN_KO[sign],
    signEmoji: SIGN_EMOJI[sign],
    degree,
    house: Math.floor(nd(normalized - ascLon) / 30) + 1,
  };
}

function julianDay(y: number, m: number, d: number, hour: number) {
  let yr = y;
  let mo = m;
  if (mo <= 2) {
    yr -= 1;
    mo += 12;
  }
  const a = Math.floor(yr / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (yr + 4716)) + Math.floor(30.6001 * (mo + 1)) + d + b - 1524.5 + hour / 24;
}

function ascendantApprox(jd: number, lat: number, lon: number) {
  const t = (jd - 2451545.0) / 36525;
  const theta = nd(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * t * t - (t * t * t) / 38710000);
  const lst = nd(theta + lon);
  const eps = 23.4392911 - 0.013004167 * t;
  const latR = lat * Math.PI / 180;
  const epsR = eps * Math.PI / 180;
  const ramcR = lst * Math.PI / 180;
  const y = -Math.cos(ramcR);
  const x = Math.sin(ramcR) * Math.cos(epsR) + Math.tan(latR) * Math.sin(epsR);
  return nd(Math.atan2(y, x) * 180 / Math.PI);
}

function northNodeLon(jd: number) {
  const t = (jd - 2451545.0) / 36525;
  return nd(125.044555 - 1934.1361849 * t + 0.0020754 * t * t);
}

function aspectBetween(a: number, b: number) {
  const diff = Math.abs(nd(a - b));
  const d = diff > 180 ? 360 - diff : diff;
  const defs: Array<[string, number]> = [["conjunction", 0], ["sextile", 60], ["square", 90], ["trine", 120], ["opposition", 180]];
  for (const [type, deg] of defs) {
    const orb = Math.abs(d - deg);
    if (orb <= 8) return { type, orb: Math.round(orb * 100) / 100 };
  }
  return null;
}

export function buildWesternChart(input: { year: number; month: number; day: number; hour?: number; minute?: number; timezone?: number; lat?: number; lon?: number }) {
  const hourLocal = (input.hour ?? 12) + (input.minute ?? 0) / 60;
  const tz = input.timezone ?? 9;
  const date = new Date(Date.UTC(input.year, input.month - 1, input.day, Math.floor(hourLocal - tz), Math.round(((hourLocal - tz) % 1) * 60), 0));
  const jd = julianDay(input.year, input.month, input.day, hourLocal - tz);
  const lat = input.lat ?? 37.5665;
  const lon = input.lon ?? 126.978;
  const ascLon = ascendantApprox(jd, lat, lon);
  const planets: Record<string, ReturnType<typeof signInfo>> = {};
  for (const [name, body] of PLANETS) {
    const ecl = Ecliptic(GeoVector(body, date, false));
    planets[name] = signInfo(ecl.elon, ascLon);
  }
  const nodeLon = northNodeLon(jd);
  const aspects: Array<{ p1: string; p2: string; type: string; orb: number }> = [];
  const names = Object.keys(planets);
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const a = aspectBetween(planets[names[i]].longitude, planets[names[j]].longitude);
      if (a) aspects.push({ p1: names[i], p2: names[j], ...a });
    }
  }
  return {
    planets,
    ascendant: signInfo(ascLon, ascLon),
    midheaven: signInfo(nd(ascLon + 90), ascLon),
    northNode: signInfo(nodeLon, ascLon),
    southNode: signInfo(nodeLon + 180, ascLon),
    aspects,
  };
}

export function parseSections(text: string) {
  return text.split(/\n(?=##\s+)/g).map((part) => {
    const m = part.match(/^##\s*(.+?)\n([\s\S]*)$/);
    return m ? { title: m[1].trim(), body: m[2].trim() } : null;
  }).filter(Boolean) as { title: string; body: string }[];
}


export function buildAstroPrompt(chapter: number, chart: ReturnType<typeof buildWesternChart>) {
  const meta = ASTRO_CHAPTER_META[chapter - 1] ?? ASTRO_CHAPTER_META[0];
  const monthlyRule = chapter === 12
    ? "챕터 12는 반드시 1월부터 12월까지 월별 블록을 포함하세요."
    : "";
  const roadmapRule = chapter === 13
    ? "챕터 13은 반드시 1~7일/8~30일/31~60일/61~90일 표를 포함하세요."
    : "";
  return `당신은 전문 서양 점성술 리포트 작가입니다.

차트 데이터:
- ASC: ${chart.ascendant.signKo} ${chart.ascendant.degree}도
- Sun: ${chart.planets.Sun.signKo} ${chart.planets.Sun.house}하우스
- Moon: ${chart.planets.Moon.signKo} ${chart.planets.Moon.house}하우스
- Mercury: ${chart.planets.Mercury.signKo} ${chart.planets.Mercury.house}하우스
- Venus: ${chart.planets.Venus.signKo} ${chart.planets.Venus.house}하우스
- Mars: ${chart.planets.Mars.signKo} ${chart.planets.Mars.house}하우스
- North Node: ${chart.northNode.signKo} ${chart.northNode.house}하우스
- 주요 에스펙트: ${chart.aspects.slice(0, 12).map((a) => `${a.p1}-${a.p2} ${a.type} orb ${a.orb}`).join(", ") || "없음"}

챕터 ${chapter}: ${meta.title} - ${meta.subtitle}

한국어로 고품질 PDF 본문을 작성하세요. 아래 형식을 지키세요.
## 핵심 별자리 구조
## 삶에서 드러나는 패턴
## 관계/커리어/타이밍 적용
## 30일 실행 가이드

${monthlyRule}
${roadmapRule}

각 섹션은 2문단 이상으로, 앱 사용자가 바로 행동으로 옮길 수 있는 구체적 조언을 포함하세요.`;
}

// ============================================================
// INPUT VALIDATION & CHART CALCULATION
// ============================================================

export function validateAstroInput(input: {
  year?: unknown;
  month?: unknown;
  day?: unknown;
  hour?: unknown;
  minute?: unknown;
  timezone?: unknown;
  lat?: unknown;
  lon?: unknown;
}) {
  const errors: string[] = [];
  const warnings: string[] = [];

  const year = Number(input.year || 0);
  const month = Number(input.month || 0);
  const day = Number(input.day || 0);
  const hour = Number(input.hour || 12);
  const minute = Number(input.minute || 0);
  const timezone = Number(input.timezone || 9);
  const lat = Number(input.lat || 37.5665);
  const lon = Number(input.lon || 126.978);

  // Date validation
  if (!Number.isFinite(year) || year < 1900 || year > 2100) errors.push("year out of range [1900, 2100]");
  if (!Number.isFinite(month) || month < 1 || month > 12) errors.push("month must be 1-12");
  if (!Number.isFinite(day) || day < 1 || day > 31) errors.push("day out of range [1, 31]");

  // Time validation
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) {
    warnings.push("hour out of range [0, 23], using noon (12)");
  }
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) {
    warnings.push("minute out of range [0, 59], using 0");
  }

  // Timezone validation
  if (!Number.isFinite(timezone) || timezone < -12 || timezone > 14) {
    warnings.push("timezone out of range [-12, 14], using KST (9)");
  }

  // Geographic validation
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    warnings.push("latitude out of range [-90, 90], using Seoul default (37.5665)");
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    warnings.push("longitude out of range [-180, 180], using Seoul default (126.978)");
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function normalizeAstroInput(input: {
  year?: unknown;
  month?: unknown;
  day?: unknown;
  hour?: unknown;
  minute?: unknown;
  timezone?: unknown;
  lat?: unknown;
  lon?: unknown;
}) {
  let year = Number(input.year || 0);
  let month = Number(input.month || 0);
  let day = Number(input.day || 0);
  let hour = Number(input.hour || 12);
  let minute = Number(input.minute || 0);
  let timezone = Number(input.timezone || 9);
  let lat = Number(input.lat || 37.5665);
  let lon = Number(input.lon || 126.978);

  // Clamp to valid ranges with defaults
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) hour = 12;
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) minute = 0;
  if (!Number.isFinite(timezone) || timezone < -12 || timezone > 14) timezone = 9;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) lat = 37.5665;
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) lon = 126.978;

  return { year, month, day, hour, minute, timezone, lat, lon };
}

// ============================================================
// CHART QUALITY VALIDATION
// ============================================================

export function validateAstroChart(chart: ReturnType<typeof buildWesternChart>) {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!chart || typeof chart !== "object") {
    errors.push("chart is invalid");
    return { ok: false, errors, warnings };
  }

  // Validate planets
  if (!chart.planets || typeof chart.planets !== "object") {
    errors.push("planets missing");
  } else {
    const requiredPlanets = ["Sun", "Moon", "Mercury", "Venus", "Mars"];
    for (const planet of requiredPlanets) {
      if (!chart.planets[planet]) errors.push(`planet ${planet} missing`);
    }
  }

  // Validate ascendant/midheaven
  if (!chart.ascendant || !chart.ascendant.longitude) errors.push("ascendant missing");
  if (!chart.midheaven || !chart.midheaven.longitude) errors.push("midheaven missing");

  // Validate aspects
  if (!Array.isArray(chart.aspects)) {
    warnings.push("aspects not an array");
  } else if (chart.aspects.length === 0) {
    warnings.push("no aspects found");
  }

  return { ok: errors.length === 0, errors, warnings };
}

// ============================================================
// TEXT QUALITY VALIDATION
// ============================================================

const ASTRO_FORBIDDEN_TEXTS = [
  "자동 복구",
  "Chapter",
  "챕터",
  "데이터가 부족",
  "품질 검증 실패",
  "API 실패",
  "Internal server error",
  "fallback",
  "reportId",
  "payload",
];

export function validateAstroText(text: string) {
  const errors: string[] = [];
  const warnings: string[] = [];

  const source = String(text || "").trim();
  const length = [...source].length; // character count (not byte)

  if (length < 2000) errors.push(`text too short: ${length} < 2000 chars`);
  if (length > 50000) warnings.push(`text very long: ${length} > 50000 chars`);

  // Check for forbidden patterns
  for (const token of ASTRO_FORBIDDEN_TEXTS) {
    if (source.includes(token)) errors.push(`forbidden text found: "${token}"`);
  }

  // Check for repetitive sentences
  const sentences = source
    .split(/[.!?。！？\n]/)
    .map((s) => String(s || "").trim().replace(/\s+/g, " "))
    .filter((s) => s.length > 10);
  const counts = new Map<string, number>();
  for (const sentence of sentences) {
    const count = (counts.get(sentence) || 0) + 1;
    counts.set(sentence, count);
    if (count >= 3) {
      errors.push(`repetitive sentence found (${count}x)`);
      break;
    }
  }

  return { ok: errors.length === 0, length, errors, warnings };
}

// ============================================================
// FALLBACK TEXT GENERATION (ENHANCED)
// ============================================================

export function fallbackAstroText(chapter: number, chart: ReturnType<typeof buildWesternChart>) {
  const meta = ASTRO_CHAPTER_META[chapter - 1] ?? ASTRO_CHAPTER_META[0];
  const sun = chart.planets.Sun;
  const moon = chart.planets.Moon;
  const asc = chart.ascendant;
  const venus = chart.planets.Venus;
  const mars = chart.planets.Mars;
  const jupiter = chart.planets.Jupiter;
  const saturn = chart.planets.Saturn;
  
  const lines = [
    `## ${meta.title}`,
    `${meta.subtitle}`,
    ``,
    `### 기본 해석`,
    `당신의 상승궁은 ${asc.signKo} ${Math.round(asc.degree)}도에 위치합니다. 이는 외부 세계에 드러나는 첫인상과 본능적 반응 방식을 나타냅니다. 태양은 ${sun.signKo} ${sun.house}하우스에, 달은 ${moon.signKo} ${moon.house}하우스에 있어 의지와 감정 안전기지가 상승궁과 어떻게 조화를 이루고 있는지 보여줍니다.`,
    ``,
    `주요 행성들의 배치:`,
    `- 금성(${venus.signKo}, ${venus.house}하우스): 관계와 가치관의 표현 방식`,
    `- 화성(${mars.signKo}, ${mars.house}하우스): 행동력과 욕구 추진 방식`,
    `- 목성(${jupiter.signKo}, ${jupiter.house}하우스): 확장과 행운의 영역`,
    `- 토성(${saturn.signKo}, ${saturn.house}하우스): 제약과 성숙의 과제`,
    ``,
    `### 에스펙트 분석`,
    `당신의 차트에는 ${chart.aspects.length}개의 주요 에스펙트가 있습니다. 이들은 행성 에너지 간의 대화 패턴을 나타내며, 긴장각(스퀘어, 오포지션)은 성장의 기회를, 조화각(트라인, 섹스타일)은 자연스러운 재능을 시사합니다.`,
    ``,
    `### 실행 전략`,
    `${meta.title}을(를) 이해하는 것만으로는 변화가 일어나지 않습니다. 다음 30일 동안 다음과 같이 실행해보세요:`,
    `1. 매일 아침 5분: 상승궁의 에너지를 의도적으로 활성화하기 (예: 상승궁 상징색 입기, 대표 문장 읽기)`,
    `2. 주간 1회: 달과 태양의 에너지 충돌이 없는 날 중요 결정 내리기`,
    `3. 월간 1회: 자신의 선택이 토성이 제시한 제약 내에서 행성 에너지를 최대한 활용했는지 검토하기`,
    ``,
  ];

  if (chapter === 12) {
    const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
    for (const monthName of monthNames) {
      lines.push(
        `### ${monthName}`,
        `- 핵심 에너지: 일상 루틴 정렬 + 장기 목표 달성`,
        `- 추천 행동: 주간 1회 진척도 점검`,
        `- 주의할 점: 감정적 단기 결정 피하기`,
        `- 개운 활동: 자신의 출생 차트 장점 상기하기`,
        ``,
      );
    }
  }

  if (chapter === 13) {
    lines.push(
      `### 90일 실행 로드맵`,
      ``,
      `| 기간 | 핵심 목표 | 실천 행동 | 기대 변화 |`,
      `|---|---|---|---|`,
      `| 1~7일 | 자신의 차트 이해 심화 | 매일 10분 점성술 명상 | 판단 기준 명확화 |`,
      `| 8~30일 | 일상 선택에 적용 | 주 2회 차트 기반 선택 기록 | 실행 감각 향상 |`,
      `| 31~60일 | 관계/일에 적용 | 중요 결정 전 차트 상담 | 갈등 비용 감소 |`,
      `| 61~90일 | 최적화 & 확인 | 월간 리뷰 및 다음 분기 계획 | 장기 성공 체감 |`,
      ``,
    );
  }

  return lines.join("\n");
}

// ============================================================
// GEMINI TEXT GENERATION (ENHANCED WITH RETRY & FALLBACK)
// ============================================================

export async function generateAstroText(prompt: string, options?: { maxRetries?: number; timeoutMs?: number }) {
  const maxRetries = options?.maxRetries ?? 2;
  const timeoutMs = options?.timeoutMs ?? 10_000;

  try {
    const text = await callVertexGemini(prompt, { temperature: 0.86, maxOutputTokens: 8192 });
    if (text) return text;
  } catch {
    // Fallback keeps the paid flow from failing when AI credentials are not present.
  }

  const keys = rotateGeminiKeys(pickGeminiKeys(), prompt.length);
  if (!keys.length) return "";

  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
  let attempts = 0;
  const maxAttempts = 6; // increased for better retry
  
  for (const model of models) {
    const endpoint = GEMINI_ENDPOINT.replace("{model}", encodeURIComponent(model));
    for (const key of keys) {
      if (attempts >= maxAttempts) return "";
      attempts += 1;
      try {
        const response = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.86, maxOutputTokens: 8192, topP: 0.95 },
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) {
          if (response.status === 429) {
            // Rate limit - wait briefly before next attempt
            await new Promise((r) => setTimeout(r, 500));
          }
          continue;
        }
        const payload = await response.json().catch(() => ({}));
        const text = parseGeminiText(payload);
        if (text) return text;
      } catch {
        // try next key/model
      }
    }
  }
  return "";
}

// ============================================================
// SEQUENTIAL CHAPTER GENERATION
// ============================================================

export async function generateAstroChaptersSequentially(
  chapters: number[],
  chart: ReturnType<typeof buildWesternChart>,
  options?: {
    previousTexts?: string[];
    onProgress?: (chapterId: number, status: string) => void;
  },
): Promise<Record<number, string>> {
  const result: Record<number, string> = {};
  const previousTexts = options?.previousTexts ?? [];
  const onProgress = options?.onProgress;

  for (const chapterNum of chapters) {
    if (onProgress) onProgress(chapterNum, "generating");

    const prompt = buildAstroPrompt(chapterNum, chart);
    const text = await generateAstroText(prompt, { maxRetries: 2, timeoutMs: 12_000 });

    if (text) {
      const validation = validateAstroText(text);
      if (validation.ok) {
        result[chapterNum] = text;
        previousTexts.push(text);
        if (onProgress) onProgress(chapterNum, "success");
        continue;
      }
    }

    // Fallback
    const fallback = fallbackAstroText(chapterNum, chart);
    result[chapterNum] = fallback;
    previousTexts.push(fallback);
    if (onProgress) onProgress(chapterNum, "fallback");
  }

  return result;
}
