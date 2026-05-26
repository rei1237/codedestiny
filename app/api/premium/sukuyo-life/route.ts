import { NextRequest, NextResponse } from "next/server";
import { callVertexGemini } from "@/app/_lib/callVertexGemini";
import { requireRouteAuth } from "@/app/_lib/route-auth";
import { requirePremiumRouteAccess } from "@/app/_lib/premium-route-access";

export const runtime = "nodejs";
export const maxDuration = 900;

const MANSIONS = [
  ["각", "角", "Kaku", "동", "목", "청룡"],
  ["항", "亢", "Kou", "동", "금", "청룡"],
  ["저", "氐", "Tei", "동", "토", "청룡"],
  ["방", "房", "Bou", "동", "일", "청룡"],
  ["심", "心", "Shin", "동", "월", "청룡"],
  ["미", "尾", "Bi", "동", "화", "청룡"],
  ["기", "箕", "Ki", "동", "수", "청룡"],
  ["두", "斗", "To", "북", "목", "현무"],
  ["여", "女", "Jo", "북", "토", "현무"],
  ["허", "虛", "Kyo", "북", "일", "현무"],
  ["위", "危", "Ki", "북", "월", "현무"],
  ["실", "室", "Shitsu", "북", "화", "현무"],
  ["벽", "壁", "Heki", "북", "수", "현무"],
  ["규", "奎", "Kei", "서", "목", "백호"],
  ["루", "婁", "Ro", "서", "금", "백호"],
  ["위", "胃", "I", "서", "토", "백호"],
  ["묘", "昴", "Bo", "서", "일", "백호"],
  ["필", "畢", "Hitsu", "서", "월", "백호"],
  ["자", "觜", "Shi", "서", "화", "백호"],
  ["삼", "參", "Shin", "서", "수", "백호"],
  ["정", "井", "Sei", "남", "목", "주작"],
  ["귀", "鬼", "Ki", "남", "금", "주작"],
  ["류", "柳", "Ryu", "남", "토", "주작"],
  ["성", "星", "Sei", "남", "일", "주작"],
  ["장", "張", "Cho", "남", "월", "주작"],
  ["익", "翼", "Yoku", "남", "화", "주작"],
  ["진", "軫", "Shin", "남", "수", "주작"],
] as const;

const MONTH_START = [11, 13, 15, 17, 19, 21, 23, 25, 0, 2, 4, 7];
const COMPAT_CHAPTER_META = [
  { num: 1, title: "두 사람의 숙요 궁합 총론", subtitle: "인연의 기본 구조와 첫 공명", icon: "🌙" },
  { num: 2, title: "27숙 개별 성향 분석", subtitle: "서로의 본질과 감정 결", icon: "🪞" },
  { num: 3, title: "숙요 관계 유형 분석", subtitle: "명·업태·영친·우쇠·안괴·위성", icon: "🧭" },
  { num: 4, title: "거리 관계 분석", subtitle: "근거리·중거리·원거리 체감", icon: "📏" },
  { num: 5, title: "첫 끌림과 운명감", subtitle: "왜 서로에게 강하게 끌리는가", icon: "🧲" },
  { num: 6, title: "감정 궁합", subtitle: "마음이 통하는 방식과 어긋남", icon: "💞" },
  { num: 7, title: "연애 궁합", subtitle: "사랑의 속도와 관계 운영 방식", icon: "❤️" },
  { num: 8, title: "결혼 궁합", subtitle: "함께 살아갈 현실 구조", icon: "💍" },
  { num: 9, title: "갈등 구조 분석", subtitle: "왜 싸우고 어디서 무너지는가", icon: "⚠️" },
  { num: 10, title: "안괴·위험 관계 집중 분석", subtitle: "강한 끌림과 파괴성의 경계", icon: "🚨" },
  { num: 11, title: "영친·업태·우쇠 분석", subtitle: "오래 가는 인연의 조건", icon: "🤝" },
  { num: 12, title: "속궁합과 친밀감", subtitle: "몸과 마음의 밀착도", icon: "🔥" },
  { num: 13, title: "재회·이별·미련 분석", subtitle: "끊어지는가 돌아오는가", icon: "🔁" },
  { num: 14, title: "관계의 시기와 흐름", subtitle: "가까워질 때와 조심할 때", icon: "⏳" },
  { num: 15, title: "현실 궁합", subtitle: "돈, 일, 생활, 가족 문제", icon: "🏠" },
  { num: 16, title: "최종 궁합 리포트", subtitle: "이 관계를 어떻게 다뤄야 하는가", icon: "📜" },
];

