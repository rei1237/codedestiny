// 잠금화면 "오늘의 운세" — 5개 점술(사주·자미두수·숙요점·베다점·점성술) 오프라인 일일 리딩.
//
// 설계 원칙: 잠금화면은 화면이 켜지는 순간(네트워크 없을 수 있음) 즉시 그려져야 하고
// 절대 백지가 되면 안 된다. 따라서 lunar-javascript 같은 무거운 엔진을 import하지 않고,
// 자립형·결정론 계산(일진 60갑자·태양궁·요일 지배성)과 톤 일치 문구 풀로만 구성한다.
// 생년 정보(useAiProfileSeed)가 있으면 개인화하고, 없으면 날짜 시드 일반운으로 폴백한다.

import { getZodiacFromBirthDate } from "@/lib/yeon/zodiac";

export type DailyFortuneSystem = "sukuyo" | "saju" | "astro" | "vedic" | "ziwei";

export interface DailyFortuneSystemMeta {
  key: DailyFortuneSystem;
  label: string;
  emoji: string;
}

export const DAILY_FORTUNE_SYSTEMS: readonly DailyFortuneSystemMeta[] = [
  { key: "sukuyo", label: "숙요점", emoji: "🌙" },
  { key: "saju", label: "사주", emoji: "🎴" },
  { key: "astro", label: "점성술", emoji: "✦" },
  { key: "vedic", label: "베다점", emoji: "🕉️" },
  { key: "ziwei", label: "자미두수", emoji: "🟣" },
];

export interface DailyFortuneInput {
  birthDate?: string | null; // "YYYY-MM-DD"
  birthTime?: string | null; // "HH:MM"
}

export interface DailyFortune {
  system: DailyFortuneSystem;
  label: string;
  emoji: string;
  anchor: string; // 오늘의 신호(예: "오늘의 일진 · 병오일(화)")
  headline: string;
  body: string;
  personalized: boolean;
}

// ── 결정론 유틸 ────────────────────────────────────────────────
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function kstParts(now: Date) {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  return { y: kst.getUTCFullYear(), m: kst.getUTCMonth() + 1, d: kst.getUTCDate(), dow: kst.getUTCDay() };
}

