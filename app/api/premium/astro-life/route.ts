import { NextRequest, NextResponse } from "next/server";
import { Body, Ecliptic, GeoVector } from "astronomy-engine";
import { callVertexGemini } from "@/app/_lib/callVertexGemini";

export const runtime = "nodejs";
export const maxDuration = 300;

// ─────────────────────────────────────────────────────────────────
// 열대황도 천문 계산 (astro-western 로직 내재화)
// ─────────────────────────────────────────────────────────────────
const ZODIAC_EN = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces",
];
const ZODIAC_KO = [
  "양자리","황소자리","쌍둥이자리","게자리","사자자리","처녀자리",
  "천칭자리","전갈자리","궁수자리","염소자리","물병자리","물고기자리",
];
const ZODIAC_EMOJI = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const HOUSE_KO = ["1","2","3","4","5","6","7","8","9","10","11","12"];

const PLANET_BODIES: Record<string, Body> = {
  Sun:     Body.Sun,
  Moon:    Body.Moon,
  Mercury: Body.Mercury,
  Venus:   Body.Venus,
  Mars:    Body.Mars,
  Jupiter: Body.Jupiter,
  Saturn:  Body.Saturn,
  Uranus:  Body.Uranus,
  Neptune: Body.Neptune,
  Pluto:   Body.Pluto,
};

const nd = (d: number) => ((d % 360) + 360) % 360;

function julianDay(yr: number, mo: number, dy: number, hr: number): number {
  let y = yr, m = mo;
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    dy + B - 1524.5 + hr / 24
  );
}

function getTropicalLon(body: Body, date: Date): number {
  const vec = GeoVector(body, date, false);
  const ecl = Ecliptic(vec);
  return nd(ecl.elon);
}

function zodiacOf(lon: number) {
  const n = nd(lon);
  const idx = Math.floor(n / 30);
  return {
    sign:      ZODIAC_EN[idx],
    signKo:    ZODIAC_KO[idx],
    signEmoji: ZODIAC_EMOJI[idx],
    degree:    Math.round((n % 30) * 10) / 10,
    longitude: Math.round(n * 10) / 10,
  };
}

function calcAscendant(jd: number, lat: number, lon: number): number {
  const T = (jd - 2451545.0) / 36525;
  const theta0 = nd(
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000
  );
  const lst = nd(theta0 + lon);
  const eps = 23.4392911 - 0.013004167 * T;
  const latR = lat * Math.PI / 180;
  const epsR = eps * Math.PI / 180;
  const ramcR = lst * Math.PI / 180;
  const y = -Math.cos(ramcR);
  const x = Math.sin(ramcR) * Math.cos(epsR) + Math.tan(latR) * Math.sin(epsR);
  return nd(Math.atan2(y, x) * 180 / Math.PI);
}

function calcNorthNode(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  return nd(125.044555 - 1934.1361849 * T + 0.0020754 * T * T);
}

function wholeSignHouse(planetLon: number, ascLon: number): number {
  const ascSign = Math.floor(nd(ascLon) / 30);
  const pSign   = Math.floor(nd(planetLon) / 30);
  return ((pSign - ascSign + 12) % 12) + 1;
}

const ASPECT_DEFS = [
  { name: "Conjunction",  nameKo: "합(0°)",    angle: 0,   orb: 8  },
  { name: "Sextile",      nameKo: "육분(60°)", angle: 60,  orb: 6  },
  { name: "Square",       nameKo: "사분(90°)", angle: 90,  orb: 8  },
  { name: "Trine",        nameKo: "삼분(120°)",angle: 120, orb: 8  },
  { name: "Opposition",   nameKo: "충(180°)",  angle: 180, orb: 8  },
];

interface AspectInfo {
  planet1: string; planet2: string;
  type: string; typeKo: string; orb: number;
}

function calcAspects(lons: Record<string, number>): AspectInfo[] {
  const names = Object.keys(lons);
  const result: AspectInfo[] = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      let diff = Math.abs(nd(lons[names[i]]) - nd(lons[names[j]]));
      if (diff > 180) diff = 360 - diff;
      for (const a of ASPECT_DEFS) {
        const orb = Math.abs(diff - a.angle);
        if (orb <= a.orb) {
          result.push({ planet1: names[i], planet2: names[j], type: a.name, typeKo: a.nameKo, orb: Math.round(orb * 100) / 100 });
        }
      }
    }
  }
  return result;
}

interface PlanetInfo {
  sign: string; signKo: string; signEmoji: string;
  degree: number; longitude: number; house: number;
}