const COMPAT_CHAPTER_GUIDES = [
  "두 사람의 27숙, 사랑 방식, 핵심 차이와 공통점을 한 번에 요약 포함",
  "각자 감정 구조, 상처 포인트, 본능적 반응 차이를 비교 포함",
  "명·업태·영친·우쇠·안괴·위성의 장점과 위험을 구체적으로 포함",
  "영·근·중·원 거리 해석과 체감상 거리 조절법 포함",
  "첫 끌림의 원인, 투사와 진짜 운명감 구분 포함",
  "표현 방식, 불안 반응, 화해 속도, 감정 회복법 포함",
  "연락, 질투, 데이트, 관계 주도권, 권태기 대응 포함",
  "돈, 가족, 역할 분담, 결혼 후 갈등 포인트 포함",
  "반복 싸움의 주제, 방어기제, 상처 주는 말투와 해결 규칙 포함",
  "집착·통제·소진 신호와 건강한 거리두기 원칙 포함",
  "장기형 인연의 장점, 피로 누적 지점, 성숙 전략 포함",
  "신체적 친밀감, 정서적 밀착, 오해 줄이는 대화 포함",
  "이별 가능성, 재회 조건, 돌아와도 반복될 문제 포함",
  "가까워질 때, 쉬어야 할 때, 고백·공식화 타이밍 포함",
  "돈, 일, 생활, 가족, 책임감 문제의 현실 조율안 포함",
  "최종 관계 선언문, 유지 전략, 절대 피할 행동 포함",
];

const SOLO_CHAPTER_META = COMPAT_CHAPTER_META;
const SOLO_CHAPTER_GUIDES = COMPAT_CHAPTER_GUIDES;

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

function pad2(v: number) {
  return String(v).padStart(2, "0");
}

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