function dateKeyOf(now: Date) {
  const { y, m, d } = kstParts(now);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

function pickBy<T>(pool: readonly T[], seed: number): T {
  return pool[seed % pool.length];
}

// ── 60갑자 일진(사주) — worker/lib/daily-fortune-task.js와 동일 알고리즘 ──
const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const GANJI_LIST = Array.from({ length: 60 }, (_, i) => STEMS[i % 10] + BRANCHES[i % 12]);
const STEM_ELEMENT = ["목", "목", "화", "화", "토", "토", "금", "금", "수", "수"]; // 갑을목 병정화 무기토 경신금 임계수

function julianDay(year: number, month: number, day: number): number {
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

function dayStemIndex(y: number, m: number, d: number): number {
  const jd = julianDay(y, m, d);
  const idx = ((Math.floor(jd + 0.5) + 49) % 60 + 60) % 60;
  return idx % 10; // 천간 인덱스
}

function dayGanji(y: number, m: number, d: number): { ganji: string; element: string } {
  const jd = julianDay(y, m, d);
  const idx = ((Math.floor(jd + 0.5) + 49) % 60 + 60) % 60;
  return { ganji: GANJI_LIST[idx], element: STEM_ELEMENT[idx % 10] };
}

function parseYmd(s?: string | null): { y: number; m: number; d: number } | null {
  if (!s) return null;
  const mt = String(s).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!mt) return null;
  return { y: Number(mt[1]), m: Number(mt[2]), d: Number(mt[3]) };
}

// ── 오행 관계(일진 원소 → 원국 일간 원소) ──────────────────────
const ELEMENT_ORDER = ["목", "화", "토", "금", "수"]; // 상생 순환

export type ElementRelation = "생" | "극" | "비화" | "설기" | "재";

/**
 * 두 오행 사이의 생극 관계.
 *
 * 🔴 이 판정은 레포에서 여기 한 곳만 구현한다. lib/fortune/fortune-score.ts 가 띠·별자리
 *    운세 점수를 낼 때 그대로 import 한다 — 같은 규칙을 두 벌로 두면 두 화면이 같은 날
 *    서로 다른 길흉을 말하게 된다(CLAUDE.md 코딩 원칙 6).
 */
export function elementRelation(dayEl: string, natalEl: string): ElementRelation {
  if (dayEl === natalEl) return "비화";
  const di = ELEMENT_ORDER.indexOf(dayEl);
  const ni = ELEMENT_ORDER.indexOf(natalEl);
  if (di < 0 || ni < 0) return "비화";
  if ((di + 1) % 5 === ni) return "생"; // 오늘이 나를 생함(도움)
  if ((ni + 1) % 5 === di) return "설기"; // 내가 오늘을 생함(에너지 나감)
  if ((di + 2) % 5 === ni) return "극"; // 오늘이 나를 극함(압박)
  return "재"; // 내가 오늘을 극함(내가 다룸)
}

const ELEMENT_MOOD: Record<string, string> = {
  목: "새로 뻗어 나가고 시작하는",
  화: "밝게 드러나고 표현하는",
  토: "중심을 잡고 다지는",
  금: "정리하고 매듭짓는",
  수: "깊이 사색하고 흐르는",
};

const SAJU_RELATION_ADVICE: Record<string, string> = {
  생: "오늘의 기운이 당신을 밀어 줍니다. 미뤄 둔 일을 꺼내 한 걸음 나아가기 좋은 날입니다.",
  비화: "나와 결이 같은 기운이 함께합니다. 익숙한 방식이 오히려 힘을 냅니다. 무리한 변화보다 페이스를 지키세요.",
  설기: "표현하고 베풀기 좋은 날이지만 에너지가 빠져나가기 쉽습니다. 중요한 일부터 하고, 나를 위한 휴식도 남겨 두세요.",
  극: "오늘은 약간의 압박이 느껴질 수 있습니다. 정면 돌파보다 한 박자 늦추고, 급한 결정은 하루 재워 두세요.",
  재: "다룰 것이 많은 날입니다. 욕심을 조금 줄이고 하나에 집중하면 오히려 손에 잡히는 결과가 옵니다.",
};

const SAJU_GENERIC: readonly string[] = [
  "오늘의 일진은 무리하기보다 결을 따라갈 때 순합니다. 작은 정리 하나가 큰 여유를 만듭니다.",
  "서두르지 않을수록 길이 선명해지는 하루입니다. 먼저 듣고 나중에 결정하세요.",
  "가진 것을 단단히 묶기 좋은 날입니다. 새로 벌이기보다 마무리에 힘을 실으세요.",
  "관계에서 온기가 도는 날입니다. 먼저 안부를 건네면 뜻밖의 도움이 돌아옵니다.",
  "몸을 돌보는 일이 곧 운을 돌보는 일입니다. 오늘은 컨디션을 우선하세요.",
];

function buildSaju(input: DailyFortuneInput, now: Date): DailyFortune {
  const t = kstParts(now);
  const today = dayGanji(t.y, t.m, t.d);
  const seed = hashStr(dateKeyOf(now) + "saju");
  const birth = parseYmd(input.birthDate);
  if (birth) {
    const natalStem = dayStemIndex(birth.y, birth.m, birth.d);
    const natalEl = STEM_ELEMENT[natalStem];
    const rel = elementRelation(today.element, natalEl);
    return {
      system: "saju",
      label: "사주",
      emoji: "🎴",
      anchor: `오늘의 일진 · ${today.ganji}일 (${today.element})`,
      headline: `${ELEMENT_MOOD[today.element]} 기운이 흐릅니다`,
      body: SAJU_RELATION_ADVICE[rel],
      personalized: true,
    };
  }
  return {
    system: "saju",
    label: "사주",
    emoji: "🎴",
    anchor: `오늘의 일진 · ${today.ganji}일 (${today.element})`,
    headline: `${ELEMENT_MOOD[today.element]} 기운이 흐릅니다`,
    body: pickBy(SAJU_GENERIC, seed),
    personalized: false,
  };
}

// ── 점성술(태양궁) ─────────────────────────────────────────────
const ASTRO_SIGN_TRAIT: Record<string, string> = {
  양자리: "선두에 서는 추진력", 황소자리: "끈기와 안정감", 쌍둥이자리: "재치와 소통력",
  게자리: "따뜻한 보살핌", 사자자리: "빛나는 존재감", 처녀자리: "섬세한 완성도",
  천칭자리: "균형과 조화", 전갈자리: "깊이 있는 몰입", 사수자리: "자유로운 확장",
  염소자리: "묵직한 책임감", 물병자리: "독창적인 시선", 물고기자리: "부드러운 공감",
};
const ASTRO_DAILY: readonly string[] = [
  "오늘은 당신의 강점이 자연스럽게 드러나는 날입니다. 애쓰지 않아도 흐름이 도와줍니다.",
  "감정보다 사실에 무게를 두면 판단이 맑아집니다. 서두른 답은 하루 미뤄도 좋아요.",
  "가까운 관계에서 온기가 돌아옵니다. 먼저 마음을 열면 오해가 풀립니다.",
  "작은 정리가 큰 여유를 부르는 날입니다. 미뤄 둔 한 가지를 오늘 끝내 보세요.",
  "새로운 기회의 신호가 스칩니다. 완벽을 기다리지 말고 반 걸음 먼저 움직이세요.",
  "몸과 마음의 속도를 맞추기 좋은 날입니다. 무리한 약속보다 나를 위한 여백을 남기세요.",
  "직감이 또렷해지는 날입니다. 마음이 이끄는 쪽을 한 번 더 신뢰해 보세요.",
];

function buildAstro(input: DailyFortuneInput, now: Date): DailyFortune {
  const seed = hashStr(dateKeyOf(now) + "astro");
  const sign = getZodiacFromBirthDate(input.birthDate || undefined);
  if (sign) {
    return {
      system: "astro",
      label: "점성술",
      emoji: "✦",
      anchor: `오늘의 별자리 · ${sign}`,
      headline: `${ASTRO_SIGN_TRAIT[sign] || "당신의 빛"}이 살아나는 하루`,
      body: pickBy(ASTRO_DAILY, seed),
      personalized: true,
    };
  }
  return {
    system: "astro",
    label: "점성술",
    emoji: "✦",
    anchor: "오늘의 하늘",
    headline: "별의 흐름이 잔잔히 돕는 하루",
    body: pickBy(ASTRO_DAILY, seed),
    personalized: false,
  };
}

// ── 베다점(요일 지배성 · Vāra) ─────────────────────────────────
const VARA_RULER = ["태양", "달", "화성", "수성", "목성", "금성", "토성"]; // 일~토
const VARA_THEME: Record<string, string> = {
  태양: "자신감과 중심을 세우는", 달: "마음을 돌보고 감정을 다스리는", 화성: "결단과 추진의",
  수성: "소통과 배움의", 목성: "확장과 지혜의", 금성: "사랑과 조화의", 토성: "인내와 정리의",
};
const VEDIC_DAILY: readonly string[] = [
  "오늘의 지배성이 당신의 하루에 결을 더합니다. 그 결을 거스르지 말고 함께 흐르세요.",
  "카르마는 노력에 반응합니다. 결과를 재촉하기보다 지금 할 수 있는 정성을 다하세요.",
  "내려놓을 것과 붙들 것을 구분하기 좋은 날입니다. 집착을 조금 풀면 길이 열립니다.",
  "달의 기운이 마음을 살핍니다. 무리한 결정보다 호흡을 고르고 하루를 여세요.",
  "베풂이 곧 복이 되는 날입니다. 작은 친절 하나가 예상 밖의 흐름을 부릅니다.",
];

function buildVedic(input: DailyFortuneInput, now: Date): DailyFortune {
  const t = kstParts(now);
  const todayRuler = VARA_RULER[t.dow];
  const seed = hashStr(dateKeyOf(now) + "vedic");
  const birth = parseYmd(input.birthDate);
  if (birth) {
    const bd = new Date(Date.UTC(birth.y, birth.m - 1, birth.d));
    const birthRuler = VARA_RULER[bd.getUTCDay()];
    const harmony = birthRuler === todayRuler ? "본래의 지배성과 오늘의 기운이 맞물립니다. 익숙한 힘이 특히 강해지는 날입니다." : `${birthRuler}의 기질에 ${todayRuler}의 결이 더해집니다. ${VEDIC_DAILY[seed % VEDIC_DAILY.length]}`;
    return {
      system: "vedic",
      label: "베다점",
      emoji: "🕉️",
      anchor: `오늘의 지배성 · ${todayRuler}`,
      headline: `${VARA_THEME[todayRuler]} 하루`,
      body: harmony,
      personalized: true,
    };
  }
  return {
    system: "vedic",
    label: "베다점",
    emoji: "🕉️",
    anchor: `오늘의 지배성 · ${todayRuler}`,
    headline: `${VARA_THEME[todayRuler]} 하루`,
    body: pickBy(VEDIC_DAILY, seed),
    personalized: false,
  };
}

// ── 숙요점(27수 기운) ─────────────────────────────────────────
// 달이 머무는 별자리의 기운을 하루 단위로. 무거운 음력 엔진 없이 27일 주기로 결정론 순환한다.
const SUKUYO_MANSION: readonly { name: string; theme: string }[] = [
  { name: "각(角)", theme: "첫 문을 여는" }, { name: "항(亢)", theme: "기준을 세우는" },
  { name: "저(氐)", theme: "뿌리를 다지는" }, { name: "방(房)", theme: "중심을 품는" },
  { name: "심(心)", theme: "마음을 읽는" }, { name: "미(尾)", theme: "끝까지 붙드는" },
  { name: "기(箕)", theme: "길을 넓히는" }, { name: "두(斗)", theme: "결단하는" },
  { name: "여(女)", theme: "섬세하게 돌보는" }, { name: "허(虛)", theme: "비우고 채우는" },
  { name: "위(危)", theme: "위기를 넘는" }, { name: "실(室)", theme: "터를 세우는" },
  { name: "벽(壁)", theme: "경계를 정리하는" }, { name: "규(奎)", theme: "지혜를 모으는" },
  { name: "루(婁)", theme: "불러 모으는" }, { name: "위(胃)", theme: "받아들이는" },
  { name: "묘(昴)", theme: "빛을 모으는" }, { name: "필(畢)", theme: "거두어들이는" },
  { name: "자(觜)", theme: "시작을 알리는" }, { name: "삼(參)", theme: "세 갈래를 아우르는" },
  { name: "정(井)", theme: "샘솟는" }, { name: "귀(鬼)", theme: "보이지 않는 것을 살피는" },
  { name: "류(柳)", theme: "부드럽게 흐르는" }, { name: "성(星)", theme: "빛나는" },
  { name: "장(張)", theme: "펼쳐 나가는" }, { name: "익(翼)", theme: "날개를 펴는" },
  { name: "진(軫)", theme: "매듭짓는" },
];
const SUKUYO_DAILY: readonly string[] = [
  "오늘의 별자리 기운은 서두르지 않는 쪽에 힘을 실어 줍니다. 한 걸음의 여유가 하루를 지킵니다.",
  "달의 자리가 마음을 다독입니다. 먼저 듣고 천천히 답하면 관계가 순해집니다.",
  "매듭짓기 좋은 흐름입니다. 미뤄 둔 일을 하나 정리하면 마음의 공간이 넓어집니다.",
  "새 인연·새 소식이 스치는 날입니다. 문을 조금 열어 두면 반가운 흐름이 들어옵니다.",
  "안으로 단단해지는 기운입니다. 확장보다 정비가 어울리니 나를 먼저 채우세요.",
  "정성이 통하는 날입니다. 작게라도 꾸준히 이어 온 일이 오늘 빛을 봅니다.",
];

function buildSukuyo(input: DailyFortuneInput, now: Date): DailyFortune {
  const t = kstParts(now);
  const jd = julianDay(t.y, t.m, t.d);
  const mansion = SUKUYO_MANSION[(Math.floor(jd + 0.5) % 27 + 27) % 27];
  const seed = hashStr(dateKeyOf(now) + "sukuyo");
  const birth = parseYmd(input.birthDate);
  const body = pickBy(SUKUYO_DAILY, seed);
  return {
    system: "sukuyo",
    label: "숙요점",
    emoji: "🌙",
    anchor: `오늘의 수(宿) · ${mansion.name}`,
    headline: `${mansion.theme} 별이 하루를 이끕니다`,
    body,
    personalized: Boolean(birth),
  };
}

// ── 자미두수(오늘의 궁 기운) ──────────────────────────────────
const ZIWEI_PALACE: readonly { name: string; theme: string; advice: string }[] = [
  { name: "명궁", theme: "나 자신", advice: "오늘은 남보다 나에게 집중할 때입니다. 내 리듬을 지키면 하루가 단단해집니다." },
  { name: "재백궁", theme: "재물의 흐름", advice: "돈과 관련한 감각이 예민해지는 날입니다. 큰 결정보다 작은 정리가 이롭습니다." },
  { name: "관록궁", theme: "일과 성취", advice: "일에서 인정받기 좋은 흐름입니다. 맡은 자리에서 한 걸음 더 정성을 들이세요." },
  { name: "부부궁", theme: "인연과 사랑", advice: "가까운 사람과의 온기가 도는 날입니다. 먼저 다가가면 마음이 이어집니다." },
  { name: "천이궁", theme: "이동과 변화", advice: "밖에서 기회가 오는 날입니다. 익숙한 자리를 조금 벗어나면 새 흐름을 만납니다." },
  { name: "복덕궁", theme: "마음의 평안", advice: "마음을 돌보기 좋은 날입니다. 서두르지 말고 나를 위한 여백을 남기세요." },
  { name: "전택궁", theme: "터전과 안정", advice: "기반을 다지기 좋은 흐름입니다. 새로 벌이기보다 있는 것을 정돈하세요." },
  { name: "질액궁", theme: "몸과 건강", advice: "컨디션을 우선하는 날입니다. 몸을 돌보는 일이 곧 오늘의 운을 돌보는 일입니다." },
];

function buildZiwei(input: DailyFortuneInput, now: Date): DailyFortune {
  // 생년(있으면)과 날짜를 함께 시드로 삼아 오늘의 궁 기운을 결정론적으로 고른다.
  const birth = parseYmd(input.birthDate);
  const birthSalt = birth ? `${birth.y}-${birth.m}-${birth.d}` : "guest";
  const seed = hashStr(dateKeyOf(now) + "ziwei" + birthSalt);
  const palace = ZIWEI_PALACE[seed % ZIWEI_PALACE.length];
  return {
    system: "ziwei",
    label: "자미두수",
    emoji: "🟣",
    anchor: `오늘 밝아지는 궁 · ${palace.name}`,
    headline: `${palace.theme}에 빛이 드는 하루`,
    body: palace.advice,
    personalized: Boolean(birth),
  };
}

// ── 공개 API ──────────────────────────────────────────────────
export function getDailyFortune(system: DailyFortuneSystem, input: DailyFortuneInput, now: Date = new Date()): DailyFortune {
  try {
    switch (system) {
      case "saju": return buildSaju(input, now);
      case "astro": return buildAstro(input, now);
      case "vedic": return buildVedic(input, now);
      case "ziwei": return buildZiwei(input, now);
      case "sukuyo":
      default: return buildSukuyo(input, now);
    }
  } catch {
    // 어떤 경우에도 백지가 되지 않도록 안전한 폴백
    return {
      system,
      label: DAILY_FORTUNE_SYSTEMS.find((s) => s.key === system)?.label || "오늘의 운세",
      emoji: DAILY_FORTUNE_SYSTEMS.find((s) => s.key === system)?.emoji || "✨",
      anchor: "오늘의 운세",
      headline: "잔잔히 돕는 하루",
      body: "서두르지 않을수록 길이 선명해집니다. 작은 정리 하나가 큰 여유를 만듭니다.",
      personalized: false,
    };
  }
}
