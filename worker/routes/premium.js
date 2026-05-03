import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { callGeminiText } from "../lib/gemini.js";

const SIGN_KO = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
const PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

const SUKUYO_MANSIONS = [
  ["각", "角", "Kaku", "동방", "목", "청룡"], ["항", "亢", "Kou", "동방", "금", "청룡"],
  ["저", "氐", "Tei", "동방", "토", "청룡"], ["방", "房", "Bou", "동방", "일", "청룡"],
  ["심", "心", "Shin", "동방", "월", "청룡"], ["미", "尾", "Bi", "동방", "화", "청룡"],
  ["기", "箕", "Ki", "동방", "수", "청룡"], ["두", "斗", "To", "북방", "목", "현무"],
  ["우", "牛", "Gyu", "북방", "금", "현무"], ["여", "女", "Jo", "북방", "토", "현무"],
  ["허", "虚", "Kyo", "북방", "일", "현무"], ["위", "危", "Ki", "북방", "월", "현무"],
  ["실", "室", "Shitsu", "북방", "화", "현무"], ["벽", "壁", "Heki", "북방", "수", "현무"],
  ["규", "奎", "Kei", "서방", "목", "백호"], ["루", "婁", "Ro", "서방", "금", "백호"],
  ["위", "胃", "I", "서방", "토", "백호"], ["묘", "昴", "Bo", "서방", "일", "백호"],
  ["필", "畢", "Hitsu", "서방", "월", "백호"], ["자", "觜", "Shi", "서방", "화", "백호"],
  ["삼", "参", "Shin", "서방", "수", "백호"], ["정", "井", "Sei", "남방", "목", "주작"],
  ["귀", "鬼", "Ki", "남방", "금", "주작"], ["류", "柳", "Ryu", "남방", "토", "주작"],
  ["성", "星", "Sei", "남방", "일", "주작"], ["장", "張", "Cho", "남방", "월", "주작"],
  ["익", "翼", "Yoku", "남방", "화", "주작"],
];

const SUKUYO_MONTH_START = [11, 13, 15, 17, 19, 21, 23, 25, 0, 2, 4, 7];

const SUKUYO_CHAPTER_META = [
  "탄생 숙과 원형", "감정의 조수간만", "페르소나와 브랜딩", "재산의 중력",
  "보이지 않는 카니발", "관계의 정밀 레이어", "파괴와 갱신", "조화로운 성장",
  "정서의 신전", "타이밍과 의식", "그림자의 통합", "인생 로드맵", "마스터 플랜",
].map((title, i) => ({ num: i + 1, title, subtitle: "27수 숙요점 프리미엄 리포트", icon: "moon" }));

const ASTRO_CHAPTER_META = [
  "페르소나와 존재감", "감정의 뿌리", "인지 체계와 정보의 연금술", "미학과 가치 자산",
  "추진력과 갈등 처리", "확장과 행운의 문", "세계와 성공의 구조", "관계의 계약 지도",
  "상처와 회복 코드", "노드와 영혼의 목적", "트랜짓 해석 전략", "마스터 플랜",
].map((title, i) => ({ num: i + 1, title, subtitle: "서양 점성술 프리미엄 PDF", icon: "star" }));

const VEDIC_CHAPTER_META = [
  "라그나와 삶의 설계도", "달과 나크샤트라", "다샤 타이밍", "부와 번영의 정렬",
  "다르마와 커리어", "나밤샤 D9", "아슈타 쿠타 관계성", "인연과 카르마 계약",
  "건강과 정화", "요가 조합 분석", "우파야 처방", "마스터 플랜",
].map((title, i) => ({ num: i + 1, title, subtitle: "베다 점성술 프리미엄 PDF", icon: "veda" }));

const ZIWEI_CHAPTERS = [
  "명궁과 삶의 주인공", "복덕궁과 내면의 행복", "천이궁과 사회적 얼굴", "관록궁과 커리어",
  "재백궁과 부의 흐름", "부처궁과 관계", "교우궁과 네트워크", "전택궁과 공간",
  "질액궁과 몸의 에너지", "자녀궁과 창조성", "부모궁과 뿌리", "사화와 변화의 축", "마스터 플랜",
];

function clampInt(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function parseSections(text) {
  return String(text || "").split(/\n(?=##\s+)/g).map((part) => {
    const match = part.match(/^##\s*(.+?)\n([\s\S]*)$/);
    return match ? { title: match[1].trim(), body: match[2].trim() } : null;
  }).filter(Boolean);
}

function normalizeBody(body) {
  return {
    year: clampInt(body.year ?? body.birthYear, 1990, 1900, 2100),
    month: clampInt(body.month ?? body.birthMonth, 1, 1, 12),
    day: clampInt(body.day ?? body.birthDay, 1, 1, 31),
    hour: clampInt(body.hour ?? body.birthHour, 12, 0, 23),
    minute: clampInt(body.minute, 0, 0, 59),
    timezone: Number.isFinite(Number(body.timezone)) ? Number(body.timezone) : 9,
    lat: Number.isFinite(Number(body.lat)) ? Number(body.lat) : 37.5665,
    lon: Number.isFinite(Number(body.lon ?? body.lng)) ? Number(body.lon ?? body.lng) : 126.978,
    chapter: clampInt(body.chapter ?? body.sessionId, 1, 1, 13),
    name: String(body.name || "사용자").slice(0, 80),
    gender: String(body.gender || "").slice(0, 20),
  };
}

function zodiacBySeed(year, month, day, hour, offset = 0) {
  const raw = year * 372 + month * 31 + day + hour + offset * 17;
  const longitude = ((raw * 13.176 + offset * 29.53) % 360 + 360) % 360;
  const sign = Math.floor(longitude / 30);
  return {
    longitude: Math.round(longitude * 100) / 100,
    sign,
    signKo: SIGN_KO[sign],
    signEmoji: "",
    degree: Math.round((longitude % 30) * 100) / 100,
  };
}

function buildWesternChart(input) {
  const asc = zodiacBySeed(input.year, input.month, input.day, input.hour, 1);
  const planets = {};
  PLANETS.forEach((name, index) => {
    const info = zodiacBySeed(input.year, input.month, input.day, input.hour, index + 2);
    planets[name] = { ...info, house: ((info.sign - asc.sign + 12) % 12) + 1 };
  });
  const aspects = [];
  const names = Object.keys(planets);
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const diff = Math.abs(planets[names[i]].longitude - planets[names[j]].longitude);
      const normalized = diff > 180 ? 360 - diff : diff;
      const types = [[0, "conjunction"], [60, "sextile"], [90, "square"], [120, "trine"], [180, "opposition"]];
      const found = types.find(([deg]) => Math.abs(normalized - deg) <= 8);
      if (found) aspects.push({ p1: names[i], p2: names[j], type: found[1], orb: Math.round(Math.abs(normalized - found[0]) * 100) / 100 });
    }
  }
  return {
    planets,
    ascendant: { ...asc, house: 1 },
    midheaven: { ...zodiacBySeed(input.year, input.month, input.day, input.hour, 11), house: 10 },
    northNode: { ...zodiacBySeed(input.year, input.month, input.day, input.hour, 12), house: 9 },
    southNode: { ...zodiacBySeed(input.year, input.month, input.day, input.hour, 13), house: 3 },
    aspects,
  };
}