function parseSections(text: string) {
  return text.split(/\n(?=##\s+)/g).map((part) => {
    const m = part.match(/^##\s*(.+?)\n([\s\S]*)$/);
    return m ? { title: m[1].trim(), body: m[2].trim() } : null;
  }).filter(Boolean) as { title: string; body: string }[];
}

function buildSukuyoFromLunar(lunarMonth: number, lunarDay: number, isLeap = false) {
  const safeMonth = Math.max(1, Math.min(12, Math.abs(Number(lunarMonth) || 1)));
  const safeDay = Math.max(1, Math.min(30, Math.abs(Number(lunarDay) || 1)));
  const start = MONTH_START[safeMonth - 1] ?? 11;
  const mansionIdx = (start + safeDay - 1) % 27;
  const m = MANSIONS[mansionIdx];
  return {
    mansionIdx,
    mansion: m[0],
    mansionCh: m[1],
    mansionEn: m[2],
    icon: "🌙",
    direction: m[3],
    element: m[4],
    animal: m[5],
    lunarMonth: safeMonth,
    lunarDay: safeDay,
    isLeap,
    source: "kasi-api",
  };
}

async function fetchKasiLunarFromSolar(req: NextRequest, year: number, month: number, day: number) {
  try {
    const response = await fetch(`${req.nextUrl.origin}/api/kasi/calendar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "getLunCalInfo",
        params: {
          solYear: String(year),
          solMonth: pad2(month),
          solDay: pad2(day),
        },
      }),
      signal: AbortSignal.timeout(8_000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok || !Array.isArray(data?.rows) || !data.rows.length) return null;
    const row = data.rows[0] || {};
    const lunarYear = Number(row.lunYear ?? row.year ?? row.lunarYear);
    const lunarMonth = Number(row.lunMonth ?? row.month ?? row.lunarMonth);
    const lunarDay = Number(row.lunDay ?? row.day ?? row.lunarDay);
    const leapRaw = String(row.lunLeapmonth ?? row.isLeap ?? row.leapMonth ?? "").trim().toLowerCase();
    const isLeap = leapRaw === "1" || leapRaw === "y" || leapRaw === "true" || leapRaw === "윤" || leapRaw === "leap";
    if (!Number.isFinite(lunarYear) || !Number.isFinite(lunarMonth) || !Number.isFinite(lunarDay)) return null;
    return { lunarYear, lunarMonth, lunarDay, isLeap };
  } catch {
    return null;
  }
}

async function calcSukuyo(req: NextRequest, year: number, month: number, day: number) {
  const kasiLunar = await fetchKasiLunarFromSolar(req, year, month, day);
  if (kasiLunar) {
    return buildSukuyoFromLunar(kasiLunar.lunarMonth, kasiLunar.lunarDay, kasiLunar.isLeap);
  }
  return null;
}

type SukuyoProfile = NonNullable<Awaited<ReturnType<typeof calcSukuyo>>>;

function relation(myIdx: number, otherIdx?: number | null) {
  if (otherIdx == null) return null;
  const d = (otherIdx - myIdx + 27) % 27;
  const labels = ["명", "친", "우", "안", "성", "위", "괴", "업", "태"];
  return { distance: d, label: labels[d % labels.length], score: Math.max(38, 96 - Math.abs(13 - d) * 4) };
}

function relationDistanceBand(distance: number) {
  const d = Math.abs(Number(distance) || 0);
  if (d === 0) return "영거리";
  if (d <= 6) return "근거리";
  if (d <= 13) return "중거리";
  return "원거리";
}

function buildCompatibilityScores(sukuyo: any, partner: any, rel: any) {
  if (!partner || !rel) return null;
  const base = Number(rel.score || 50);
  const distance = Number(rel.distance || 0);
  const distancePenalty = Math.min(22, Math.abs(13 - distance) * 1.5);
  const firstAttraction = Math.max(45, Math.min(98, Math.round(base + 18 - distancePenalty / 2)));
  const emotionalStability = Math.max(35, Math.min(96, Math.round(base - distancePenalty + 6)));
  const conflictRisk = Math.max(20, Math.min(95, Math.round(100 - emotionalStability + 10)));
  const longTerm = Math.max(32, Math.min(96, Math.round((firstAttraction * 0.35) + (emotionalStability * 0.65))));
  const marriageFit = Math.max(30, Math.min(95, Math.round((longTerm + emotionalStability) / 2)));
  const reunion = Math.max(28, Math.min(94, Math.round((firstAttraction * 0.5) + (100 - conflictRisk) * 0.5)));
  const growthSynergy = Math.max(36, Math.min(97, Math.round((base + firstAttraction) / 2)));
  const fatigue = Math.max(18, Math.min(96, Math.round((conflictRisk * 0.62) + (distancePenalty * 0.38))));

  return {
    distanceType: relationDistanceBand(rel.distance),
    relationType: String(rel.label || "명"),
    userRole: "사용자",
    partnerRole: "상대",
    firstAttraction,
    emotionalStability,
    conflictRisk,
    longTermSustainability: longTerm,
    marriageCompatibility: marriageFit,
    reunionPossibility: reunion,
    growthSynergy,
    relationshipFatigue: fatigue,
  };
}

function normalizeDeg(value: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  let d = n % 360;
  if (d < 0) d += 360;
  return d;
}

function extractSwissEclipticLongitude(chartPayload: any, planetName: string) {
  if (!chartPayload || !planetName) return NaN;
  const direct = Number(chartPayload?.planets?.[planetName]?.longitude);
  if (Number.isFinite(direct)) return normalizeDeg(direct);
  const flat = Number(chartPayload?.planets?.[planetName]);
  if (Number.isFinite(flat)) return normalizeDeg(flat);
  const lower = String(planetName).toLowerCase();
  const lowerObj = Number(chartPayload?.planets?.[lower]?.longitude);
  if (Number.isFinite(lowerObj)) return normalizeDeg(lowerObj);
  const lowerFlat = Number(chartPayload?.planets?.[lower]);
  if (Number.isFinite(lowerFlat)) return normalizeDeg(lowerFlat);
  return NaN;
}

function resolveMoonPhaseByAngle(angle: number) {
  const a = normalizeDeg(angle);
  if (!Number.isFinite(a)) {
    return {
      phaseAngle: null,
      illumination: null,
      label: "정보 없음",
      cycle: "미확인",
      yinYangFlow: "미확인",
    };
  }

  let label = "정보 없음";
  if (a < 22.5 || a >= 337.5) label = "삭(신월)";
  else if (a < 67.5) label = "초승";
  else if (a < 112.5) label = "상현";
  else if (a < 157.5) label = "차는달";
  else if (a < 202.5) label = "망(보름)";
  else if (a < 247.5) label = "기우는달";
  else if (a < 292.5) label = "하현";
  else label = "그믐";

  const illumination = Math.round((((1 - Math.cos((a * Math.PI) / 180)) / 2) * 1000)) / 10;
  const waxing = a < 180;
  return {
    phaseAngle: Math.round(a * 10) / 10,
    illumination,
    label,
    cycle: waxing ? "상현 이전(증가)" : "하현 이후(감소)",
    yinYangFlow: waxing ? "양기 생장" : "음기 수렴",
  };
}

async function fetchSwissSukuyoBasis(req: NextRequest, payload: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  timezone?: number;
  lat?: number;
  lon?: number;
}) {
  try {
    const response = await fetch(`${req.nextUrl.origin}/api/astro/western-chart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: payload.year,
        month: payload.month,
        day: payload.day,
        hour: payload.hour,
        minute: Number.isFinite(Number(payload.minute)) ? Number(payload.minute) : 0,
        timezone: Number.isFinite(Number(payload.timezone)) ? Number(payload.timezone) : 9,
        lat: Number.isFinite(Number(payload.lat)) ? Number(payload.lat) : 37.5665,
        lon: Number.isFinite(Number(payload.lon)) ? Number(payload.lon) : 126.978,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) return null;
    const chartPayload = data?.chart ?? data?.data ?? data;
    return {
      moonLongitude: extractSwissEclipticLongitude(chartPayload, "Moon"),
      sunLongitude: extractSwissEclipticLongitude(chartPayload, "Sun"),
    };
  } catch {
    return null;
  }
}

function buildSukuyoOrientalChart(sukuyo: any, partner: any, rel: any, swissBasis: any, partnerSwissBasis: any) {
  const moonLon = Number(swissBasis?.moonLongitude);
  const sunLon = Number(swissBasis?.sunLongitude);
  const phase = resolveMoonPhaseByAngle(moonLon - sunLon);

  const partnerMoonLon = Number(partnerSwissBasis?.moonLongitude);
  const partnerSunLon = Number(partnerSwissBasis?.sunLongitude);
  const partnerPhase = Number.isFinite(partnerMoonLon) && Number.isFinite(partnerSunLon)
    ? resolveMoonPhaseByAngle(partnerMoonLon - partnerSunLon)
    : null;

  const wheel = MANSIONS.map((m, idx) => {
    const isPrimary = idx === sukuyo.mansionIdx;
    const isPartner = partner ? idx === partner.mansionIdx : false;
    return {
      index: idx + 1,
      mansion: m[0],
      mansionCh: m[1],
      mansionEn: m[2],
      direction: m[3],
      element: m[4],
      guardian: m[5],
      isPrimary,
      isPartner,
      role: isPrimary ? "본명숙" : (isPartner ? "상대숙" : ""),
    };
  });

  return {
    type: "sukuyo-oriental-chart",
    source: String(sukuyo.source || "kasi-api"),
    core: {
      primaryMansion: `${sukuyo.mansion}宿(${sukuyo.mansionCh})`,
      primaryDirection: sukuyo.direction,
      primaryElement: sukuyo.element,
      primaryGuardian: sukuyo.animal,
      lunarDate: `${sukuyo.lunarMonth}월 ${sukuyo.lunarDay}일`,
      partnerMansion: partner ? `${partner.mansion}宿(${partner.mansionCh})` : null,
    },
    moonPhase: phase,
    relation: rel ? {
      label: rel.label,
      distance: rel.distance,
      score: rel.score,
    } : null,
    swissBasis: {
      moonLongitude: Number.isFinite(moonLon) ? Math.round(normalizeDeg(moonLon) * 100) / 100 : null,
      sunLongitude: Number.isFinite(sunLon) ? Math.round(normalizeDeg(sunLon) * 100) / 100 : null,
      partnerMoonLongitude: Number.isFinite(partnerMoonLon) ? Math.round(normalizeDeg(partnerMoonLon) * 100) / 100 : null,
      partnerSunLongitude: Number.isFinite(partnerSunLon) ? Math.round(normalizeDeg(partnerSunLon) * 100) / 100 : null,
    },
    partnerMoonPhase: partnerPhase,
    wheel,
  };
}

function buildSukuyoChartSummaryLine(chart: any) {
  if (!chart) return "정보 없음";
  const core = chart.core || {};
  const phase = chart.moonPhase || {};
  const rel = chart.relation || {};
  return [
    `본명숙 ${core.primaryMansion || "정보 없음"}`,
    `방위 ${core.primaryDirection || "정보 없음"}`,
    `오행 ${core.primaryElement || "정보 없음"}`,
    `월상 ${phase.label || "정보 없음"}`,
    `삭망각 ${Number.isFinite(Number(phase.phaseAngle)) ? Number(phase.phaseAngle) : "정보 없음"}도`,
    `조도 ${Number.isFinite(Number(phase.illumination)) ? Number(phase.illumination) : "정보 없음"}%`,
    rel?.label ? `관계축 ${rel.label}` : null,
  ].filter(Boolean).join(", ");
}

function fallbackText(chapter: number, sukuyo: SukuyoProfile, rel: ReturnType<typeof relation>, reportMode: "personal" | "compatibility") {
  const metaList = reportMode === "compatibility" ? COMPAT_CHAPTER_META : SOLO_CHAPTER_META;
  const guideList = reportMode === "compatibility" ? COMPAT_CHAPTER_GUIDES : SOLO_CHAPTER_GUIDES;
  const meta = metaList[chapter - 1] ?? metaList[0];
  const relLine = rel ? `상대와의 숙요 관계는 ${rel.label}, 거리 ${rel.distance}, 카르마 점수 ${rel.score}입니다.` : "상대 정보가 없으므로 개인 숙요 흐름에 집중합니다.";
  return [
    `## ${meta.title}`,
    `${sukuyo.mansion}숙(${sukuyo.mansionCh}宿)은 ${sukuyo.direction}방 ${sukuyo.element} 기운으로 움직이는 27수 숙요점의 별입니다. 이 리포트는 사주 팔자 해석이 아니라 음력 탄생일에서 산출한 숙요 별자리와 달의 리듬을 기준으로 작성됩니다.`,
    `## 핵심 해석`,
    `${meta.subtitle} 관점에서 보면, 지금 중요한 것은 감정의 파동을 억지로 고정하지 않고 반복되는 관계 패턴과 선택 타이밍을 관찰하는 것입니다. ${sukuyo.mansion}숙은 직감이 먼저 길을 여는 타입이므로, 중요한 결정 전에는 하루 정도 달빛 숙성 시간을 두는 편이 좋습니다.`,
    `이 챕터의 필수 분석 포인트: ${guideList[chapter - 1] || "핵심 요약, 관계 구조, 위험 요소, 실천 조언"}`,
    `## 관계와 실행`,
    `${relLine} 이번 챕터의 실천은 간단합니다. 오늘의 감정 기록, 다음 행동 하나, 피해야 할 반응 하나를 분리해 적고 7일 동안 반복하세요. 숙요점은 사건 자체보다 리듬의 반복을 읽을 때 정확도가 올라갑니다.`,
  ].join("\n\n");
}

function buildPrompt(chapter: number, sukuyo: SukuyoProfile, reportMode: "personal" | "compatibility", partner?: SukuyoProfile | null, chart?: any, scores?: any) {
  const metaList = reportMode === "compatibility" ? COMPAT_CHAPTER_META : SOLO_CHAPTER_META;
  const guideList = reportMode === "compatibility" ? COMPAT_CHAPTER_GUIDES : SOLO_CHAPTER_GUIDES;
  const meta = metaList[chapter - 1] ?? metaList[0];
  const rel = relation(sukuyo.mansionIdx, partner?.mansionIdx);
  const chartLine = buildSukuyoChartSummaryLine(chart);
  const requiredMinChars = reportMode === "compatibility" ? 5000 : 2800;
  return `당신은 전문 숙요점(宿曜占, 27수) 리포트 작가입니다.

중요: 사주명리 PDF가 아니라 숙요점 PDF입니다. 십성, 용신, 대운 중심으로 쓰지 말고 27수, 달의 리듬, 숙요 관계성, 카르마 패턴 중심으로 작성하세요.
중요: 단정형 표현("무조건", "반드시 헤어진다", "천생연분 확정")을 금지하고, 상담가 문체로 행동 가능한 조언을 제시하세요.
리포트 모드: ${reportMode === "compatibility" ? "궁합(2인)" : "1인 기본"}

사용자 숙요: ${sukuyo.mansion}숙(${sukuyo.mansionCh}宿), ${sukuyo.direction}방, ${sukuyo.element} 기운, 음력 ${sukuyo.lunarMonth}월 ${sukuyo.lunarDay}일
상대 숙요: ${partner ? `${partner.mansion}숙(${partner.mansionCh}宿)` : "없음"}
관계 데이터: ${rel ? `${rel.label}, 거리 ${rel.distance}, 점수 ${rel.score}` : "개인 리포트"}
거리 유형: ${rel ? relationDistanceBand(rel.distance) : "개인 리포트"}
궁합 지표: ${scores ? JSON.stringify(scores) : "없음"}
숙요 동양식 차트 요약: ${chartLine}
챕터 ${chapter}: ${meta.title} - ${meta.subtitle}

아래 형식을 지켜 한국어로 고품질 PDF 본문을 작성하세요.
## 핵심 원형
## 현재 삶에서 드러나는 방식
## 관계와 카르마
## 실천 처방

각 섹션은 2문단 이상, 추상적 위로보다 구체적 행동과 판단 기준을 포함하세요.
챕터 필수 항목: ${guideList[chapter - 1] || "핵심 요약, 관계 구조, 장점, 위험 요소, 실천 조언"}
반드시 포함: 핵심 요약 / 계산된 숙요 데이터 / 장점 / 위험 요소 / 반복 문제 / 실전 조언 / 대화법 / 개운법 / 최종 확언
분량: 최소 ${requiredMinChars}자 이상.`;
}

async function generateText(prompt: string, minChars: number) {
  try {
    const text = await callVertexGemini(prompt, { temperature: 0.82, maxOutputTokens: 12288 });
    if (text) return text;
  } catch {
    // Fallback below keeps PDF generation usable when AI credentials are unavailable.
  }

  const keys = rotateGeminiKeys(pickGeminiKeys(), prompt.length);
  if (!keys.length) return "";
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
  for (const model of models) {
    const endpoint = GEMINI_ENDPOINT.replace("{model}", encodeURIComponent(model));
    for (const key of keys) {
      try {
        const response = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.82, maxOutputTokens: 12288, topP: 0.95 },
          }),
          signal: AbortSignal.timeout(35_000),
        });
        if (!response.ok) continue;
        const payload = await response.json().catch(() => ({}));
        const text = parseGeminiText(payload);
        if (text) return text;
      } catch {
        // try next key/model
      }
    }
  }

  let draft = "";
  for (let i = 0; i < 2; i += 1) {
    if (draft.length >= minChars) break;
    const refinePrompt = [
      "아래 원고를 확장해 분량과 밀도를 보강하세요.",
      `목표 분량: 최소 ${minChars}자`,
      "단정형 문장을 피하고 상담형 문체를 유지하세요.",
      "기존 문단을 유지하되, 누락 항목(갈등 패턴/실전 대화법/개운 루틴)을 구체적으로 추가하세요.",
      "", "[원고]", draft || prompt,
    ].join("\n");
    try {
      const refined = await callVertexGemini(refinePrompt, { temperature: 0.8, maxOutputTokens: 12288 });
      if (refined && refined.trim()) {
        draft = refined.trim();
      }
    } catch {
      break;
    }
  }
  if (draft) return draft;
  return "";
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireRouteAuth(req);
    if (auth.ok === false) return auth.response;

    const body = await req.json();
    const accessBody = {
      ...(body as Record<string, unknown>),
      mode: "compatibility",
      reportMode: "compatibility",
      reportType: "compatibility",
    };
    const access = await requirePremiumRouteAccess(auth.userId, "sookyoPremium", accessBody);
    if (!access.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: access.code,
          message: access.message,
          reportType: access.reportType,
          ...("required" in access ? { required: access.required } : {}),
        },
        { status: access.status },
      );
    }

    const year = Number.isFinite(Number(body.year)) ? Number(body.year) : 1990;
    const month = Number.isFinite(Number(body.month)) ? Math.max(1, Math.min(12, Number(body.month))) : 1;
    const day = Number.isFinite(Number(body.day)) ? Math.max(1, Math.min(31, Number(body.day))) : 1;
    const hour = Number.isFinite(Number(body.hour)) ? Number(body.hour) : 12;
    const chapterRaw = Number(body.chapter ?? 1);
    const chapter = Number.isFinite(chapterRaw)
      ? Math.max(1, Math.min(COMPAT_CHAPTER_META.length, Math.floor(chapterRaw)))
      : 1;
    const reportMode: "compatibility" = "compatibility";

    const sukuyo = await calcSukuyo(req, year, month, day);
    if (!sukuyo) {
      return NextResponse.json(
        {
          ok: false,
          code: "SUKUYO_LUNAR_CONVERSION_FAILED",
          error: "KASI lunar conversion unavailable",
        },
        { status: 422 },
      );
    }
    const hasPartner = Number.isFinite(Number(body.partnerYear))
      && Number.isFinite(Number(body.partnerMonth))
      && Number.isFinite(Number(body.partnerDay));
    if (!hasPartner) {
      return NextResponse.json(
        {
          ok: false,
          code: "SUKUYO_COMPAT_PARTNER_REQUIRED",
          error: "Sukuyo premium compatibility report requires partner birth data",
        },
        { status: 422 },
      );
    }

    const partner = hasPartner
      ? await calcSukuyo(req, Number(body.partnerYear), Number(body.partnerMonth), Number(body.partnerDay))
      : null;
    if (hasPartner && !partner) {
      return NextResponse.json(
        {
          ok: false,
          code: "SUKUYO_PARTNER_LUNAR_CONVERSION_FAILED",
          error: "KASI partner lunar conversion unavailable",
        },
        { status: 422 },
      );
    }
    const rel = relation(sukuyo.mansionIdx, partner?.mansionIdx);
    const swissBasis = await fetchSwissSukuyoBasis(req, {
      year,
      month,
      day,
      hour,
      minute: Number(body.minute ?? 0),
      timezone: Number(body.timezone ?? 9),
      lat: Number(body.lat ?? 37.5665),
      lon: Number(body.lon ?? 126.978),
    });
    const partnerSwissBasis = hasPartner
      ? await fetchSwissSukuyoBasis(req, {
        year: Number(body.partnerYear),
        month: Number(body.partnerMonth),
        day: Number(body.partnerDay),
        hour: Number(body.partnerHour ?? 12),
        minute: Number(body.partnerMinute ?? 0),
        timezone: Number(body.partnerTimezone ?? body.timezone ?? 9),
        lat: Number(body.partnerLat ?? body.lat ?? 37.5665),
        lon: Number(body.partnerLon ?? body.lon ?? 126.978),
      })
      : null;
    const chart = buildSukuyoOrientalChart(sukuyo, partner, rel, swissBasis, partnerSwissBasis);
    const compatibilityScores = buildCompatibilityScores(sukuyo, partner, rel);
    const prompt = buildPrompt(chapter, sukuyo, reportMode, partner, chart, compatibilityScores);
    const minChars = reportMode === "compatibility" ? 5000 : 2800;
    const warnings: string[] = [];
    let usedFallback = false;
    let text = await generateText(prompt, minChars);
    if (!text) {
      usedFallback = true;
      warnings.push("AI text unavailable, fallback chapter text used");
      text = fallbackText(chapter, sukuyo, rel, reportMode);
    }

    if (text.length < minChars) {
      usedFallback = true;
      warnings.push(`Generated text below minimum length (${text.length}/${minChars}), fallback supplement appended`);
      text = `${text}\n\n${fallbackText(chapter, sukuyo, rel, reportMode)}`.trim();
    }

    const chapterMetaList = COMPAT_CHAPTER_META;

    return NextResponse.json({
      ok: true,
      reportMode,
      sukuyo,
      partner,
      relation: rel,
      compatibilityScores,
      chart,
      chapter,
      chapterMeta: chapterMetaList[chapter - 1],
      text,
      sections: parseSections(text),
      usedFallback,
      warnings,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/premium/sukuyo-life]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
