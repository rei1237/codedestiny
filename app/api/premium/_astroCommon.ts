import { Body, Ecliptic, GeoVector } from "astronomy-engine";
import { callVertexGemini } from "@/app/_lib/callVertexGemini";

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
];

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

export function fallbackAstroText(chapter: number, chart: ReturnType<typeof buildWesternChart>) {
  const meta = ASTRO_CHAPTER_META[chapter - 1] ?? ASTRO_CHAPTER_META[0];
  const sun = chart.planets.Sun;
  const moon = chart.planets.Moon;
  const asc = chart.ascendant;
  return [
    `## ${meta.title}`,
    `이 챕터는 서양 점성술 차트 기반 리포트입니다. 상승궁은 ${asc.signKo}, 태양은 ${sun.signKo}, 달은 ${moon.signKo}에 놓여 있어 겉으로 드러나는 인상, 의지의 방향, 감정 안전기지가 서로 다른 층으로 작동합니다.`,
    `## 차트 해석`,
    `${meta.subtitle} 관점에서 가장 중요한 점은 행성 하나를 단독으로 보지 않고 하우스와 에스펙트를 함께 읽는 것입니다. 현재 차트의 주요 에스펙트 ${chart.aspects.length}개는 삶의 반복 패턴을 드러내며, 강한 긴장각은 훈련할수록 장점으로 바뀝니다.`,
    `## 실행 전략`,
    `이번 리포트는 PDF 보관용으로 읽을 수 있도록 행동 기준을 포함합니다. 앞으로 30일 동안 ${meta.title}에 해당하는 선택을 할 때, 즉흥 반응보다 '내 상승궁이 보여주는 방식'과 '달이 실제로 안정을 느끼는 방식'을 분리해 기록하세요.`,
  ].join("\n\n");
}

export function buildAstroPrompt(chapter: number, chart: ReturnType<typeof buildWesternChart>) {
  const meta = ASTRO_CHAPTER_META[chapter - 1] ?? ASTRO_CHAPTER_META[0];
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

각 섹션은 2문단 이상으로, 앱 사용자가 바로 행동으로 옮길 수 있는 구체적 조언을 포함하세요.`;
}

export async function generateAstroText(prompt: string) {
  try {
    const text = await callVertexGemini(prompt, { temperature: 0.86, maxOutputTokens: 8192 });
    if (text) return text;
  } catch {
    // Fallback keeps the paid flow from failing when AI credentials are not present.
  }
  return "";
}