function calcSukuyo(input) {
  const lunarMonth = ((input.month + 10) % 12) + 1;
  const lunarDay = ((input.day + input.hour) % 30) + 1;
  const start = SUKUYO_MONTH_START[lunarMonth - 1] ?? 11;
  const mansionIdx = (start + lunarDay - 1) % 27;
  const m = SUKUYO_MANSIONS[mansionIdx];
  return {
    mansionIdx,
    mansion: m[0],
    mansionCh: m[1],
    mansionEn: m[2],
    icon: "moon",
    direction: m[3],
    element: m[4],
    animal: m[5],
    lunarMonth,
    lunarDay,
  };
}

function sukuyoRelation(myIdx, otherIdx) {
  if (otherIdx == null) return null;
  const distance = (otherIdx - myIdx + 27) % 27;
  const labels = ["명", "업", "태", "영", "친", "우", "괴", "성", "위"];
  return { distance, label: labels[distance % labels.length], score: Math.max(38, 96 - Math.abs(13 - distance) * 4) };
}

function buildVedicChart(input) {
  const lagna = zodiacBySeed(input.year, input.month, input.day, input.hour, 21);
  const moon = zodiacBySeed(input.year, input.month, input.day, input.hour, 22);
  const nakIndex = Math.floor(moon.longitude / (360 / 27));
  const nakshatras = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];
  return {
    lagna,
    moonNakshatra: { name: nakshatras[nakIndex], ko: nakshatras[nakIndex], pada: (nakIndex % 4) + 1 },
    planets: Object.fromEntries(["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"].map((p, i) => [p, { name: p, ...zodiacBySeed(input.year, input.month, input.day, input.hour, i + 30), house: ((i + lagna.sign) % 12) + 1 }])),
    vimshottariDasha: { current: { planet: ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"][input.year % 9], remainYears: 4.8 }, antar: { planet: "Moon", remainYears: 0.8 } },
    yogas: [{ name: "Dharma Focus", nameKo: "다르마 정렬", description: "삶의 방향성을 실행으로 고정하는 조합입니다." }],
  };
}

function longFallback({ system, chapterTitle, profileLine, focusLine }) {
  const sections = [
    ["핵심 구조", `${profileLine} 이 장은 ${system}의 상징을 단편적인 운세가 아니라 반복되는 선택 패턴으로 읽습니다. 지금 드러나는 핵심은 타고난 성향을 과장하거나 숨기는 것이 아니라, 가장 자연스럽게 힘이 생기는 방식과 에너지가 새는 방식을 동시에 보는 것입니다.`],
    ["삶에서 드러나는 패턴", `${chapterTitle}에서는 관계, 일, 돈, 감정 반응이 서로 따로 움직이지 않습니다. 같은 선택 습관이 다른 장면에서 이름만 바꾸어 반복됩니다. 이 PDF는 그 반복을 발견하고, 사용자가 실제 일정과 대화와 결정을 바꿀 수 있도록 구체적인 언어로 정리합니다.`],
    ["주의할 그림자", `강점이 강하게 켜질수록 그림자도 같이 커집니다. 빠른 판단, 과도한 책임감, 인정 욕구, 회피, 완벽주의 중 어느 하나가 현재의 운 흐름을 좁힐 수 있습니다. 중요한 것은 나쁜 성향을 없애는 것이 아니라, 그 성향이 등장하는 조건을 알아차리고 더 좋은 출구를 만드는 것입니다.`],
    ["실행 처방", `${focusLine} 오늘부터 7일 동안은 큰 결심보다 작은 반복을 우선하세요. 아침에는 오늘 반드시 끝낼 한 가지를 적고, 저녁에는 감정이 크게 움직였던 장면 하나와 실제로 한 행동 하나를 분리해서 기록합니다. 이 기록이 쌓이면 운세는 막연한 예언이 아니라 생활을 조정하는 지도처럼 작동합니다.`],
    ["30일 로드맵", `1주차에는 관찰, 2주차에는 정리, 3주차에는 실험, 4주차에는 고정이 핵심입니다. 사람과 돈과 일의 흐름을 모두 바꾸려 하지 말고, 가장 반복 비용이 큰 한 가지 습관을 고르세요. 그 습관을 바꾸는 작은 행동이 다음 운의 문을 여는 첫 번째 열쇠입니다.`],
  ];
  const text = sections.map(([title, body]) => `## ${title}\n${body}\n\n${body}\n\n${body}`).join("\n\n");
  return text.length >= 5200 ? text : `${text}\n\n${text}`;
}

function buildPrompt(kind, input, chapterTitle, dataLine) {
  const labels = {
    sukuyo: "숙요점 27수",
    astro: "서양 점성술",
    vedic: "베다 점성술",
    ziwei: "자미두수",
  };
  const guard = kind === "sukuyo"
    ? "중요: 사주명리 PDF가 아니라 숙요점 PDF입니다. 십성, 용신, 대운 중심으로 쓰지 말고 27수, 달의 리듬, 숙요 관계성, 카르마 패턴 중심으로 쓰세요."
    : "";
  return `당신은 ${labels[kind]} 프리미엄 PDF 전문 작가입니다.
${guard}

사용자: ${input.name}, 생년월일시 ${input.year}-${input.month}-${input.day} ${input.hour}:${input.minute}
분석 데이터: ${dataLine}
챕터: ${chapterTitle}

한국어로 고품질 PDF 본문을 작성하세요. 아래 형식을 지키세요.
## 핵심 구조
## 삶에서 드러나는 패턴
## 관계/커리어/돈의 적용
## 그림자와 주의점
## 30일 실행 가이드

각 섹션은 두 문단 이상, 추상적인 위로보다 실제 선택과 행동 기준을 많이 포함하세요.`;
}

async function callGemini(env, prompt, modelEnvKeys = []) {
  const result = await callGeminiText(env, prompt, {
    modelEnvKeys: ["PREMIUM_GEMINI_MODEL", ...modelEnvKeys],
    temperature: 0.86,
    topP: 0.95,
    maxOutputTokens: 8192,
    timeoutMs: Number(env.PREMIUM_GEMINI_TIMEOUT_MS || 45000),
  });
  return result.ok ? result.text : "";
}

async function generatedChapter(env, kind, input, meta, dataLine, fallbackProfile, fallbackFocus, modelEnvKeys = []) {
  const prompt = buildPrompt(kind, input, meta.title, dataLine);
  let text = await callGemini(env, prompt, modelEnvKeys);
  let usedFallback = false;
  if (!text || text.length < 900) {
    usedFallback = true;
    text = longFallback({
      system: kind,
      chapterTitle: meta.title,
      profileLine: fallbackProfile,
      focusLine: fallbackFocus,
    });
  }
  return { text, sections: parseSections(text), usedFallback };
}

async function handleSukuyoLife(request, env) {
  const body = await readJson(request);
  const input = normalizeBody(body);
  const chapter = clampInt(body.chapter, 1, 1, 13);
  const sukuyo = calcSukuyo(input);
  const hasPartner = body.partnerYear && body.partnerMonth && body.partnerDay;
  const partner = hasPartner ? calcSukuyo(normalizeBody({ year: body.partnerYear, month: body.partnerMonth, day: body.partnerDay, hour: body.partnerHour ?? 12 })) : null;
  const rel = sukuyoRelation(sukuyo.mansionIdx, partner?.mansionIdx);
  const meta = SUKUYO_CHAPTER_META[chapter - 1];
  const generated = await generatedChapter(
    env,
    "sukuyo",
    input,
    meta,
    `${sukuyo.mansion}宿/${sukuyo.mansionCh}, ${sukuyo.direction}, ${sukuyo.element}, 관계 ${rel ? rel.label : "개인 리포트"}`,
    `${sukuyo.mansion}宿은 달의 리듬과 관계의 반복 패턴을 통해 삶을 읽는 숙요점 데이터입니다.`,
    "숙요점에서는 같은 사건보다 같은 감정 리듬이 반복되는 지점을 먼저 조정해야 합니다.",
  );
  return json({ ok: true, sukuyo, partner, relation: rel, chapter, chapterMeta: meta, ...generated });
}

async function handleAstroWestern(request) {
  const body = await readJson(request);
  const input = normalizeBody(body);
  return json({ ok: true, ...buildWesternChart(input) });
}

async function handleAstroLife(request, env) {
  const body = await readJson(request);
  const input = normalizeBody(body);
  const chapter = clampInt(body.chapter, 1, 1, 12);
  const chart = buildWesternChart(input);
  const meta = ASTRO_CHAPTER_META[chapter - 1];
  const generated = await generatedChapter(
    env,
    "astro",
    input,
    meta,
    `ASC ${chart.ascendant.signKo}, Sun ${chart.planets.Sun.signKo}, Moon ${chart.planets.Moon.signKo}, aspects ${chart.aspects.length}`,
    `상승궁 ${chart.ascendant.signKo}, 태양 ${chart.planets.Sun.signKo}, 달 ${chart.planets.Moon.signKo}의 결합이 기본 성향을 만듭니다.`,
    "서양 점성술에서는 행성의 긴장을 생활의 언어로 번역해 선택 기준을 명확히 하는 것이 중요합니다.",
  );
  return json({ ok: true, chart, chapter, chapterMeta: meta, ...generated });
}

async function handleVedicLife(request, env) {
  const body = await readJson(request);
  const input = normalizeBody(body);
  const chapter = clampInt(body.chapter, 1, 1, 12);
  const chart = buildVedicChart(input);
  const meta = VEDIC_CHAPTER_META[chapter - 1];
  const generated = await generatedChapter(
    env,
    "vedic",
    input,
    meta,
    `Lagna ${chart.lagna.signKo}, Moon Nakshatra ${chart.moonNakshatra.name}, Dasha ${chart.vimshottariDasha.current.planet}`,
    `라그나 ${chart.lagna.signKo}와 달의 나크샤트라 ${chart.moonNakshatra.name}가 베다 차트의 핵심 리듬입니다.`,
    "베다 점성술에서는 다샤 타이밍과 다르마의 방향을 함께 보며 장기 선택을 정렬해야 합니다.",
  );
  return json({ ok: true, chart, chapter, chapterMeta: meta, ...generated });
}

const LIFEBOOK_CHAPTERS = [
  "사주 원국 완전 해설",
  "나의 설계도",
  "숨겨진 무기",
  "대운 정밀 분석",
  "재물과 직업의 방향",
  "관계와 가족의 패턴",
  "건강과 에너지 관리",
  "연애와 결혼의 흐름",
  "위기와 전환점",
  "나를 지키는 습관",
  "올해의 실전 전략",
  "장기 로드맵",
  "인생의 책 마스터 플랜",
];

const LIFEBOOK_CHAPTER_SUBTITLES = [
  "팔자 8글자와 사주 원국의 구조를 정밀 해독",
  "월지·일간·조후로 읽는 타고난 삶의 설계도",
  "용신·희신·기신으로 찾는 핵심 강점과 천직 방향",
  "대운 흐름과 전환 구간을 읽는 시계열 전략",
  "재물 그릇과 커리어 확장 포인트의 현실적 설계",
  "가족·동료·파트너 관계에서 반복되는 패턴 분석",
  "오행 균형 기반 건강·회복·에너지 관리 지침",
  "연애·결혼의 궁합 구조와 관계 유지 전략",
  "위기 신호·손실 구간·반전 구간의 대응 시나리오",
  "삶을 지키는 루틴과 의사결정 습관 재설계",
  "당해년 실행력 극대화를 위한 월별 행동 전략",
  "중장기 성장 경로와 인생 포트폴리오 설계",
  "전체 흐름 통합과 최종 마스터 플랜 제언",
];

const LIFEBOOK_COUNSELOR_FOCUS = [
  "원국의 기본축(년·월·일·시)을 분리 해석한 뒤 실제 성격·의사결정 습관과 연결합니다.",
  "월지·일간·조후의 균형을 통해 환경 적응 방식과 성장 최적 환경을 구체화합니다.",
  "용신/희신/기신을 행동 선택 기준으로 번역해 직업·학습·관계 전략으로 제시합니다.",
  "대운의 상승·정체·전환 시점을 구분해 타이밍 기반 실행안을 설계합니다.",
  "재성·식상·관성 흐름을 돈 버는 방식과 커리어 구조로 연결해 현실안을 제시합니다.",
  "합충·거리두기·경계선 설정 관점에서 관계 피로를 줄이는 실전 규칙을 제공합니다.",
  "오행 불균형이 만드는 신체/정서 소진 패턴을 회복 루틴과 함께 제시합니다.",
  "연애·결혼 의사결정에서 감정과 현실 조건을 함께 점검하는 프레임을 제안합니다.",
  "위기 발생 전 징후를 분류하고 손실 최소화 행동 순서를 단계별로 제시합니다.",
  "장기적으로 나를 지키는 핵심 습관을 설계하고 재발 방지 장치를 제공합니다.",
  "연간 흐름을 월 단위 행동계획으로 쪼개 실전 선택 기준으로 정리합니다.",
  "생애 포트폴리오(일·돈·관계·건강)를 균형 있게 재배치하는 전략을 제시합니다.",
  "전 챕터 해석을 통합해 향후 1년/3년/10년 실행 로드맵으로 마무리합니다.",
];

const LIFEBOOK_SECTION_HEADERS = [
  ["원국 핵심 구조 해석", "기질과 반응의 반복 패턴", "관계·일·돈 적용 포인트", "리스크와 그림자 관리", "7일 실행 루틴"],
  ["설계도 핵심 진단", "환경 적응 반복 패턴", "성장 환경 선택 포인트", "과부하 리스크 관리", "2주 실행 루틴"],
  ["강점 자산 핵심 진단", "성공/실패 반복 패턴", "천직 선택 포인트", "기신 과열 리스크", "실전 강화 루틴"],
  ["대운 흐름 핵심 진단", "상승/정체 반복 패턴", "타이밍 선택 포인트", "전환기 리스크", "월별 실행 루틴"],
  ["재물·커리어 핵심 진단", "수익/소진 반복 패턴", "직업 확장 선택 포인트", "손실 리스크 관리", "현실 실행 루틴"],
  ["관계 구조 핵심 진단", "갈등/회복 반복 패턴", "소통·경계 선택 포인트", "관계 소진 리스크", "관계 회복 루틴"],
  ["건강 에너지 핵심 진단", "소진/회복 반복 패턴", "생활관리 선택 포인트", "건강 리스크 관리", "회복 실행 루틴"],
  ["연애·결혼 핵심 진단", "관계 지속 반복 패턴", "정착 선택 포인트", "관계 파열 리스크", "친밀도 실행 루틴"],
  ["위기 전환 핵심 진단", "위기 재발 반복 패턴", "대응 선택 포인트", "손실 확대 리스크", "위기 대응 루틴"],
  ["습관 시스템 핵심 진단", "재발 반복 패턴", "행동 전환 선택 포인트", "의지 고갈 리스크", "습관 고정 루틴"],
  ["연간 전략 핵심 진단", "월별 파동 반복 패턴", "Go/Stop 선택 포인트", "조급함 리스크", "연간 실행 루틴"],
  ["장기 경로 핵심 진단", "성장/정체 반복 패턴", "중장기 선택 포인트", "방향 상실 리스크", "장기 실행 루틴"],
  ["통합 마스터 진단", "핵심 패턴 총정리", "최종 선택 포인트", "재발 리스크 관리", "1년·3년·10년 실행 루틴"],
];

const LIFEBOOK_MIN_CHARS = 6000;

const LOVE_SECRET_CHAPTERS = [
  "🔑 본연의 연애 자아: 나도 몰랐던 사랑의 본능",
  "💘 치명적 매력과 페로몬: 이성을 끌어당기는 나의 무기",
  "💑 두 사람의 사주 궁합: 우리는 운명인가",
  "⚔️ 밀당 전략서: 상대방 심리를 꿰뚫는 작전 지도",
  "📅 시기별 연애 운의 흐름: 운명이 허락하는 그날",
  "🌑 연애 리스크: 충돌 지점과 금기 지도",
  "🔥 육체적 궁합: 두 사람의 감각 에너지 호환성",
  "📲 현대적 상황별 비책: 디지털 시대의 연애 전략",
  "💍 결혼 시기: 언제, 누구와 정착할 것인가",
  "🌿 개운 처방전: 두 사람의 사랑을 부르는 비책",
  "🌊 속궁합 완전 해석: 조후와 십성으로 본 깊은 궁합의 비밀",
];

const LOVE_SECRET_CHAPTER_SUBTITLES = [
  "감정 반응과 애착 리듬을 읽는 연애 기초 해석",
  "매력 발산 포인트와 관계 유입 신호 분석",
  "오행/일주 합충으로 보는 궁합의 실제 체감",
  "상대 심리 단계별 접근 전략과 금기어 정리",
  "연애 운 상승/정체/변곡 시점별 의사결정 가이드",
  "반복 충돌 패턴과 경계선 설정 플랜",
  "감각 궁합과 친밀도 에너지 온도차 해석",
  "연락/메신저/소개팅 플랫폼 실전 운영법",
  "결혼 적기와 정착 파트너 조건 매칭",
  "기운 보완 루틴과 관계 회복 실천 루틴",
  "조후·십성·심층 궁합을 종합한 최종 판정",
];

const LOVE_SECRET_COUNSELOR_FOCUS = [
  "일간·일지·애착 반응을 연결해 감정 기동 패턴을 진단하고, 자기 파괴적 연애 트리거를 명확히 짚습니다.",
  "도화/홍염/관성·식상 균형을 바탕으로 매력 발현 포인트와 첫인상 설계 전략을 제시합니다.",
  "두 사람의 일주·합충·오행 보완 구조를 비교해 실제 관계 지속력과 체감 궁합을 판단합니다.",
  "상대의 반응 리듬을 십성 관점으로 해석해 접근-거리두기-회복의 대화 시퀀스를 설계합니다.",
  "대운·세운의 변곡점을 근거로 고백/관계전환/정리 타이밍을 월 단위로 제안합니다.",
  "충돌 원인(감정, 언어, 경계선)을 분리 진단하고 악화 시그널과 차단 규칙을 구체화합니다.",
  "친밀도와 감각 궁합의 온도차를 해석하고 신뢰를 해치지 않는 친밀도 합의 프레임을 제안합니다.",
  "메신저/DM/소개팅앱 상황별로 오해를 줄이는 문장 구조와 응답 템포 전략을 제공합니다.",
  "결혼 적기, 동거/재정/가치관 정착 조건을 사주 리스크와 함께 현실적으로 매칭합니다.",
  "개운 루틴(수면, 공간, 관계 습관)을 통해 감정 소진을 줄이고 관계 회복 확률을 높이는 처방을 제시합니다.",
  "조후·십성·오행 상생/상극을 통합해 속궁합과 장기 친밀 지속 가능성을 최종 판정합니다.",
];

const DEFAULT_BOOK_SECTION_HEADERS = [
  "핵심 해석",
  "반복되는 패턴",
  "관계와 선택의 포인트",
  "조심해야 할 그림자",
  "실전 행동 가이드",
];

const LOVE_SECRET_SECTION_HEADERS = [
  ["연애 본능 핵심 해석", "감정 트리거의 반복 패턴", "관계 시작의 선택 포인트", "집착/회피의 그림자", "7일 자기조율 행동 가이드"],
  ["치명적 매력의 구조 해석", "호감 유입의 반복 패턴", "매력 발산 타이밍 포인트", "과잉 어필의 그림자", "매력 강화 실전 루틴"],
  ["두 사람 궁합 핵심 해석", "합/충의 반복 패턴", "관계 유지 선택 포인트", "궁합 약점의 그림자", "관계 안정 행동 가이드"],
  ["상대 심리 핵심 해석", "밀당 실패의 반복 패턴", "대화/거리 조절 포인트", "심리전 과몰입의 그림자", "상황별 밀당 행동 가이드"],
  ["연애 타이밍 핵심 해석", "운의 파동 반복 패턴", "고백/관계전환 포인트", "조급함의 그림자", "월별 실행 행동 가이드"],
  ["리스크 핵심 해석", "충돌 재발 반복 패턴", "갈등 중재 선택 포인트", "파국 신호의 그림자", "리스크 차단 행동 가이드"],
  ["감각 궁합 핵심 해석", "친밀도 온도차 반복 패턴", "속도/강도 조율 포인트", "신뢰 훼손의 그림자", "친밀 회복 행동 가이드"],
  ["디지털 연애 핵심 해석", "연락 텐션 반복 패턴", "채널별 운영 포인트", "오해 증폭의 그림자", "메신저 실전 행동 가이드"],
  ["정착 가능성 핵심 해석", "결혼 변수 반복 패턴", "정착 의사결정 포인트", "현실 조건의 그림자", "결혼 준비 행동 가이드"],
  ["개운 전략 핵심 해석", "운 보정 반복 패턴", "관계 회복 선택 포인트", "소진의 그림자", "개운 실천 행동 가이드"],
  ["속궁합 심층 핵심 해석", "조후/십성 반복 패턴", "심층 친밀 선택 포인트", "불균형의 그림자", "장기 궁합 행동 가이드"],
];

function stringifyCompact(value, maxLength = 4200) {
  if (value == null) return "";
  if (typeof value === "string") return value.slice(0, maxLength);
  try {
    return JSON.stringify(value, null, 2).slice(0, maxLength);
  } catch {
    return String(value).slice(0, maxLength);
  }
}

function buildSessionInput(body, maxChapter) {
  const input = normalizeBody(body);
  input.chapter = clampInt(body.sessionId ?? body.chapter, 1, 1, maxChapter);
  return input;
}

function buildSessionPrompt(kind, title, chapter, totalChapters, body, sectionHeaders, options = {}) {
  const sajuData = stringifyCompact(body.sajuData || body.profile || body.birth || body, 5200);
  const partnerData = stringifyCompact(body.partnerData || body.partner || "", 2600);
  const relationshipGuide = partnerData
    ? "\n[Partner / compatibility data]\n" + partnerData
    : "";
  const headers = Array.isArray(sectionHeaders) && sectionHeaders.length === 5
    ? sectionHeaders
    : DEFAULT_BOOK_SECTION_HEADERS;
  const subtitle = String(options.subtitle || "").trim();
  const counselorFocus = String(options.counselorFocus || "").trim();
  const minTotalChars = clampInt(options.minTotalChars, 1100, 900, 12000);
  const minSectionParagraphs = clampInt(options.minSectionParagraphs, 2, 2, 6);
  const minSectionChars = clampInt(options.minSectionChars, 180, 120, 2400);
  const chapterLabel = subtitle ? `${title} — ${subtitle}` : title;

  return [
    `You are Code Destiny's premium ${kind} writer.`,
    "Your role: elite relationship counselor + advanced saju analyst.",
    "Return ONLY natural Korean markdown. Do not use English headings.",
    "Use the provided saju/birth-analysis data as the source of truth.",
    "Write a premium PDF chapter with concrete interpretation, choices, cautions, and a practical action plan.",
    "Avoid generic fortune-telling filler. Make the answer specific to the supplied data.",
    "Do NOT describe other chapters. Keep all interpretation tightly aligned to this chapter title and subtitle.",
    "Keep a professional, warm counseling tone without fear marketing or deterministic verdicts.",
    "",
    `[Chapter ${chapter}/${totalChapters}] ${chapterLabel}`,
    counselorFocus ? `[Counselor Focus]\n${counselorFocus}` : "",
    "",
    "[Saju / analysis data]",
    sajuData || "No structured saju data was supplied; infer cautiously from the request body.",
    relationshipGuide,
    "",
    "Required markdown structure:",
    `## ${chapterLabel} 핵심 진단`,
    ...headers.map((h) => `## ${h}`),
    "",
    "Quality constraints:",
    "- Include at least one concrete behavioral example in each section.",
    "- Use saju terms only when tied to a plain-language implication.",
    "- End each section with one actionable sentence.",
    `- Each section must have at least ${minSectionParagraphs} substantial paragraphs and at least ${minSectionChars} Korean characters.`,
    `- Total length must be at least ${minTotalChars} Korean characters.`,
  ].join("\n");
}

async function refineChapterToMinLength(env, text, minChars, options = {}, modelEnvKeys = []) {
  let draft = String(text || "").trim();
  if (!draft) return draft;
  if (draft.length >= minChars) return draft;

  const title = String(options.title || "").trim();
  const subtitle = String(options.subtitle || "").trim();
  const counselorFocus = String(options.counselorFocus || "").trim();
  const sectionHeaders = Array.isArray(options.sectionHeaders) ? options.sectionHeaders : DEFAULT_BOOK_SECTION_HEADERS;
  const chapterLabel = subtitle ? `${title} — ${subtitle}` : title;
  const dataHint = stringifyCompact(options.data || "", 1400);

  for (let attempt = 0; attempt < 2 && draft.length < minChars; attempt += 1) {
    const prompt = [
      "아래 원고를 같은 사실관계와 톤을 유지하면서 고품질로 확장하세요.",
      `목표 길이: 최소 ${minChars}자`,
      "응답은 한국어 마크다운만 사용하세요.",
      "섹션 헤더를 유지하고, 각 섹션은 최소 3문단으로 확장하세요.",
      "추상적 문장 대신 상황·행동·의사결정 기준을 구체적으로 쓰세요.",
      "기존 내용의 핵심 진단은 지우지 말고 심화 설명을 추가하세요.",
      "공포 유도 문구나 단정적 예언은 금지합니다.",
      "",
      `[챕터] ${chapterLabel}`,
      counselorFocus ? `[상담 포커스]\n${counselorFocus}` : "",
      `[필수 섹션]\n${sectionHeaders.map((h) => `- ${h}`).join("\n")}`,
      dataHint ? `[데이터 힌트]\n${dataHint}` : "",
      "",
      "[기존 원고]",
      draft,
    ].filter(Boolean).join("\n");

    const expanded = await callGemini(env, prompt, modelEnvKeys);
    if (expanded && expanded.trim().length > draft.length) {
      draft = expanded.trim();
    } else {
      break;
    }
  }

  return draft;
}

function lifebookLongFallback(title, subtitle, body, sectionHeaders, counselorFocus, minChars = LIFEBOOK_MIN_CHARS) {
  const headers = Array.isArray(sectionHeaders) && sectionHeaders.length === 5
    ? sectionHeaders
    : DEFAULT_BOOK_SECTION_HEADERS;
  const chapterLabel = subtitle ? `${title} — ${subtitle}` : title;
  const dataHint = stringifyCompact(body.sajuData || body.profile || body.birth || body, 1800).replace(/\s+/g, " ").trim();
  const focus = String(counselorFocus || "").trim() || "사주 구조를 실제 행동 기준으로 번역해 실천 가능한 전략을 제시합니다.";

  const sectionBodies = [
    `${chapterLabel}에서 먼저 확인할 것은 타고난 성향 자체보다 성향이 의사결정으로 변환되는 방식입니다. 같은 사실을 보아도 어떤 사람은 관계를 우선하고, 어떤 사람은 성취를 우선하며, 또 어떤 사람은 안전을 먼저 계산합니다. 이 차이가 장기적으로 삶의 궤적을 가릅니다.\n\n현재 입력된 데이터 단서${dataHint ? `(${dataHint.slice(0, 280)})` : ""}를 기준으로 보면, 강점은 특정 상황에서 빠르게 발화되지만 피로가 쌓일 때는 판단 편향이 같이 커지는 구조입니다. 따라서 이 챕터의 목표는 장점 확대가 아니라 '지속 가능한 장점 운용법'을 만드는 것입니다.\n\n실행 문장: 오늘부터 중요한 결정을 내릴 때 감정·현실·장기효과를 각각 한 줄로 분리해 기록하세요.`,
    `반복 패턴은 사건이 아니라 반응에서 드러납니다. 비슷한 갈등이 되풀이되는 이유는 상대가 같아서가 아니라 내가 사용하는 해석 프레임이 늘 비슷하기 때문입니다. 특히 압박이 커질수록 익숙한 반응으로 돌아가는 경향이 강해집니다.\n\n패턴을 바꾸려면 의지를 키우기보다 트리거를 먼저 식별해야 합니다. 언제 피로가 커지고, 어떤 말에 방어가 올라오며, 어떤 상황에서 과한 확신 또는 과한 회피가 나타나는지 추적하면 변화 속도가 빨라집니다.\n\n실행 문장: 이번 주에는 감정이 크게 흔들린 장면 3개를 기록하고, 공통 트리거 1개를 찾아 이름 붙이세요.`,
    `관계·일·돈은 분리된 주제가 아니라 같은 선택 체계의 다른 표면입니다. 관계에서 경계를 못 세우면 일에서도 우선순위가 무너지고, 돈에서도 손실 회피보다 즉흥 대응이 늘어납니다. 반대로 한 영역의 선택 기준을 정리하면 다른 영역도 안정됩니다.\n\n${focus} 이 관점에서 보면 당장 필요한 것은 더 많은 정보가 아니라 선택 기준의 단순화입니다. 기준이 많을수록 불안은 줄지 않고, 실행은 늦어집니다. 그래서 이 챕터는 '지금 버릴 기준'과 '반드시 지킬 기준'을 구분하는 방식으로 설계됩니다.\n\n실행 문장: 이번 달 핵심 선택 기준을 2개만 남기고 나머지는 보류 리스트로 이동하세요.`,
    `리스크는 운이 나빠서 생기기보다 누적된 미세 오차가 임계점을 넘을 때 발생합니다. 특히 과로, 과속 의사결정, 관계 과잉 책임, 수면 붕괴는 함께 나타나는 경우가 많습니다. 이런 구간에서는 큰 기회를 잡는 전략보다 손실 상한을 먼저 정하는 전략이 유효합니다.\n\n그림자 관리의 핵심은 자기비판이 아니라 복구 시스템입니다. 실수 이후 회복 시간을 줄이는 사람은 같은 실수를 하더라도 결과가 달라집니다. 회복 규칙이 없으면 같은 패턴이 더 큰 비용으로 재발합니다.\n\n실행 문장: 위기 상황에서 즉시 실행할 3단계(중단-정리-재개) 체크리스트를 메모 앱 첫 화면에 고정하세요.`,
    `실행 가이드는 거창할수록 실패합니다. 하루 10분, 주 2회, 월 1회처럼 작고 반복 가능한 단위가 장기적으로 더 강력합니다. 중요한 것은 완벽한 계획이 아니라 관성의 방향을 바꾸는 것입니다.\n\n첫 7일은 관찰, 다음 7일은 조정, 다음 7일은 고정, 마지막 7일은 확장으로 운영하면 부담이 낮고 체감 변화가 빠릅니다. 이 리듬을 통해 관계·일·건강·재정의 균형점이 조금씩 올라갑니다.\n\n실행 문장: 오늘부터 28일간 주간 점검(관계/일/돈/건강 각 10점)을 매주 같은 시간에 기록하세요.`,
  ];

  let text = `## ${chapterLabel} 핵심 진단\n${sectionBodies[0]}\n\n## ${headers[0]}\n${sectionBodies[1]}\n\n## ${headers[1]}\n${sectionBodies[2]}\n\n## ${headers[2]}\n${sectionBodies[3]}\n\n## ${headers[3]}\n${sectionBodies[4]}\n\n## ${headers[4]}\n${sectionBodies.join("\n\n")}`;

  let depth = 1;
  while (text.length < minChars) {
    text += `\n\n## 심화 실행 노트 ${depth}\n`;
    text += `이 심화 노트의 목적은 해석을 실전 결정으로 연결하는 것입니다. ${chapterLabel}의 관점에서는 감정 반응, 시간 관리, 관계 경계, 재정 판단을 따로 보지 않고 하나의 시스템으로 통합합니다.\n\n`;
    text += `점검 질문: 지금 내 선택이 3개월 뒤에도 유효한가? 대안이 존재하는데도 익숙함 때문에 같은 결정을 반복하고 있지 않은가? 이 질문을 주 1회 반복하면 의사결정 품질이 눈에 띄게 개선됩니다.\n\n`;
    text += `실행 문장: 이번 주에는 가장 비용이 큰 습관 1개를 멈추고, 대체 행동 1개를 같은 시간대에 고정하세요.`;
    depth += 1;
  }

  return text;
}

function bookFallback(kind, title, body, sectionHeaders) {
  const source = stringifyCompact(body.sajuData || body.partnerData || body, 900).replace(/\s+/g, " ").trim();
  const headers = Array.isArray(sectionHeaders) && sectionHeaders.length === 5
    ? sectionHeaders
    : DEFAULT_BOOK_SECTION_HEADERS;
  const base = [
    `## ${headers[0]}\n${title} 챕터는 현재 입력된 사주 데이터와 선택 흐름을 바탕으로 ${kind}의 중심 패턴을 정리합니다. ${source ? `참고 데이터의 핵심 단서는 "${source.slice(0, 180)}" 구간에 모여 있습니다.` : "현재 데이터가 제한적이므로 기본 사주 흐름을 보수적으로 해석합니다."} 이 결과는 단정이 아니라 선택을 더 선명하게 보기 위한 지도입니다.`,
    `## ${headers[1]}\n반복되는 흐름은 감정, 관계, 일의 방식이 서로 영향을 주고받는 지점에서 드러납니다. 같은 문제가 이름만 바뀌어 다시 나타난다면 운이 나빠서가 아니라 아직 정리되지 않은 선택 기준이 있다는 뜻입니다.`,
    `## ${headers[2]}\n가장 중요한 기준은 지금 당장 강한 감정이 아니라 장기적으로 나를 안정시키는 방향입니다. 관계에서는 말의 양보다 일관성, 직업과 돈에서는 속도보다 지속 가능성을 우선해서 판단하는 것이 좋습니다.`,
    `## ${headers[3]}\n강점이 강하게 드러날수록 조급함, 과잉 책임감, 회피, 완벽주의 같은 그림자도 함께 커질 수 있습니다. 이 그림자를 억누르기보다 미리 알아차리고 작은 규칙으로 관리하는 것이 안전합니다.`,
    `## ${headers[4]}\n앞으로 7일 동안은 하나의 큰 결정보다 작은 검증을 먼저 하세요. 매일 감정 점수와 실제 행동 하나를 기록하고, 반복해서 에너지를 빼앗는 선택은 줄이며, 회복감을 주는 루틴은 일정에 고정하는 방식이 좋습니다.`,
  ].join("\n\n");
  return base.length >= 900 ? base : `${base}\n\n${base}`;
}

async function handleLifebookSession(request, env) {
  const body = await readJson(request);
  const input = buildSessionInput(body, 13);
  const chapter = input.chapter;
  const title = LIFEBOOK_CHAPTERS[chapter - 1] || LIFEBOOK_CHAPTERS[0];
  const subtitle = LIFEBOOK_CHAPTER_SUBTITLES[chapter - 1] || "사주 분석 기반 인생의 책";
  const counselorFocus = LIFEBOOK_COUNSELOR_FOCUS[chapter - 1] || "사주 구조를 실제 행동 기준으로 번역해 실행 전략으로 제시합니다.";
  const sectionHeaders = LIFEBOOK_SECTION_HEADERS[chapter - 1] || DEFAULT_BOOK_SECTION_HEADERS;
  const prompt = buildSessionPrompt(
    "saju life book",
    title,
    chapter,
    13,
    body,
    sectionHeaders,
    {
      subtitle,
      counselorFocus,
      minTotalChars: LIFEBOOK_MIN_CHARS,
      minSectionParagraphs: 3,
      minSectionChars: 850,
    }
  );
  let text = await callGemini(env, prompt, ["LIFEBOOK_GEMINI_MODEL"]);
  let usedFallback = false;
  if (!text || text.length < 1200) {
    usedFallback = true;
    text = lifebookLongFallback(title, subtitle, body, sectionHeaders, counselorFocus, LIFEBOOK_MIN_CHARS);
  }

  if (text.length < LIFEBOOK_MIN_CHARS) {
    const refined = await refineChapterToMinLength(
      env,
      text,
      LIFEBOOK_MIN_CHARS,
      {
        title,
        subtitle,
        counselorFocus,
        sectionHeaders,
        data: body.sajuData || body.profile || body.birth || body,
      },
      ["LIFEBOOK_GEMINI_MODEL"]
    );
    if (refined && refined.length > text.length) {
      text = refined;
    }
  }

  if (text.length < LIFEBOOK_MIN_CHARS) {
    usedFallback = true;
    text = lifebookLongFallback(title, subtitle, body, sectionHeaders, counselorFocus, LIFEBOOK_MIN_CHARS);
  }

  return json({
    ok: true,
    sessionId: chapter,
    chapter,
    chapterMeta: { num: chapter, title, subtitle, icon: "book" },
    text,
    sections: parseSections(text),
    usedFallback,
  });
}

async function handleLoveSecretSession(request, env) {
  const body = await readJson(request);
  const input = buildSessionInput(body, 11);
  const chapter = input.chapter;
  const totalChapters = clampInt(body.totalChapters, 11, 10, 11);
  const title = LOVE_SECRET_CHAPTERS[chapter - 1] || LOVE_SECRET_CHAPTERS[0];
  const subtitle = LOVE_SECRET_CHAPTER_SUBTITLES[chapter - 1] || "사주 궁합 기반 연애 비책";
  const counselorFocus = LOVE_SECRET_COUNSELOR_FOCUS[chapter - 1] || "사주 기반 연애 패턴 분석과 실전 상담 가이드를 균형 있게 제시합니다.";
  const sectionHeaders = LOVE_SECRET_SECTION_HEADERS[chapter - 1] || DEFAULT_BOOK_SECTION_HEADERS;
  const prompt = buildSessionPrompt(
    "love secret relationship guide",
    title,
    chapter,
    totalChapters,
    body,
    sectionHeaders,
    { subtitle, counselorFocus }
  );
  let text = await callGemini(env, prompt, ["LOVE_SECRET_GEMINI_MODEL"]);
  let usedFallback = false;
  if (!text || text.length < 500) {
    usedFallback = true;
    text = bookFallback("연애 비책", title, body, sectionHeaders);
  }

  return json({
    ok: true,
    sessionId: chapter,
    chapter,
    chapterMeta: {
      num: chapter,
      title,
      subtitle,
      icon: "heart"
    },
    text,
    sections: parseSections(text),
    usedFallback,
  });
}

async function handleZiweiBookSession(request, env) {
  const body = await readJson(request);
  const input = normalizeBody(body);
  const chapter = clampInt(body.sessionId ?? body.chapter, 1, 1, 13);
  const meta = { num: chapter, title: ZIWEI_CHAPTERS[chapter - 1], subtitle: "자미두수 프리미엄 인생 총람", icon: "ziwei" };
  const structured = body.ziweiStructured?.palaceStarData;
  const summary = Array.isArray(structured)
    ? structured.slice(0, 6).map((p) => `${p.palace || ""}:${(p.stars || []).map((s) => s.name).join(",")}`).join(" / ")
    : String(body.ziweiData || "").slice(0, 600);
  const generated = await generatedChapter(
    env,
    "ziwei",
    input,
    meta,
    summary || "명궁, 복덕궁, 관록궁, 재백궁 중심의 자미두수 구조",
    `${input.name}님의 자미두수 차트는 12궁의 배치와 주성의 강약을 통해 삶의 역할과 선택 습관을 읽습니다.`,
    "자미두수에서는 명궁의 주제와 궁위 간 연결을 실제 커리어, 관계, 돈의 흐름으로 번역해야 합니다.",
  );
  return json({ ok: true, chapter, chapterMeta: meta, ...generated });
}

export async function handlePremiumRoutes(request, env) {
  try {
    if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
    const path = getRoutePath(request, "/api/premium");
    if (path === "/sukuyo-life") return await handleSukuyoLife(request, env);
    if (path === "/astro-western") return await handleAstroWestern(request, env);
    if (path === "/astro-life") return await handleAstroLife(request, env);
    if (path === "/vedic-life") return await handleVedicLife(request, env);
    if (path === "/ziwei-life") return await handleZiweiBookSession(request, env);
    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function handleLifebookRoutes(request, env) {
  try {
    if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
    const path = getRoutePath(request, "/api/lifebook");
    if (path === "/session") return await handleLifebookSession(request, env);
    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function handleLoveSecretRoutes(request, env) {
  try {
    if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
    const path = getRoutePath(request, "/api/love-secret");
    if (path === "/session") return await handleLoveSecretSession(request, env);
    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function handleZiweiBookRoutes(request, env) {
  try {
    if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
    const path = getRoutePath(request, "/api/ziwei-book");
    if (path === "/session") return await handleZiweiBookSession(request, env);
    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}