interface ChartData {
  planets: Record<string, PlanetInfo>;
  ascendant: PlanetInfo & { longitude: number };
  midheaven: PlanetInfo & { longitude: number };
  aspects: AspectInfo[];
  northNode: PlanetInfo;
  southNode: PlanetInfo;
}

function buildChartData(
  year: number, month: number, day: number,
  hour: number, minute: number, tz: number,
  lat: number, lon: number,
): ChartData {
  const utcHour = hour + minute / 60 - tz;
  const utcDate = new Date(
    Date.UTC(year, month - 1, day, Math.floor(utcHour), Math.round(((utcHour % 1) + 1) % 1 * 60), 0)
  );
  const jd = julianDay(year, month, day, hour + minute / 60 - tz);

  const rawLons: Record<string, number> = {};
  for (const [name, body] of Object.entries(PLANET_BODIES)) {
    rawLons[name] = getTropicalLon(body, utcDate);
  }

  const nnLon = calcNorthNode(jd);
  const snLon = nd(nnLon + 180);
  const ascLon = calcAscendant(jd, lat, lon);
  const mcLon  = nd(ascLon + 270);

  const planets: Record<string, PlanetInfo> = {};
  for (const [name, lv] of Object.entries(rawLons)) {
    planets[name] = { ...zodiacOf(lv), house: wholeSignHouse(lv, ascLon) };
  }

  const lonForAspects: Record<string, number> = {};
  for (const n of Object.keys(PLANET_BODIES)) lonForAspects[n] = rawLons[n];
  const aspects = calcAspects(lonForAspects);

  return {
    planets,
    ascendant: { ...zodiacOf(ascLon), longitude: Math.round(ascLon * 10) / 10 },
    midheaven: { ...zodiacOf(mcLon),  longitude: Math.round(mcLon  * 10)  / 10 },
    aspects,
    northNode: { ...zodiacOf(nnLon), house: wholeSignHouse(nnLon, ascLon) },
    southNode: { ...zodiacOf(snLon), house: wholeSignHouse(snLon, ascLon) },
  };
}

// ─────────────────────────────────────────────────────────────────
// Gemini 호출 (sukuyo-life 동일 패턴)
// ─────────────────────────────────────────────────────────────────
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

function pickGeminiKeys(): string[] {
  const extra = String(process.env.GEMINI_API_KEYS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GOOGLE_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GOOGLE_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GOOGLE_API_KEY_4,
    process.env.GEMINI_API_KEY_CF,
    process.env.GOOGLE_API_KEY_CF,
    process.env.GEMINIF_API_KEY1,
    process.env.GEMINIF_API_KEY2,
    process.env.GEMINIF_API_KEY3,
    process.env.GEMINIF_API_KEY4,
    process.env.GEMINIF_API_KEY5,
    process.env.GEMINIF_API_KEY6,
    process.env.GEMINIF_API_KEY7,
    process.env.GEMINIF_API_KEY8,
    process.env.GEMINIF_API_KEY9,
    ...extra,
  ].map(v => String(v || "").trim()).filter(Boolean);
}

function pickGeminiModels(): string[] {
  const env = String(process.env.ASTRO_LIFE_GEMINI_MODEL || process.env.PSYCHO_ANALYSIS_GEMINI_MODEL || "").trim();
  const base = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
  return env ? [env, ...base] : base;
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

async function callGemini(prompt: string): Promise<string> {
  // ─── Vertex AI 우선 시도 ──────────────────────────────────────
  try {
    const vtxt = await callVertexGemini(prompt, { temperature: 0.90, maxOutputTokens: 16384 });
    if (vtxt) return vtxt;
  } catch { /* Vertex 실패 → API 키 폴백 */ }

  // ─── GEMINI API 키 폴백 ──────────────────────────────────────
  const keys   = pickGeminiKeys();
  const models = pickGeminiModels();
  if (!keys.length) return "";

  let attempts = 0;
  const maxAttempts = 4;

  for (const model of models) {
    if (attempts >= maxAttempts) break;
    for (const key of keys) {
      if (attempts >= maxAttempts) break;
      attempts += 1;
      try {
        const url = GEMINI_ENDPOINT.replace("{model}", model) + `?key=${key}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.90,
              maxOutputTokens: 16384,
              topK: 40,
              topP: 0.95,
            },
          }),
          signal: AbortSignal.timeout(18_000),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const text = parseGeminiText(data);
        if (text) return text;
      } catch { /* try next */ }
    }
  }
  return "";
}

function buildFallbackChapterText(chapter: number, chart: ChartData): string {
  const meta = CHAPTER_META[chapter - 1] || { title: `챕터 ${chapter}`, subtitle: "점성술 프리미엄" };
  return [
    `${meta.title}`,
    ``,
    `태양: ${chart.planets.Sun?.signKo || "미확인"} ${chart.planets.Sun?.house || "-"}H`,
    `달: ${chart.planets.Moon?.signKo || "미확인"} ${chart.planets.Moon?.house || "-"}H`,
    `상승궁: ${chart.ascendant?.signKo || "미확인"}`,
    ``,
    `AI 응답이 지연되어 차트 핵심값 기반 요약을 먼저 제공합니다. 잠시 후 다시 시도하면 심층 본문이 채워집니다.`,
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────────
// 챕터 메타
// ─────────────────────────────────────────────────────────────────
const CHAPTER_META = [
  { num:  1, title: "페르소나와 존재의 핵",       subtitle: "ASC·Sun·Moon의 입체적 결합",             icon: "🌌" },
  { num:  2, title: "감정의 뿌리",                subtitle: "Moon & 4하우스 — 무의식의 안전가옥",      icon: "🌊" },
  { num:  3, title: "인지 체계와 정보의 연금술",  subtitle: "Mercury & 3·9하우스",                     icon: "🧠" },
  { num:  4, title: "욕망의 미학과 가치 자산",    subtitle: "Venus & 2·7하우스",                       icon: "💎" },
  { num:  5, title: "추진력의 방향과 에너지 관리",subtitle: "Mars & 1·8하우스",                        icon: "⚡" },
  { num:  6, title: "행운의 좌표와 확장의 철학",  subtitle: "Jupiter & 9하우스",                       icon: "🌠" },
  { num:  7, title: "업보의 한계와 마스터의 길",  subtitle: "Saturn & 10하우스",                       icon: "🏛️" },
  { num:  8, title: "세대적 변화와 개인의 혁신",  subtitle: "Uranus · Neptune · Pluto",                icon: "🌀" },
  { num:  9, title: "영혼의 나침반",              subtitle: "Lunar Nodes — North/South Node",          icon: "🧭" },
  { num: 10, title: "시냅스트리 — 관계의 심리적 투사", subtitle: "궁합 1: 두 차트 행성 각도 분析",   icon: "🔮" },
  { num: 11, title: "컴포지트 — 우리라는 독립적 운명", subtitle: "궁합 2: 합산 차트 분析",           icon: "⭕" },
  { num: 12, title: "별들의 마스터플랜",           subtitle: "총결산 및 개운법",                       icon: "✨" },
];

// ─────────────────────────────────────────────────────────────────
// 행성 요약 텍스트 생성 헬퍼
// ─────────────────────────────────────────────────────────────────
function fmtPlanet(p: PlanetInfo, name: string): string {
  return `${name}: ${p.signEmoji}${p.signKo} ${p.degree}° / ${p.house}하우스`;
}

function fmtAspects(aspects: AspectInfo[], filter: string[]): string {
  return aspects
    .filter(a => filter.includes(a.planet1) || filter.includes(a.planet2))
    .map(a => `${a.planet1}↔${a.planet2} ${a.typeKo} (오브 ${a.orb}°)`)
    .join(", ") || "주요 각도 없음";
}

// ─────────────────────────────────────────────────────────────────
// 12챕터 프롬프트 빌더
// ─────────────────────────────────────────────────────────────────
function buildPrompt(ch: number, chart: ChartData): string {
  const p = chart.planets;
  const asc = chart.ascendant;
  const mc  = chart.midheaven;
  const nn  = chart.northNode;
  const sn  = chart.southNode;

  const baseData = `[출생 차트 핵심 데이터 — 열대황도 기준]
▸ ASC(상승궁): ${asc.signEmoji}${asc.signKo} ${asc.degree}°
▸ MC(중천):    ${mc.signEmoji}${mc.signKo} ${mc.degree}°
▸ ${fmtPlanet(p.Sun,     "태양(Sun)")}
▸ ${fmtPlanet(p.Moon,    "달(Moon)")}
▸ ${fmtPlanet(p.Mercury, "수성(Mercury)")}
▸ ${fmtPlanet(p.Venus,   "금성(Venus)")}
▸ ${fmtPlanet(p.Mars,    "화성(Mars)")}
▸ ${fmtPlanet(p.Jupiter, "목성(Jupiter)")}
▸ ${fmtPlanet(p.Saturn,  "토성(Saturn)")}
▸ ${fmtPlanet(p.Uranus,  "천왕성(Uranus)")}
▸ ${fmtPlanet(p.Neptune, "해왕성(Neptune)")}
▸ ${fmtPlanet(p.Pluto,   "명왕성(Pluto)")}
▸ ${fmtPlanet(nn, "노스 노드(NorthNode)")}
▸ ${fmtPlanet(sn, "사우스 노드(SouthNode)")}`;

  const style = `[작성 지침]
■ 너는 융 심리학 + 현대 점성술 + 행동과학을 통합한 세계 최고의 점성술 권위자다.
■ 전문 점성술 용어(어스펙트·디그니티·차트 룰러 등)를 적절히 섞어 쓰되 한글 설명을 병기한다.
■ 분량: 5,000자 이상 (각 섹션 ## 제목 포함)
■ 구조: ## 섹션 제목 형식으로 4~5섹션 구분
■ 금지: 미신적 부적·굿·무속, 무책임한 예언, 단순 길흉 나열
■ 필수: 심리학·행동과학과 연계된 구체적 실행 가이드`;

  switch (ch) {
    case 1: {
      const ascRuler = getChartRuler(asc.sign);
      const rulerPos = p[ascRuler];
      const triad = fmtAspects(chart.aspects, ["Sun","Moon"]);
      return `${baseData}
▸ 차트 통치성(Chart Ruler): ${ascRuler} → ${rulerPos ? fmtPlanet(rulerPos, ascRuler) : "데이터 없음"}
▸ Sun-Moon 각도: ${triad}

[챕터 1 작성 지시]
너는 융 심리학 기반의 점성술 권위자다. 아래 구조로 챕터 1을 작성하라.

## 1. 상승궁의 마스크 — ${asc.signKo}이 세상에 보여주는 얼굴
ASC의 별자리 에너지가 신체적·사회적 페르소나에 어떻게 투영되는지 구체적으로 서술하라.

## 2. 태양의 자아실현 의지 — ${p.Sun.signKo} ${p.Sun.house}하우스의 목적
의식적 목적(태양)이 어느 무대(하우스)에서 빛을 발하는지 분析하고 실현 방법을 제시하라.

## 3. 달의 정서적 본능 — ${p.Moon.signKo} ${p.Moon.house}하우스의 안전가옥
무의식적 감정 반응 패턴과 정서적 안정감을 얻는 방식을 분析하라.

## 4. Triad 역학 — ASC·Sun·Moon의 충돌과 조화
세 요소가 서로 충돌하거나 보완하는 지점을 에스펙트와 원소·모달리티를 중심으로 입체적으로 분析하라.

## 5. 차트 룰러의 위치와 인생 환경
상승궁 통치성(${ascRuler})이 ${rulerPos?.signKo ?? ""}에 놓인 맥락에서 인생의 전반적 무대를 묘사하고, 기질적 약점을 보완할 행동 루틴을 5가지 이상 제시하라.

${style}`;
    }

    case 2:
      return `${baseData}
▸ 4하우스 행성: ${getPlanetsInHouse(chart, 4)}
▸ 달 디그니티: ${getMoonDignity(p.Moon.sign)}
▸ Moon 주요 각도: ${fmtAspects(chart.aspects, ["Moon"])}

[챕터 2 작성 지시]
## 1. 달의 기원 — ${p.Moon.signKo} 달빛이 새긴 정서 DNA
달이 위치한 별자리의 원소적 특징이 어린 시절과 정서적 기반에 미친 영향을 설명하라.

## 2. 4하우스의 그림자 — 유년기 환경이 남긴 무의식의 흔적
4하우스 행성(${getPlanetsInHouse(chart, 4)})이 암시하는 가정 환경과 성인이 된 지금도 반복되는 정서 패턴을 분析하라.

## 3. 감정 상처 치유 지도
네빌 고다드식 가정의 법칙과 IFS(내면 가족 체계) 심리학을 활용해 내면의 아이를 치유하는 심상화 기법을 5,000자 분량으로 제안하라.

## 4. 풍요로운 감정 상태 선점 전략
달의 디그니티(${getMoonDignity(p.Moon.sign)}) 상태를 고려해 감정적 풍요를 일상에서 구현하는 구체적 루틴을 제시하라.

## 5. 안전가옥 설계도
이 사람이 심리적으로 회복할 수 있는 공간·관계·활동을 구체적으로 설계하라.

${style}`;

    case 3:
      return `${baseData}
▸ 3하우스 행성: ${getPlanetsInHouse(chart, 3)}
▸ 9하우스 행성: ${getPlanetsInHouse(chart, 9)}
▸ Mercury 주요 각도: ${fmtAspects(chart.aspects, ["Mercury"])}

[챕터 3 작성 지시]
## 1. 수성의 사고 지도 — ${p.Mercury.signKo} ${p.Mercury.house}하우스의 인지 체계
수성의 별자리와 하우스가 학습 방식·소통 스타일·정보 처리 패턴에 미치는 영향을 분析하라.

## 2. 사고의 편향성 진단
수성이 맺고 있는 주요 에스펙트(${fmtAspects(chart.aspects, ["Mercury"])})를 통해 인지적 강점과 맹점을 분析하라.

## 3. 지식 습득 최적화 전략
이 수성 배치에 맞는 학습법과 정보 정리 시스템을 리서치 보고서 톤으로 5,000자 분량으로 작성하라.

## 4. 퍼스널 브랜딩 커뮤니케이션 전략
디지털 시대에 이 수성 에너지를 살린 콘텐츠 포지셔닝과 소통 채널 전략을 제시하라.

## 5. 집중력과 디지털 디톡스 루틴
디지털 디톡스 주기, 집중력을 높이는 환경 세팅법, 좌뇌·우뇌 균형 훈련법을 구체적으로 제시하라.

${style}`;

    case 4:
      return `${baseData}
▸ 2하우스 행성: ${getPlanetsInHouse(chart, 2)}
▸ 7하우스 행성: ${getPlanetsInHouse(chart, 7)}
▸ Venus 상태: ${getVenusStatus(p.Venus, chart.aspects)}

[챕터 4 작성 지시]
## 1. 금성의 미학 코드 — ${p.Venus.signKo} ${p.Venus.house}하우스의 욕망 지도
아름다움·풍요·관계에서 이 금성 배치가 만들어내는 취향과 가치관을 분析하라.

## 2. 재물과의 무의식적 관계
2하우스(${getPlanetsInHouse(chart, 2)})가 암시하는 돈에 대한 무의식적 공포와 풍요 블록을 진단하고 치유 전략을 제시하라.

## 3. 관계의 끌림 패턴
7하우스(${getPlanetsInHouse(chart, 7)})의 에너지를 통해 연인·파트너십에서 반복되는 패턴을 분析하라.

## 4. 금성 역행 / 흉성 각도 전환법
금성의 현재 에스펙트 상태(${getVenusStatus(p.Venus, chart.aspects)})를 고려해 억압된 미적 욕구를 취미·예술로 승화하는 구체적 방법을 제시하라.

## 5. 부를 끌어당기는 스타일링 & 재정 전략
럭셔리하지만 실용적인 재정 계획을 5,000자 분량으로 제시하고, 가치관 체크리스트를 포함하라.

${style}`;

    case 5:
      return `${baseData}
▸ 1하우스 행성: ${getPlanetsInHouse(chart, 1)}
▸ 8하우스 행성: ${getPlanetsInHouse(chart, 8)}
▸ Mars 주요 각도: ${fmtAspects(chart.aspects, ["Mars"])}

[챕터 5 작성 지시]
## 1. 화성의 추진 엔진 — ${p.Mars.signKo} ${p.Mars.house}하우스의 에너지 근원
이 화성 배치가 만들어내는 추진력의 특성, 행동 방식, 목표 추구 패턴을 분析하라.

## 2. 에너지 고갈 시 나타나는 그림자
에너지가 소진될 때 나타나는 공격성·무력감·번아웃의 패턴과 조절법을 심리학적으로 분析하라.

## 3. 운동 루틴 최적화
이 화성 에너지에 최적화된 고강도·저강도 운동 조합과 회복 프로토콜을 구체적으로 제시하라.

## 4. 비즈니스 린(Lean) 실행 전략
화성 에너지를 창업·프로젝트 실행에 활용하는 린 방법론 기반 전략을 5,000자로 작성하라.

## 5. 에너지 배터리 관리법
일간·주간·월간 에너지 사이클을 파악하고 지속 가능한 활력을 유지하는 시스템을 설계하라.

${style}`;

    case 6:
      return `${baseData}
▸ 9하우스 행성: ${getPlanetsInHouse(chart, 9)}
▸ Jupiter 주요 각도: ${fmtAspects(chart.aspects, ["Jupiter"])}

[챕터 6 작성 지시]
## 1. 목성의 행운 좌표 — ${p.Jupiter.signKo} ${p.Jupiter.house}하우스의 황금 통로
이 목성 배치가 인생에서 가장 저항 없이 행운이 들어오는 영역과 방식을 분析하라.

## 2. 전문성 확장 로드맵
목성 에너지를 활용해 현재의 역량을 확장하고 해외·고등 학문·철학을 통해 성공하는 구체적 경로를 제시하라.

## 3. 행운 확률을 높이는 철학 정립
삶의 철학을 정립하고 목성 에너지에 공명하는 마인드셋을 5,000자로 제시하라.

## 4. 9하우스 활성화 전략
9하우스(${getPlanetsInHouse(chart, 9)}) 에너지를 일상에서 활성화하는 여행·학습·출판·종교·철학 활동 가이드를 제시하라.

## 5. 단기·장기 행운 캘린더
목성이 각 별자리를 운행하는 주기(약 1년)를 활용한 3년 행운 로드맵을 제시하라.

${style}`;

    case 7:
      return `${baseData}
▸ 10하우스 행성: ${getPlanetsInHouse(chart, 10)}
▸ Saturn 주요 각도: ${fmtAspects(chart.aspects, ["Saturn"])}
▸ Saturn Return 예상: ${getSaturnReturn(p.Saturn)}

[챕터 7 작성 지시]
## 1. 토성이 가리키는 숙제 — ${p.Saturn.signKo} ${p.Saturn.house}하우스의 최대 결핍
이 토성 배치가 암시하는 인생의 가장 큰 공포·결핍·도전 과제를 직시하고 명확히 정의하라.

## 2. 마스터의 길 10년 로드맵
이 토성 영역에서 10년 이상 헌신해 최고 전문가(Master)가 되는 단계별 전략을 수립하라.

## 3. 토성의 시험과 성숙의 의미
토성 리턴(${getSaturnReturn(p.Saturn)}) 시기와 그 이전/이후에 주어지는 성숙의 기회를 설명하라.

## 4. 시간 관리와 책임감 강화
구조·규율·인내를 일상에 내재화하는 현대적 행동 교정 시스템을 5,000자 분량의 전문 컨설팅 리포트로 작성하라.

## 5. 10하우스 사회적 성취 전략
10하우스(${getPlanetsInHouse(chart, 10)}) 에너지를 커리어와 사회적 명성으로 전환하는 구체적 전략을 제시하라.

${style}`;

    case 8:
      return `${baseData}
▸ Uranus 주요 각도: ${fmtAspects(chart.aspects, ["Uranus"])}
▸ Neptune 주요 각도: ${fmtAspects(chart.aspects, ["Neptune"])}
▸ Pluto 주요 각도: ${fmtAspects(chart.aspects, ["Pluto"])}

[챕터 8 작성 지시]
## 1. 천왕성의 혁신 코드 — ${p.Uranus.signKo} ${p.Uranus.house}하우스의 독창성
이 세대의 천왕성 에너지가 개인의 삶에서 어떻게 독창적인 혁신으로 발현되는지 분析하라.

## 2. 해왕성의 영감과 환상 — ${p.Neptune.signKo} ${p.Neptune.house}하우스
직관·예술·영성이 이 배치에서 어떻게 나타나며, 환상과 현실의 경계를 어떻게 다룰지 분析하라.

## 3. 명왕성의 변용 에너지 — ${p.Pluto.signKo} ${p.Pluto.house}하우스
생사(生死)와 변혁의 에너지가 개인을 어떻게 해체하고 재탄생시키는지 분析하라.

## 4. 창의적 발상법과 영적 번아웃 예방
고정관념을 깨는 창의 기법과 영적 번아웃을 예방하는 정화 루틴을 5,000자로 서술하라.

## 5. 세대적 사명과 집단적 혁신 기여
이 외행성 배치를 통해 이 시대에 기여할 수 있는 집단적 사명을 제시하라.

${style}`;

    case 9:
      return `${baseData}
▸ 노스 노드: ${nn.signEmoji}${nn.signKo} ${nn.house}하우스
▸ 사우스 노드: ${sn.signEmoji}${sn.signKo} ${sn.house}하우스
▸ 노드 각도: ${fmtAspects(chart.aspects, ["NorthNode","SouthNode"])}

[챕터 9 작성 지시]
## 1. 사우스 노드의 안주 — ${sn.signKo} ${sn.house}하우스의 익숙한 함정
전생(前生)의 익숙한 패턴과 자꾸만 안주하려는 습관적 행동 양식을 날카롭게 분析하라.

## 2. 노스 노드의 부름 — ${nn.signKo} ${nn.house}하우스의 영혼 목적지
두렵지만 반드시 나아가야 할 이번 생의 진화 방향을 구체적으로 제시하라.

## 3. 노드 축의 균형 맞추기
사우스와 노스 사이에서 극단에 치우치지 않고 균형을 맞추며 진화하는 방법을 분析하라.

## 4. 영혼의 진화 챌린지 22가지
일상에서 실행할 수 있는 노드 축 균형 과제를 5,000자 분량으로 구체적으로 제시하라.

## 5. 영적 퀘스트 로드맵
이번 생의 카르마적 사명을 완수하기 위한 단계별 영적 성장 지도를 설계하라.

${style}`;

    case 10:
      return `${baseData}

※ [챕터 10: 시냅스트리]는 두 사람의 차트 비교 분析이지만, 단일 차트 데이터로 분서 시에는 이 사람이 상대방에게 투사하는 심리적 패턴을 분析한다.

[챕터 10 작성 지시]
## 1. 관계에서의 심리적 투사 패턴
태양·달·금성·화성의 별자리와 하우스를 기반으로, 이 사람이 연인·파트너에게 투사하는 심리적 패턴을 분析하라.

## 2. 상대를 자극하는 트리거 포인트
토성·명왕성의 하드 에스펙트(${fmtAspects(chart.aspects, ["Saturn","Pluto"])})로 인해 관계에서 반복되는 갈등 패턴을 분析하라.

## 3. 이상적인 파트너십 조건
이 차트 주인이 실질적인 심리적 성장을 이룰 수 있는 파트너의 조건을 제시하라.

## 4. 비폭력 대화법 적용 가이드
관계 갈등을 NVC(비폭력 대화법)와 심리적 경계 설정을 통해 해소하는 방법을 5,000자로 코칭하라.

## 5. 사랑의 성숙 단계 로드맵
연애→결혼→생애 파트너십으로 이어지는 각 단계별 심리적 과제를 제시하라.

${style}`;

    case 11:
      return `${baseData}

[챕터 11 작성 지시]
※ 컴포지트 차트는 두 차트의 중간점이 필요하나, 단일 차트 분析 시에는 '이 관계(차트 주인의 입장)가 세상에 만들어낼 수 있는 공적 에너지'를 분析한다.

## 1. 제3의 에너지 — 이 사람이 관계에서 창조하는 힘
ASC와 7하우스(${getPlanetsInHouse(chart, 7)})를 중심으로 이 사람이 관계에서 창조하는 독자적 에너지를 분析하라.

## 2. 공동의 사회적 목적
이 차트의 MC(${mc.signKo})와 10하우스(${getPlanetsInHouse(chart, 10)})를 통해 파트너와 함께 추구할 수 있는 사회적·비즈니스적 목표를 제시하라.

## 3. 관계의 위기 극복 공동 지침
관계가 위기를 맞을 때 두 사람이 함께 실행할 수 있는 행동 지침을 5,000자로 작성하라.

## 4. 베노 다이어그램 — 나와 우리의 교집합
개인의 목표(나)와 관계의 공동 목표(우리)가 어우러지는 영역을 명확히 정의하고 조화 전략을 제시하라.

## 5. 관계의 진화 시나리오
3단계(끌림→성숙→헌신)로 나누어 이상적인 관계 발전 경로를 설계하라.

${style}`;

    case 12:
      return `${baseData}
▸ 차트 통치성: ASC ${asc.signKo} → ${getChartRuler(asc.sign)} ${p[getChartRuler(asc.sign)] ? fmtPlanet(p[getChartRuler(asc.sign)], getChartRuler(asc.sign)) : ""}
▸ 차트 내 모든 에스펙트: ${chart.aspects.length}개

[챕터 12 작성 지시]
너는 이 사람의 가장 친밀한 우주적 조언자다. 1~11챕터의 모든 데이터를 종합하여 최종 마스터플랜을 작성하라.

## 1. 차트 전체 요약 — 별들이 그린 운명의 지도
차트의 전반적인 패턴(원소 균형·모달리티·반구 강세)을 분析하고 인생의 큰 맥락을 서술하라.

## 2. 단 하나의 마스터 해빗
이 차트의 모든 불균형을 해결할 수 있는 핵심 습관 하나를 도출하고, 그 이유와 실행 방법을 5,000자 이상으로 설득력 있게 서술하라.

## 3. 우주 에너지를 아군으로 만드는 개운법
행성 에너지를 일상에서 의식적으로 활성화하는 실용적 개운 루틴(요일별·행성별 의례)을 제시하라.

## 4. 감동적인 인생 조언
이 사람의 별자리 배치를 모두 고려해 가장 감동적이고 진심 어린 인생 조언을 5,000자 이상으로 작성하라.

## 5. 인증서 형식의 운명 선언문
이 리포트를 마무리하는 고급스러운 운명 선언문을 작성하라. "나, [이 별자리 배치를 가진 영혼]은…" 형식으로 자아 선언의 형태로 작성하라.

${style}`;

    default:
      return `${baseData}\n\n챕터 ${ch}에 대한 점성술 심층 분析을 5,000자 이상 작성하라.\n${style}`;
  }
}

// ─────────────────────────────────────────────────────────────────
// 보조 헬퍼 함수들
// ─────────────────────────────────────────────────────────────────
const RULERS: Record<string, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Pluto",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Uranus", Pisces: "Neptune",
};
function getChartRuler(sign: string): string { return RULERS[sign] || "Sun"; }

function getPlanetsInHouse(chart: ChartData, house: number): string {
  const entries: string[] = [];
  for (const [name, info] of Object.entries(chart.planets)) {
    if (info.house === house) entries.push(`${name}(${info.signKo})`);
  }
  if (chart.northNode.house === house) entries.push("NorthNode");
  if (chart.southNode.house === house) entries.push("SouthNode");
  return entries.length ? entries.join(", ") : "행성 없음";
}

function getMoonDignity(sign: string): string {
  const dignities: Record<string, string> = {
    Cancer: "최고품위(Domicile — 게자리는 달의 본거지)",
    Taurus: "고양(Exaltation — 황소자리에서 달은 고양)",
    Capricorn: "추락(Detriment — 염소자리에서 달은 세력 약화)",
    Scorpio: "실추(Fall — 전갈자리에서 달은 실추)",
  };
  return dignities[sign] || `중립 품위(${sign})`;
}

function getVenusStatus(venus: PlanetInfo, aspects: AspectInfo[]): string {
  const hardAspects = aspects.filter(
    a => (a.planet1 === "Venus" || a.planet2 === "Venus") &&
         ["Square","Opposition"].includes(a.type)
  );
  const hasRetrograde = venus.degree < 5 || venus.degree > 25; // 역행 근사 판별
  const status = [];
  if (hardAspects.length) status.push(`흉성 각도: ${hardAspects.map(a => `${a.planet1}↔${a.planet2} ${a.typeKo}`).join(", ")}`);
  if (hasRetrograde) status.push("역행 가능성");
  return status.length ? status.join(" / ") : "순행·양호";
}

function getSaturnReturn(saturn: PlanetInfo): string {
  return `${saturn.signKo} 귀환 주기(약 29.5년마다)`;
}

// 섹션 파서 (## 분리)
function parseSections(text: string): { title: string; body: string }[] {
  const parts = text.split(/^##\s+/m).filter(Boolean);
  return parts.map(part => {
    const nl = part.indexOf("\n");
    const title = nl === -1 ? part.trim() : part.slice(0, nl).trim();
    const body  = nl === -1 ? "" : part.slice(nl + 1).trim();
    return { title, body };
  });
}

// ─────────────────────────────────────────────────────────────────
// POST 핸들러
// ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      year: number; month: number; day: number;
      hour?: number; minute?: number; timezone?: number;
      lat?: number; lon?: number; chapter: number;
    };

    const { year, month, day, chapter } = body;
    const hour   = body.hour    ?? 12;
    const minute = body.minute  ?? 0;
    const tz     = body.timezone ?? 9;
    const lat    = body.lat     ?? 37.5665;
    const lon    = body.lon     ?? 126.9780;

    if (!year || !month || !day || !chapter) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }
    if (chapter < 1 || chapter > 12) {
      return NextResponse.json({ ok: false, error: "Chapter must be 1-12" }, { status: 400 });
    }

    // 1) 차트 계산 (내부 엔진)
    const chart = buildChartData(year, month, day, hour, minute, tz, lat, lon);

    // 2) AI 텍스트 생성
    const prompt = buildPrompt(chapter, chart);
    let text = await callGemini(prompt);
    if (!text.trim()) {
      text = buildFallbackChapterText(chapter, chart);
    }

    // 3) 섹션 파싱
    const sections = parseSections(text);

    return NextResponse.json({
      ok: true,
      chart: {
        planets:   chart.planets,
        ascendant: chart.ascendant,
        midheaven: chart.midheaven,
        aspects:   chart.aspects,
        northNode: chart.northNode,
        southNode: chart.southNode,
      },
      chapter,
      chapterMeta: CHAPTER_META[chapter - 1],
      text,
      sections,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/premium/astro-life]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
