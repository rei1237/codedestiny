import { Lunar, Solar } from "lunar-javascript";
import { requireAuth } from "../lib/auth.js";
import { connectDb } from "../lib/db.js";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { canAccessPaidFeature } from "../lib/paid-feature-access.js";
import { MonthlyCreditLedger, PaidExecutionRecord, Payment, PointHistory, SukuyoCompatibilityAiConsultation, User } from "../lib/models.js";
import { buildSukuyoAiCompatibility, buildSukuyoFromLunar } from "../lib/sukuyo-ai-calculation.js";
import { callGeminiText } from "../lib/gemini.js";
import { callGeminiJsonWithRetry } from "../lib/structured-consultation.js";
import { hasRenderableLlmText } from "../lib/llm-result-delivery.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";

const FEATURE_KEY = "sukuyo-compatibility-ai";
const TITLE = "숙요점 AI 상담";
const COMPATIBILITY_TITLE = "숙요점 궁합 AI 상담";
const AMOUNT_KRW = 30000;
const COIN_PRICE = 300;
const TOKEN_TTL_MS = 20 * 60 * 1000;
const startLocks = new Map();

const CONSULTATION_TYPES = new Set(["personal", "compatibility"]);
const RELATIONSHIP_TYPES = new Set(["개인 상담", "연인", "썸", "부부", "재회", "짝사랑", "비즈니스 파트너", "친구", "가족"]);
const TOPICS = new Set([
  "전체 궁합",
  "연애 궁합",
  "결혼 가능성",
  "재회 가능성",
  "갈등 원인",
  "속궁합/정서적 친밀감",
  "장기 관계 가능성",
  "상대의 마음",
  "관계 유지 전략",
]);
const FORBIDDEN_RESULT_PATTERNS = [/PDF/gi, /챕터/g, /chapter/gi, /progress/gi, /job/gi, /프롬프트/g, /시스템/g];
const SUKUYO_STABLE_GROUP_HANJA = new Set(["角", "亢", "氐", "房", "心", "尾", "箕"]);
const SUKUYO_RISK_GROUP_HANJA = new Set(["奎", "婁", "胃", "昴", "畢", "觜", "參"]);
const SUKUYO_FIVE_ELEMENTS = new Set(["목", "화", "토", "금", "수"]);
const SUKUYO_ELEMENT_CREATE = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const SUKUYO_ELEMENT_CONTROL = { 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" };
const SUKUYO_RELATION_12 = [
  { name: "안", han: "安", meaning: "동숙·완벽한 공명" },
  { name: "위", han: "危", meaning: "근접·날카로운 긴장" },
  { name: "괴", han: "壞", meaning: "파괴적 변화 유발" },
  { name: "복", han: "福", meaning: "복과 이익의 관계" },
  { name: "명", han: "命", meaning: "운명적 연결" },
  { name: "이", han: "利", meaning: "실익과 협력" },
  { name: "쇠", han: "衰", meaning: "에너지 소진 위험" },
  { name: "우", han: "友", meaning: "우정·동반의 결속" },
  { name: "아", han: "我", meaning: "자기 투영·미러링" },
  { name: "원", han: "怨", meaning: "원한·업보의 얽힘" },
  { name: "친", han: "親", meaning: "깊은 친밀감" },
  { name: "비", han: "非", meaning: "이질적 공존" },
];
const SUKUYO_SECTION_SPECS = [
  { key: "overview", title: "☯ 總論 — 종합 궁합 총평", minChars: 1000, guide: "종합 스코어 한 문장 요약 뒤 운명인연도, 기질조화도, 감정공명도, 성장시너지, 장기안정도를 각각 원국 요소와 연결해 풀이" },
  { key: "twoStars", title: "☽ 兩星 — 두 별의 본질", minChars: 900, guide: "두 사람의 숙, 오행, 음양, 수호신이 회의실, 데이트, 갈등 상황에서 어떻게 드러나는지 생활 장면으로 풀이" },
  { key: "attraction", title: "✦ 引力 — 끌림의 구조", minChars: 900, guide: "처음 만났을 때 끌렸을 구체적 시나리오 1개와 지금 관계에서 끌림을 재확인하는 시나리오 1개 포함" },
  { key: "conflict", title: "〜 波紋 — 갈등의 파문", minChars: 1200, guide: "갈등 시나리오 3가지 이상을 발단, 각자의 반응, 흔한 실수, 이상적 대응 대사 예시 순서로 제시" },
  { key: "timing", title: "◎ 時節 — 관계의 계절", minChars: 900, guide: "현재 이번 달, 1~3개월 후, 3~6개월 후, 6개월~1년 후 흐름과 주의사항을 별도 소단락으로 서술" },
  { key: "caution", title: "⚠ 禁忌 — 조심해야 할 관계 습관", minChars: 900, guide: "하지 말아야 할 말과 행동 5가지를 원국 근거와 대안 행동까지 함께 제시" },
  { key: "treasure", title: "◈ 金脈 — 이 관계만의 보물", minChars: 900, guide: "두 사람만의 강점을 함께 하면 좋은 활동과 방식 3가지 이상으로 제시" },
  { key: "communication", title: "🗣 疏通 — 서로에게 맞는 대화법", minChars: 900, guide: "사람A와 사람B에게 효과적인 대화 방식을 대조하고 화해 대사 예시를 각자 기준 2개씩 제시" },
  { key: "domains", title: "💞 領域 — 관계 영역별 궁합", minChars: 1200, guide: "연애와 결혼, 직장 동료와 사업 파트너, 우정 관계에서 궁합이 어떻게 다르게 작용하는지 모두 풀이" },
  { key: "crisis", title: "🌪 危機 — 위기 시나리오와 극복법", minChars: 900, guide: "권태기, 장거리, 가치관 충돌 등 취약한 위기 국면 1~2개와 단계별 행동 지침 제시" },
  { key: "outlook", title: "🔭 展望 — 장기 전망", minChars: 900, guide: "1년 후와 3년 후를 성장했을 때와 갈등이 누적됐을 때 두 갈래 시나리오로 제시" },
  { key: "moonLetter", title: "♡ 月箋 — 오늘의 달빛 처방", minChars: 700, guide: "전체 흐름을 정리하고 오늘 당장 실천할 수 있는 구체적 행동 3가지를 번호로 제시" },
];
const SUKUYO_COMPATIBILITY_TARGET_MIN_CHARS = SUKUYO_SECTION_SPECS.reduce((total, section) => total + section.minChars, 0);
const SUKUYO_COMPATIBILITY_TARGET_MAX_CHARS = 14000;

const MESSAGES = {
  login: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  paymentRequired: "숙요점 궁합 AI 상담 이용권이 필요합니다. 결제창을 열어드릴게요.",
  paymentVerifyFailed: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
  invalidInput: "상담에 필요한 정보가 부족해요. 생년월일과 상담 질문을 다시 확인해 주세요.",
  calculationFailed: "숙요점 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.",
  serverFailed: "상담 준비 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
  llmFailed: "AI 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동 복구됩니다.",
  networkFailed: "연결이 불안정해요. 잠시 후 다시 시도해 주세요.",
};

const SYSTEM_PROMPT = [
  "당신은 숙요점 27숙과 관계 상담에 능한 전문 상담가입니다.",
  "",
  "사용자의 생년월일을 바탕으로 본명숙을 해석하고, 궁합 상담인 경우 상대방의 숙과 관계 거리도 함께 분석합니다.",
  "",
  "반드시 지켜야 할 원칙:",
  "1. 실제 상담사가 말하듯 전문적이고 따뜻하게 답변합니다.",
  "2. 숙요점의 27숙, 관계 유형, 거리 개념을 정확하게 반영합니다.",
  "3. 명, 업태, 영친, 우쇠, 안괴, 위성/성위 관계를 단순한 길흉으로만 말하지 말고 관계 심리로 풀어냅니다.",
  "4. 불안감을 자극하거나 결론을 과장하지 않습니다.",
  "5. 상대방의 마음을 확정적으로 단정하지 않습니다.",
  "6. 운세를 절대적 예언처럼 말하지 않습니다.",
  "7. 사용자가 실제로 오늘 할 수 있는 행동 처방을 제시합니다.",
  "8. 같은 문장을 반복하지 않습니다.",
  "9. AI, 프롬프트, 시스템, PDF, 챕터 같은 표현을 결과에 노출하지 않습니다.",
  "10. 사용자의 현재 질문을 가장 깊게 다룹니다.",
  "11. 마지막 질문 유도 문구 없이, 지금 필요한 관계 처방으로 마무리합니다.",
].join("\n");

const COMPATIBILITY_JSON_SYSTEM_PROMPT = [
  "당신은 20년 경력의 숙요점(宿曜占) 전문 역술가이자, 관계 상담에 능한 카운슬러입니다.",
  "인도에서 기원하여 당나라를 거쳐 한국에 전해진 27숙 체계로 두 사람의 궁합을 정밀하게 독해합니다.",
  "서버가 제공한 본명숙, 숙 그룹, 음양, 오행, 수호신, 관계 거리, 양방향 관계 유형, 점수는 확정값입니다.",
  "확정값을 바꾸거나 새로 계산하지 말고, 주어진 JSON 뼈대의 meta 값은 그대로 유지합니다.",
  "결과는 한국어 JSON 객체 하나만 반환합니다.",
  `sections.*.body의 합계는 공백 포함 ${SUKUYO_COMPATIBILITY_TARGET_MIN_CHARS.toLocaleString("ko-KR")}~${SUKUYO_COMPATIBILITY_TARGET_MAX_CHARS.toLocaleString("ko-KR")}자 사이여야 합니다.`,
  "각 sections.*.body는 지정된 최소 글자수를 반드시 넘겨야 하며, 부족하면 구체적 사례, 실제 대사, 행동 지침, 시기별 전망을 추가합니다.",
  "마크다운 코드블록, JSON 밖 설명 문구, 후속 질문 유도 문구를 절대 넣지 않습니다.",
  "sections.*.body에 사용할 수 있는 마크업은 **굵게**, 번호 목록(1. ), 하이픈 목록(- ), 인용(> ) 네 가지뿐입니다. 표, 제목 기호(#), 코드블록, 링크, HTML 태그는 절대 쓰지 않습니다. 문단 사이는 반드시 빈 줄로 구분합니다.",
  "모든 body에는 구체적 상황 묘사, 실제 대화체 예시, 체크리스트 또는 번호 행동 지침, 시기별 전망 중 최소 2가지 이상을 포함합니다.",
  "각 body는 그 섹션 주제와 직접 관련된 계산 근거(관계 유형의 정의, 방향별 거리, 오행 상생·상극, 숙 그룹, 음양 조합 중 해당되는 것)를 최소 1회 명시적으로 인용해 논거로 삼습니다. 근거 없는 단정 문장을 쓰지 않습니다.",
  "'두 분은 특별한 인연입니다', '운명이 두 사람을 이끌었습니다'처럼 계산 근거 없이 치켜세우는 보일러플레이트 문장을 금지합니다. 감탄과 위로는 반드시 27숙 상성 근거 뒤에만 붙입니다.",
  "전체 서사는 '운명적 끌림'과 '현실적 조율' 두 축으로 짭니다. 끌림을 말할 때는 관계 유형·거리·상생의 근거를, 조율을 말할 때는 상극·그룹 차이·음양 조합의 과제를 짝지어 말합니다.",
  "숙 이름은 첫 언급 시 한글과 한자를 병기합니다.",
  "같은 비유와 같은 첫 문장 구조를 반복하지 않으며, '돌봄과 치유', '변화와 개혁' 같은 추상 표현으로 분량을 채우지 않습니다.",
  "상대방의 마음, 재회, 이별, 결혼을 확정하지 않고 건강한 선택과 경계를 존중합니다.",
  "의학적, 법적, 재정적 조언처럼 들리지 않게 하고 '~할 가능성이 높습니다', '~하는 경향이 있습니다'처럼 확률적 어조를 씁니다.",
  "AI, 프롬프트, 시스템, PDF, 리포트 렌더링 같은 표현은 결과에 노출하지 않습니다.",
].join("\n");

function clean(value, max = 0) {
  const text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  return max > 0 ? text.slice(0, max) : text;
}

function cleanRichText(value, max = 0) {
  const text = String(value == null ? "" : value)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
  return max > 0 ? text.slice(0, max) : text;
}

function normalizeId(value) {
  return clean(value, 180).replace(/[^a-zA-Z0-9._:-]/g, "-");
}

function isDevEnv(env = {}) {
  return ["development", "dev", "local", "test"].includes(clean(env.NODE_ENV || env.ENVIRONMENT || env.APP_ENV).toLowerCase());
}

function maskBirthDate(value) {
  const text = clean(value, 10);
  return text ? `${text.slice(0, 4)}-**-**` : "";
}

function maskName(value) {
  const text = clean(value, 80);
  if (!text) return "";
  if (text.length <= 1) return "*";
  return `${text.slice(0, 1)}${"*".repeat(Math.min(3, text.length - 1))}`;
}

function maskedPerson(person = {}) {
  return {
    name: maskName(person.name),
    gender: clean(person.gender, 20),
    birthDate: maskBirthDate(person.birthDate),
    calendarType: clean(person.calendarType, 20),
  };
}

function logSukyoAi(marker, details = {}, error = null, env = {}) {
  const payload = {
    route: clean(details.route || "/api/sukuyo-compatibility-ai", 120),
    requestId: clean(details.requestId, 180),
    consultationType: clean(details.consultationType || "compatibility", 40),
    validation: details.validation,
    providerReason: clean(details.providerReason, 120),
    accessGranted: typeof details.accessGranted === "boolean" ? details.accessGranted : undefined,
    accessType: clean(details.accessType, 40),
    personA: details.personA ? maskedPerson(details.personA) : undefined,
    personB: details.personB ? maskedPerson(details.personB) : undefined,
    errorMessage: error ? clean(error?.message || error, 500) : clean(details.errorMessage, 500),
  };
  if (error && isDevEnv(env)) payload.stack = clean(error?.stack, 2000);
  const writer = error ? console.error : console.info;
  writer(marker, payload);
}

function normalizeGender(value) {
  const token = clean(value).toLowerCase();
  if (["m", "male", "man", "남", "남성", "남자"].includes(token)) return "male";
  if (["f", "female", "woman", "여", "여성", "여자"].includes(token)) return "female";
  if (["other", "기타", "비공개", "unknown"].includes(token)) return "unknown";
  return token ? clean(value, 40) : "";
}

function normalizeCalendarType(value) {
  const token = clean(value).toLowerCase();
  if (token.includes("lunar") || token.includes("음력")) return "lunar";
  return "solar";
}

function parseBirthDate(value) {
  const raw = clean(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  if (year < 1900 || year > 2100) return null;
  return { year, month, day, raw };
}

function normalizeBirthTime(value) {
  const raw = clean(value);
  if (!raw) return "";
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(raw) ? raw : "";
}

function normalizePerson(value = {}, fallbackName) {
  const source = value && typeof value === "object" ? value : {};
  const rawCalendarType = clean(source.calendarType);
  const birthDate = parseBirthDate(source.birthDate);
  return {
    name: clean(source.name || source.nickname || fallbackName, 80),
    gender: normalizeGender(source.gender),
    birthDate: birthDate?.raw || "",
    birthParts: birthDate,
    birthTime: normalizeBirthTime(source.birthTime),
    calendarType: normalizeCalendarType(rawCalendarType),
    hasCalendarType: Boolean(rawCalendarType),
    isLeapMonth: source.isLeapMonth === true || clean(source.calendarType).toLowerCase().includes("leap") || clean(source.calendarType).includes("윤달"),
  };
}

function normalizeConsultationType(value) {
  const token = clean(value).toLowerCase();
  return CONSULTATION_TYPES.has(token) ? token : "compatibility";
}

function normalizeInput(body = {}) {
  const consultationType = normalizeConsultationType(body.consultationType || body.type);
  const flatPersonA = {
    name: body.userName || body.name || body.nickname,
    gender: body.gender,
    birthDate: body.birthDate,
    birthTime: body.birthTime,
    calendarType: body.calendarType,
    isLeapMonth: body.isLeapMonth,
  };
  const flatPersonB = {
    name: body.partnerName,
    gender: body.partnerGender,
    birthDate: body.partnerBirthDate,
    birthTime: body.partnerBirthTime,
    calendarType: body.partnerCalendarType,
    isLeapMonth: body.partnerIsLeapMonth,
  };
  const personA = normalizePerson(body.personA || body.self || body.user || flatPersonA, "나");
  const personB = normalizePerson(body.personB || body.partner || flatPersonB, "상대");
  const relationshipType = consultationType === "personal"
    ? "개인 상담"
    : clean(body.relationshipType || body.relationType || body.category, 80);
  const topic = clean(body.topic || body.consultationTopic || body.questionTopic || "숙요점 상담", 80);
  const question = clean(body.question || body.message || body.consultationQuestion || "", 1200);
  const errors = [];
  if (!CONSULTATION_TYPES.has(consultationType)) errors.push("consultationType");
  if (!personA.birthParts) errors.push("personA.birthDate");
  if (!personA.gender) errors.push("personA.gender");
  if (!personA.hasCalendarType) errors.push("personA.calendarType");
  if (consultationType === "compatibility") {
    if (!personB.birthParts) errors.push("personB.birthDate");
    if (!personB.gender) errors.push("personB.gender");
    if (!personB.hasCalendarType) errors.push("personB.calendarType");
  }
  if (!RELATIONSHIP_TYPES.has(relationshipType)) errors.push("relationshipType");
  if (!TOPICS.has(topic)) errors.push("topic");
  if (question.length < 2) errors.push("question");
  return { ok: errors.length === 0, errors, consultationType, personA, personB, relationshipType, topic, question };
}

function lunarForPerson(person) {
  const { year, month, day } = person.birthParts || {};
  if (!year || !month || !day) throw Object.assign(new Error("INVALID_BIRTH_DATE"), { code: "INVALID_INPUT" });
  if (person.calendarType === "lunar") {
    const lunarMonth = person.isLeapMonth ? -Math.abs(month) : Math.abs(month);
    Lunar.fromYmd(year, lunarMonth, day);
    return { lunarYear: year, lunarMonth: month, lunarDay: day, isLeapMonth: person.isLeapMonth, source: "user-lunar-input" };
  }
  const [hour, minute] = person.birthTime ? person.birthTime.split(":").map(Number) : [12, 0];
  const lunar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
  const lunarMonth = Number(lunar.getMonth());
  return {
    lunarYear: Number(lunar.getYear()),
    lunarMonth: Math.abs(lunarMonth),
    lunarDay: Number(lunar.getDay()),
    isLeapMonth: lunarMonth < 0,
    source: "lunar-javascript",
  };
}

function calculatePersonSukuyo(person, label) {
  try {
    const lunar = lunarForPerson(person);
    const sukuyo = buildSukuyoFromLunar(lunar.lunarMonth, lunar.lunarDay, {
      isLeapMonth: lunar.isLeapMonth,
      source: lunar.source,
    });
    if (!sukuyo) throw new Error("SUKUYO_EMPTY");
    return { ...sukuyo, lunarYear: lunar.lunarYear };
  } catch (error) {
    console.warn("[sukuyo-compatibility-ai] calculation failed", {
      label,
      birthDate: person.birthDate,
      calendarType: person.calendarType,
      isLeapMonth: person.isLeapMonth,
      error: clean(error?.message || error),
    });
    throw Object.assign(new Error(MESSAGES.calculationFailed), { code: "CALCULATION_FAILED", status: 422 });
  }
}

function normalizeDistance(compatibility = {}) {
  const label = clean(compatibility.distanceLabel || compatibility.distanceMetrics?.distanceLabel);
  const tier = clean(compatibility.distanceMetrics?.tier).toLowerCase();
  if (tier === "near" || label.includes("근")) return "near";
  if (tier === "middle" || label.includes("중")) return "middle";
  if (tier === "far" || label.includes("원")) return "far";
  return "";
}

function shukuName(sukuyo = {}) {
  const name = clean(sukuyo.nameKo || sukuyo.name || "");
  return name ? `${name}숙` : "";
}

function sukuyoHanjaName(sukuyo = {}) {
  const han = clean(sukuyo.nameHan || sukuyo.hanja || "");
  return han ? `${han}宿` : "";
}

function normalizeSukuyoFiveElement(value) {
  const element = clean(value);
  if (SUKUYO_FIVE_ELEMENTS.has(element)) return element;
  if (element === "일") return "화";
  if (element === "월") return "수";
  return "토";
}

function sukuyoGroup(sukuyo = {}) {
  const han = clean(sukuyo.nameHan || sukuyo.hanja || "");
  if (SUKUYO_STABLE_GROUP_HANJA.has(han)) return "안숙";
  if (SUKUYO_RISK_GROUP_HANJA.has(han)) return "위험숙";
  return "성숙";
}

function sukuyoGuardian(sukuyo = {}) {
  const direction = clean(sukuyo.direction);
  if (direction.includes("동")) return "청룡";
  if (direction.includes("남")) return "주작";
  if (direction.includes("서")) return "백호";
  if (direction.includes("북")) return "현무";
  const index = Number(sukuyo.index);
  if (Number.isFinite(index)) {
    if (index <= 6) return "청룡";
    if (index <= 13) return "현무";
    if (index <= 20) return "백호";
    return "주작";
  }
  return "청룡";
}

function sukuyoYinYang(sukuyo = {}) {
  const index = Number(sukuyo.index);
  return Number.isFinite(index) && index % 2 === 0 ? "양" : "음";
}

function sukuyoKeyword(sukuyo = {}) {
  const words = []
    .concat(Array.isArray(sukuyo.keywords) ? sukuyo.keywords : [])
    .concat(Array.isArray(sukuyo.strengths) ? sukuyo.strengths : [])
    .map((item) => clean(item, 20))
    .filter(Boolean);
  return words.slice(0, 3).join("·") || "직관·조율·성장";
}

function sukuyoDegreeStrength(sukuyo = {}) {
  const index = Number(sukuyo.index);
  if (!Number.isFinite(index)) return 12;
  return 8 + ((Math.abs(index) * 7 + 3) % 12);
}

function currentKstSeason(date = new Date()) {
  const month = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", month: "numeric" }).format(date));
  if ([3, 4, 5].includes(month)) return "봄";
  if ([6, 7, 8].includes(month)) return "여름";
  if ([9, 10, 11].includes(month)) return "가을";
  return "겨울";
}

function seasonElement(season) {
  if (season === "봄") return "목";
  if (season === "여름") return "화";
  if (season === "가을") return "금";
  if (season === "겨울") return "수";
  return "토";
}

function seasonalStrength(element, season) {
  const ruling = seasonElement(season);
  if (element === ruling) return "왕";
  if (SUKUYO_ELEMENT_CREATE[element] === ruling || SUKUYO_ELEMENT_CREATE[ruling] === element) return "상";
  return "평";
}

function relationByDirectionalDistance(distance) {
  const normalized = ((Math.floor(Number(distance) || 0) % 27) + 27) % 27;
  const item = SUKUYO_RELATION_12[Math.min(normalized, 11)] || SUKUYO_RELATION_12[11];
  return {
    ...item,
    rawDistance: normalized,
    label: `${item.name}(${item.han})`,
  };
}

function buildCompatibilityRelationMeta(compatibility = {}) {
  const forwardDistance = Number(compatibility.forwardDistance);
  const reverseDistance = Number(compatibility.reverseDistance);
  const shortestDistance = Number(compatibility.shortestDistance ?? compatibility.distanceMetrics?.shortestDistance);
  const forward = relationByDirectionalDistance(Number.isFinite(forwardDistance) ? forwardDistance : 0);
  const reverse = relationByDirectionalDistance(Number.isFinite(reverseDistance) ? reverseDistance : 0);
  const distance = Number.isFinite(shortestDistance)
    ? Math.min(Math.max(0, Math.floor(shortestDistance)), 13)
    : Math.min(forward.rawDistance, reverse.rawDistance);
  const traditional = clean(compatibility.relationType || "");
  const intensity = distance <= 3 || ["안괴", "업태"].includes(traditional)
    ? "강렬"
    : distance >= 9
      ? "잔잔"
      : "보통";
  return {
    type_a_to_b: forward.label,
    type_b_to_a: reverse.label,
    distance,
    intensity,
    directional_meaning: {
      a_to_b: forward.meaning,
      b_to_a: reverse.meaning,
    },
    traditional_relation: traditional,
    traditional_relation_hanja: clean(compatibility.relationTypeHan || ""),
  };
}

function elementRelation(aElement, bElement) {
  if (aElement === bElement) return "동류";
  if (SUKUYO_ELEMENT_CREATE[aElement] === bElement || SUKUYO_ELEMENT_CREATE[bElement] === aElement) return "상생";
  if (SUKUYO_ELEMENT_CONTROL[aElement] === bElement || SUKUYO_ELEMENT_CONTROL[bElement] === aElement) return "상극";
  return "보완";
}

function clampSukuyoAreaScore(value) {
  return Math.max(12, Math.min(18, Math.round(Number(value) || 15)));
}

function normalizeSukuyoScoreTotal(scores) {
  const keys = ["destiny", "harmony", "emotion", "growth", "stability"];
  const normalized = {};
  keys.forEach((key) => {
    normalized[key] = clampSukuyoAreaScore(scores[key]);
  });
  let total = keys.reduce((sum, key) => sum + normalized[key], 0);
  while (total > 80) {
    const key = keys.find((name) => normalized[name] > 14);
    if (!key) break;
    normalized[key] -= 1;
    total -= 1;
  }
  while (total < 70) {
    const key = keys.find((name) => normalized[name] < 16);
    if (!key) break;
    normalized[key] += 1;
    total += 1;
  }
  normalized.total = total;
  return normalized;
}

function buildSukuyoScoreMeta(personA, personB, relation, compatibility = {}) {
  const harmonyType = elementRelation(personA.element, personB.element);
  const distance = Number(relation.distance) || 0;
  const chemistryScore = Number(compatibility.chemistryScore || 75);
  const stabilityScore = Number(compatibility.stabilityScore || 74);
  const relationBoost = relation.intensity === "강렬" ? 1 : relation.intensity === "잔잔" ? -1 : 0;
  return normalizeSukuyoScoreTotal({
    destiny: 15 + relationBoost + (distance === 0 ? 2 : distance <= 4 ? 1 : 0),
    harmony: 15 + (harmonyType === "상생" ? 2 : harmonyType === "동류" ? 1 : harmonyType === "상극" ? -2 : 0),
    emotion: 15 + (personA.yin_yang !== personB.yin_yang ? 1 : 0) + (personA.guardian === personB.guardian ? 1 : 0) - (distance >= 9 ? 1 : 0),
    growth: 15 + (["괴(壞)", "위(危)", "원(怨)"].includes(relation.type_a_to_b) ? 2 : 0) + (chemistryScore >= 82 ? 1 : 0),
    stability: 15 + (stabilityScore >= 82 ? 2 : stabilityScore <= 66 ? -2 : 0) - (relation.intensity === "강렬" ? 1 : 0),
  });
}

function buildSukuyoPromptPersonMeta(person = {}, sukuyo = {}) {
  const element = normalizeSukuyoFiveElement(sukuyo.element);
  return {
    name: clean(person.name || "나", 80),
    sukuyo: shukuName(sukuyo),
    sukuyo_hanja: sukuyoHanjaName(sukuyo),
    group: sukuyoGroup(sukuyo),
    element,
    yin_yang: sukuyoYinYang(sukuyo),
    guardian: sukuyoGuardian(sukuyo),
    keyword: sukuyoKeyword(sukuyo),
  };
}

function buildSukuyoCompatibilityJsonSchema(input, calculation) {
  const personA = buildSukuyoPromptPersonMeta(input.personA, calculation.personASukuyo);
  const personB = buildSukuyoPromptPersonMeta(input.personB, calculation.personBSukuyo);
  const relation = buildCompatibilityRelationMeta(calculation.compatibility);
  const scores = buildSukuyoScoreMeta(personA, personB, relation, calculation.compatibility);
  return {
    meta: {
      person_a: personA,
      person_b: personB,
      relation: {
        type_a_to_b: relation.type_a_to_b,
        type_b_to_a: relation.type_b_to_a,
        distance: relation.distance,
        intensity: relation.intensity,
      },
      scores,
    },
    sections: Object.fromEntries(SUKUYO_SECTION_SPECS.map((section) => [section.key, {
      title: section.title,
      minChars: section.minChars,
      guide: section.guide,
      body: `최소 ${section.minChars.toLocaleString("ko-KR")}자 상담문`,
    }])),
  };
}

function buildSukuyoCompatibilityPromptContext(input, calculation) {
  const season = currentKstSeason();
  const personAElement = normalizeSukuyoFiveElement(calculation.personASukuyo?.element);
  const personBElement = normalizeSukuyoFiveElement(calculation.personBSukuyo?.element);
  return {
    user_input: {
      relationshipType: input.relationshipType,
      topic: input.topic,
      question: input.question,
    },
    calculation: {
      personA: {
        ...buildSukuyoPromptPersonMeta(input.personA, calculation.personASukuyo),
        index: calculation.personASukuyo?.index,
        lunarMonth: calculation.personASukuyo?.lunarMonth,
        lunarDay: calculation.personASukuyo?.lunarDay,
        degree_strength: sukuyoDegreeStrength(calculation.personASukuyo),
        seasonal_strength: seasonalStrength(personAElement, season),
        keywords: calculation.personASukuyo?.keywords,
        strengths: calculation.personASukuyo?.strengths,
        shadows: calculation.personASukuyo?.shadows,
      },
      personB: {
        ...buildSukuyoPromptPersonMeta(input.personB, calculation.personBSukuyo),
        index: calculation.personBSukuyo?.index,
        lunarMonth: calculation.personBSukuyo?.lunarMonth,
        lunarDay: calculation.personBSukuyo?.lunarDay,
        degree_strength: sukuyoDegreeStrength(calculation.personBSukuyo),
        seasonal_strength: seasonalStrength(personBElement, season),
        keywords: calculation.personBSukuyo?.keywords,
        strengths: calculation.personBSukuyo?.strengths,
        shadows: calculation.personBSukuyo?.shadows,
      },
      relation: buildCompatibilityRelationMeta(calculation.compatibility),
      relationLogic: {
        guide: "관계 유형은 두 본명숙 사이의 방향별 거리로 확정된 값이다. 아래 12유형 정의를 유형 이름과 함께 논거로 인용하고, 정의에 없는 의미를 지어내지 않는다.",
        definitions: SUKUYO_RELATION_12.map((item) => ({ type: `${item.name}(${item.han})`, meaning: item.meaning })),
      },
      traditionalCompatibility: calculation.compatibility,
      elementHarmony: {
        personAElement,
        personBElement,
        relation: elementRelation(personAElement, personBElement),
      },
      timing: {
        currentSeason: season,
        nextThreeToSixMonths: "현재 계절을 기준으로 앞으로 3~6개월의 주의 시기와 좋은 시기를 서술",
      },
    },
  };
}

function calculateSukuyo(input) {
  const personASukuyo = calculatePersonSukuyo(input.personA, "personA");
  if (input.consultationType === "personal") {
    return {
      personASukuyo,
      personBSukuyo: null,
      compatibility: null,
      sukuyoResult: {
        personAShuku: shukuName(personASukuyo),
        personBShuku: "개인 상담",
        relationType: "본명숙",
        distance: "",
        distanceLabel: "",
        direction: "",
        forwardDistance: null,
        reverseDistance: null,
      },
    };
  }
  const personBSukuyo = calculatePersonSukuyo(input.personB, "personB");
  const compatibility = buildSukuyoAiCompatibility(personASukuyo, personBSukuyo);
  const relationType = clean(compatibility.relationType || "명");
  return {
    personASukuyo,
    personBSukuyo,
    compatibility,
    sukuyoResult: {
      personAShuku: shukuName(personASukuyo),
      personBShuku: shukuName(personBSukuyo),
      relationType,
      distance: normalizeDistance(compatibility),
      distanceLabel: clean(compatibility.distanceLabel || compatibility.distanceMetrics?.distanceLabel),
      direction: [compatibility.directionFromAToB, compatibility.directionFromBToA].map(clean).filter(Boolean).join(" / "),
      forwardDistance: Number.isFinite(Number(compatibility.forwardDistance)) ? Number(compatibility.forwardDistance) : null,
      reverseDistance: Number.isFinite(Number(compatibility.reverseDistance)) ? Number(compatibility.reverseDistance) : null,
    },
  };
}

function textToBytes(text) {
  return new TextEncoder().encode(text);
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToText(value) {
  const padded = String(value || "").replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (String(value || "").length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function sha256Text(text) {
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", textToBytes(text))));
}

function tokenSecret(env = {}) {
  return clean(env.SUKUYO_COMPAT_AI_ACCESS_SECRET || env.JWT_ACCESS_SECRET || env.AUTH_SECRET || "dev-sukuyo-compat-ai-secret");
}

async function signTokenPayload(env, payload) {
  const body = bytesToBase64Url(textToBytes(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey("raw", textToBytes(tokenSecret(env)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, textToBytes(body));
  return `${body}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

async function verifyToken(env, token) {
  try {
    const [body, signature] = clean(token).split(".");
    if (!body || !signature) return null;
    const parsed = JSON.parse(base64UrlToText(body));
    const expected = await signTokenPayload(env, parsed);
    if (expected !== `${body}.${signature}`) return null;
    if (Number(parsed.exp || 0) < Date.now()) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

async function inputHash(input) {
  return sha256Text(JSON.stringify({
    consultationType: input.consultationType,
    personA: input.personA,
    personB: input.consultationType === "compatibility" ? input.personB : null,
    relationshipType: input.relationshipType,
    topic: input.topic,
    question: input.question,
  }));
}

function mapAccessType(decision = {}, user = {}) {
  if (clean(user.role).toLowerCase() === "admin") return "admin";
  const source = clean(decision.accessSource).toLowerCase();
  const reason = clean(decision.reason).toLowerCase();
  const license = clean(decision.licenseType).toLowerCase();
  if (source.includes("monthly") || license.includes("monthly") || reason.includes("monthly")) return "subscription";
  if (source.includes("paid") || license.includes("single") || reason.includes("already_purchased")) return "paid";
  return "pass";
}

function buildPaymentPayload(idempotencyKey) {
  return {
    provider: "PORTONE_V2",
    featureKey: FEATURE_KEY,
    title: COMPATIBILITY_TITLE,
    reason: COMPATIBILITY_TITLE,
    orderName: COMPATIBILITY_TITLE,
    amountKRW: AMOUNT_KRW,
    coinPrice: COIN_PRICE,
    currency: "KRW",
    allowedPaymentModes: ["pass", "monthly", "direct"],
    membershipCreditCost: COIN_PRICE * 10,
    requestId: idempotencyKey,
    idempotencyKey,
    checkoutEndpoint: "/api/billing/checkout",
    confirmEndpoint: "/api/billing/confirm",
    runtimeGate: {
      title: COMPATIBILITY_TITLE,
      reason: COMPATIBILITY_TITLE,
      featureKey: FEATURE_KEY,
      categoryKey: "premium-consultation",
      subFeatureKey: FEATURE_KEY,
      serviceKey: FEATURE_KEY,
      cost: COIN_PRICE,
      coinPrice: COIN_PRICE,
      amountKRW: AMOUNT_KRW,
      amountKrw: AMOUNT_KRW,
      allowedPaymentModes: ["pass", "monthly", "direct"],
      membershipCreditCost: COIN_PRICE * 10,
      requestId: idempotencyKey,
      idempotencyKey,
    },
  };
}

async function resolveUser(auth, env) {
  await connectDb(env);
  return User.findById(auth.userId).select("role").lean();
}

function paymentIdFromBody(body = {}) {
  const billingGate = body.billingGate && typeof body.billingGate === "object" ? body.billingGate : {};
  const payment = body.payment && typeof body.payment === "object" ? body.payment : {};
  const accessGrant = body.accessGrant && typeof body.accessGrant === "object" ? body.accessGrant : billingGate.accessGrant && typeof billingGate.accessGrant === "object" ? billingGate.accessGrant : {};
  const consume = body.consume && typeof body.consume === "object" ? body.consume : billingGate.consume && typeof billingGate.consume === "object" ? billingGate.consume : {};
  return clean(
    body.paymentId
      || body.transactionId
      || body.purchaseId
      || body.ledgerId
      || body.impUid
      || body.merchantUid
      || billingGate.paymentId
      || billingGate.transactionId
      || billingGate.purchaseId
      || billingGate.ledgerId
      || payment.paymentId
      || payment.impUid
      || payment.merchantUid
      || accessGrant.paymentId
      || accessGrant.purchaseId
      || accessGrant.transactionId
      || accessGrant.ledgerId
      || accessGrant.evidenceId
      || consume.paymentId
      || consume.purchaseId
      || consume.transactionId
      || consume.ledgerId,
    160,
  );
}

async function hasPaidPayment(env, auth, paymentId) {
  if (!paymentId) return false;
  await connectDb(env);
  const payment = await Payment.exists({
    userId: auth.userId,
    $or: [
      { impUid: paymentId },
      { merchantUid: paymentId },
      { requestId: paymentId },
      { idempotencyKey: paymentId },
    ],
    featureKey: FEATURE_KEY,
    paymentType: "digital_content",
    status: { $in: ["paid", "success", "fulfilled"] },
  });
  return Boolean(payment);
}

function collectBillingEvidenceIds(body = {}) {
  const ids = new Set();
  const add = (value) => {
    const id = clean(value, 180);
    if (id) ids.add(id);
  };
  const billingGate = body.billingGate && typeof body.billingGate === "object" ? body.billingGate : {};
  const payment = body.payment && typeof body.payment === "object" ? body.payment : {};
  const accessGrant = body.accessGrant && typeof body.accessGrant === "object" ? body.accessGrant : billingGate.accessGrant && typeof billingGate.accessGrant === "object" ? billingGate.accessGrant : {};
  const consume = body.consume && typeof body.consume === "object" ? body.consume : billingGate.consume && typeof billingGate.consume === "object" ? billingGate.consume : {};
  const sources = [
    body.paymentId,
    body.transactionId,
    body.purchaseId,
    body.ledgerId,
    body.requestId,
    body.idempotencyKey,
    body.orderId,
    billingGate.paymentId,
    billingGate.transactionId,
    billingGate.purchaseId,
    billingGate.ledgerId,
    billingGate.requestId,
    billingGate.idempotencyKey,
    payment.paymentId,
    payment.impUid,
    payment.merchantUid,
    payment.transactionId,
    payment.purchaseId,
    payment.requestId,
    accessGrant.paymentId,
    accessGrant.purchaseId,
    accessGrant.transactionId,
    accessGrant.ledgerId,
    accessGrant.evidenceId,
    accessGrant.requestId,
    consume.paymentId,
    consume.purchaseId,
    consume.transactionId,
    consume.ledgerId,
    consume.evidenceId,
    consume.requestId,
  ];
  sources.forEach(add);
  return [...ids];
}

function isObjectIdLike(value) {
  return /^[a-f0-9]{24}$/i.test(String(value || ""));
}

function buildPointHistoryEvidenceQuery(ids) {
  const or = [];
  ids.forEach((id) => {
    or.push(
      { "metadata.requestId": id },
      { "metadata.purchaseId": id },
      { "metadata.idempotencyKey": id },
      { "metadata.orderId": id },
      { "metadata.transactionId": id },
      { "metadata.ledgerId": id },
      { "metadata.evidenceId": id },
      { impUid: id },
      { merchantUid: id },
    );
    if (isObjectIdLike(id)) or.push({ _id: id }, { paymentId: id });
  });
  return or;
}

function buildMonthlyLedgerEvidenceQuery(ids) {
  const or = [];
  ids.forEach((id) => {
    or.push(
      { sourceId: id },
      { "metadata.requestId": id },
      { "metadata.purchaseId": id },
      { "metadata.idempotencyKey": id },
      { "metadata.orderId": id },
      { "metadata.pointHistoryId": id },
      { "metadata.transactionId": id },
      { "metadata.ledgerId": id },
      { "metadata.evidenceId": id },
    );
    if (isObjectIdLike(id)) or.push({ _id: id });
  });
  return or;
}

async function resolveBillingUsageEvidence(env, auth, body = {}) {
  const ids = collectBillingEvidenceIds(body);
  if (!ids.length) return null;
  await connectDb(env);
  const pointOr = buildPointHistoryEvidenceQuery(ids);
  const pointHistory = pointOr.length
    ? await PointHistory.findOne({
      userId: auth.userId,
      kind: "deduct",
      featureKey: FEATURE_KEY,
      $and: [
        { $or: pointOr },
        {
          $or: [
            { "metadata.accessType": { $in: ["membership_credit", "membership_pass", "family", "coin", "single_purchase"] } },
            { "metadata.transactionType": { $in: ["membership_credit", "membership_pass", "family_pass", "coin", "single_purchase"] } },
            { "metadata.accessMethod": { $in: ["MONTHLY", "PASS", "FAMILY", "COIN", "DIRECT_KRW"] } },
            { "metadata.paymentMethod": { $in: ["MONTHLY", "PASS", "FAMILY", "COIN", "DIRECT_KRW"] } },
          ],
        },
      ],
    }).select("_id metadata").lean()
    : null;
  if (pointHistory) {
    const accessType = clean(pointHistory?.metadata?.accessType).toLowerCase();
    return {
      ok: true,
      accessType: accessType === "membership_credit" ? "subscription" : accessType === "membership_pass" || accessType === "family" ? "pass" : "paid",
      paymentId: String(pointHistory._id || paymentIdFromBody(body) || ""),
    };
  }
  const ledgerOr = buildMonthlyLedgerEvidenceQuery(ids);
  const ledger = ledgerOr.length
    ? await MonthlyCreditLedger.findOne({
      userId: auth.userId,
      type: "MONTHLY_CREDIT_SPEND",
      serviceKey: FEATURE_KEY,
      $or: ledgerOr,
    }).select("_id metadata").lean()
    : null;
  if (ledger) {
    return { ok: true, accessType: "subscription", paymentId: String(ledger._id || paymentIdFromBody(body) || "") };
  }
  return null;
}

async function handleEnsureAccess(request, env) {
  const body = await readJson(request);
  const idempotencyKey = normalizeId(body.idempotencyKey || request.headers.get("idempotency-key") || `sukuyo-ai-${Date.now().toString(36)}`);
  logSukyoAi("[Sukyo AI LLM Prepare Start]", {
    route: "/api/sukuyo-compatibility-ai/prepare",
    requestId: idempotencyKey,
    consultationType: normalizeConsultationType(body.consultationType || body.type),
  });
  let auth = null;
  try {
    auth = await requireAuth(request, env);
  } catch (_) {
    return json({ ok: false, reason: "LOGIN_REQUIRED" }, { status: 401 });
  }
  const normalized = normalizeInput(body);
  logSukyoAi("[Sukyo AI LLM Payload Validated]", {
    route: "/api/sukuyo-compatibility-ai/prepare",
    requestId: idempotencyKey,
    consultationType: normalized.consultationType,
    validation: { ok: normalized.ok, errors: normalized.errors },
    personA: normalized.personA,
    personB: normalized.consultationType === "compatibility" ? normalized.personB : null,
  });
  if (!normalized.ok) return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput, errors: normalized.errors }, { status: 422 });
  logSukyoAi("[Sukyo AI LLM Access Check Start]", {
    route: "/api/sukuyo-compatibility-ai/prepare",
    requestId: idempotencyKey,
    consultationType: normalized.consultationType,
  });
  const user = await resolveUser(auth, env);
  const accessHash = await inputHash(normalized);
  if (clean(user?.role).toLowerCase() === "admin") {
    logSukyoAi("[Sukyo AI LLM Access Check Success]", {
      route: "/api/sukuyo-compatibility-ai/prepare",
      requestId: idempotencyKey,
      consultationType: normalized.consultationType,
      accessGranted: true,
      accessType: "admin",
    });
    return json({
      ok: true,
      accessToken: await signTokenPayload(env, { userId: String(auth.userId), accessType: "admin", inputHash: accessHash, idempotencyKey, exp: Date.now() + TOKEN_TTL_MS }),
      accessType: "admin",
    });
  }
  const decision = await canAccessPaidFeature(auth.userId, FEATURE_KEY, { env, reason: TITLE });
  if (decision.allowed) {
    const accessType = mapAccessType(decision, user || {});
    logSukyoAi("[Sukyo AI LLM Access Check Success]", {
      route: "/api/sukuyo-compatibility-ai/prepare",
      requestId: idempotencyKey,
      consultationType: normalized.consultationType,
      accessGranted: true,
      accessType,
    });
    return json({
      ok: true,
      accessToken: await signTokenPayload(env, { userId: String(auth.userId), accessType, inputHash: accessHash, idempotencyKey, exp: Date.now() + TOKEN_TTL_MS }),
      accessType,
    });
  }
  logSukyoAi("[Sukyo AI LLM Access Check Success]", {
    route: "/api/sukuyo-compatibility-ai/prepare",
    requestId: idempotencyKey,
    consultationType: normalized.consultationType,
    accessGranted: false,
  });
  return json({ ok: false, reason: "PAYMENT_REQUIRED", paymentPayload: buildPaymentPayload(idempotencyKey) }, { status: 402 });
}

async function resolveStartAccess(request, env, auth, body, normalized, accessHash) {
  const token = clean(body.accessToken || body.access_token);
  const tokenPayload = token ? await verifyToken(env, token) : null;
  if (
    tokenPayload
    && tokenPayload.userId === String(auth.userId)
    && tokenPayload.inputHash === accessHash
    && (!tokenPayload.idempotencyKey || tokenPayload.idempotencyKey === normalizeId(body.idempotencyKey || request.headers.get("idempotency-key")))
  ) {
    return { ok: true, accessType: tokenPayload.accessType || "pass", paymentId: "" };
  }
  const user = await resolveUser(auth, env);
  const decision = await canAccessPaidFeature(auth.userId, FEATURE_KEY, { env, reason: TITLE });
  if (decision.allowed) return { ok: true, accessType: mapAccessType(decision, user || {}), paymentId: paymentIdFromBody(body) };
  const billingEvidence = await resolveBillingUsageEvidence(env, auth, body);
  if (billingEvidence?.ok) return billingEvidence;
  const paidPaymentId = paymentIdFromBody(body);
  if (await hasPaidPayment(env, auth, paidPaymentId)) return { ok: true, accessType: "paid", paymentId: paidPaymentId };
  return { ok: false };
}

function buildFirstPrompt(input, calculation) {
  const personal = input.consultationType === "personal";
  if (!personal) {
    const schema = buildSukuyoCompatibilityJsonSchema(input, calculation);
    const sectionGuide = SUKUYO_SECTION_SPECS
      .map((section, index) => `${index + 1}. ${section.title} / 최소 ${section.minChars.toLocaleString("ko-KR")}자: ${section.guide}`)
      .join("\n");
    return [
      "아래 숙요점 계산값만 근거로 두 사람의 숙요 궁합 상담 JSON을 작성하십시오.",
      "본명숙 산출, 관계 거리, 양방향 관계 유형, 기질 속성, 점수는 이미 확정된 값입니다.",
      "반환 JSON의 meta 값은 [반환 JSON 뼈대]와 정확히 같아야 하며, sections.*.title도 뼈대 title 그대로 유지합니다.",
      `sections.*.body만 전문 숙요점 상담문으로 채우며, body 합계는 공백 포함 ${SUKUYO_COMPATIBILITY_TARGET_MIN_CHARS.toLocaleString("ko-KR")}~${SUKUYO_COMPATIBILITY_TARGET_MAX_CHARS.toLocaleString("ko-KR")}자 사이가 되어야 합니다.`,
      "각 body는 3~5개 소단락으로 나누고, 마크업은 **굵게**, 번호 목록, 하이픈 목록, 인용(> ) 네 가지만 사용합니다.",
      "각 body는 그 섹션 주제와 관련된 계산 근거(관계 유형 정의, 방향별 거리, 오행 상생·상극, 숙 그룹, 음양)를 최소 1회 인용해 논거로 삼고, 근거 없는 찬사 문장은 쓰지 않습니다.",
      "서사는 '운명적 끌림'(관계 유형·거리·상생 근거)과 '현실적 조율'(상극·그룹 차이·음양 과제)의 두 축을 오가며 짭니다.",
      "모든 body에는 구체적 상황 묘사, 실제 대화체 예시, 체크리스트 또는 번호 행동 지침, 시기별 전망 중 최소 2가지 이상을 넣습니다.",
      "갈등, 금기, 대화법, 위기, 장기 전망은 추상어가 아니라 실제 말투와 행동으로 풀어야 합니다.",
      "같은 비유와 같은 첫 문장 구조를 반복하지 마세요.",
      "마지막 moonLetter.body의 마지막 문장은 반드시 두 사람의 이름을 모두 불러 따뜻하게 마무리하세요.",
      "",
      "[섹션별 최소 분량과 요구]",
      sectionGuide,
      "JSON 외 다른 텍스트를 절대 포함하지 마세요.",
      "",
      "[숙요점 계산 context]",
      JSON.stringify(buildSukuyoCompatibilityPromptContext(input, calculation), null, 2),
      "",
      "[반환 JSON 뼈대]",
      JSON.stringify(schema, null, 2),
    ].join("\n");
  }
  return [
    "아래 계산 데이터만 근거로 숙요점 AI 첫 상담 답변을 작성하세요.",
    "없는 사실을 지어내지 말고, 계산된 27숙과 관계 유형을 중심으로 말하세요.",
    "",
    "[사용자 입력]",
    `- 상담 유형: ${personal ? "개인 상담" : "궁합 상담"}`,
    `- 사용자: ${input.personA.name || "나"} · 성별 ${input.personA.gender || "미입력"} · ${input.personA.birthDate} · ${input.personA.calendarType === "lunar" ? "음력" : "양력"} · 출생시간 ${input.personA.birthTime || "미입력"}`,
    personal ? "" : `- 상대방: ${input.personB.name || "상대"} · 성별 ${input.personB.gender || "미입력"} · ${input.personB.birthDate} · ${input.personB.calendarType === "lunar" ? "음력" : "양력"} · 출생시간 ${input.personB.birthTime || "미입력"}`,
    `- 관계 유형: ${input.relationshipType}`,
    `- 상담 주제: ${input.topic}`,
    `- 사용자의 현재 질문: ${input.question}`,
    "",
    "[숙요점 계산 결과]",
    JSON.stringify({
      personA: {
        shuku: calculation.sukuyoResult.personAShuku,
        index: calculation.personASukuyo.index,
        keywords: calculation.personASukuyo.keywords,
        strengths: calculation.personASukuyo.strengths,
        shadows: calculation.personASukuyo.shadows,
      },
      personB: personal ? null : {
        shuku: calculation.sukuyoResult.personBShuku,
        index: calculation.personBSukuyo.index,
        keywords: calculation.personBSukuyo.keywords,
        strengths: calculation.personBSukuyo.strengths,
        shadows: calculation.personBSukuyo.shadows,
      },
      relation: calculation.sukuyoResult,
      compatibility: calculation.compatibility,
    }, null, 2),
    "",
    "첫 답변은 Markdown으로 작성하되 다음 흐름을 자연스럽게 모두 포함하세요.",
    "오늘의 달빛 결론, 나의 본명숙, 숙요점 기질, 현재 질문의 흐름, 지금 가장 강하게 작용하는 감정 패턴, 가까운 시기의 변화 가능성, 조심해야 할 관계 습관, 오늘의 행동 처방, 마지막 한 줄 조언.",
    personal ? "" : "궁합 상담이므로 상대방의 본명숙, 관계의 별자리, 관계 거리 또는 관계 유형, 두 사람의 관계 흐름도 반드시 포함하세요.",
  ].filter(Boolean).join("\n");
}

function buildSukuyoCompatibilityRepairPrompt(input, calculation, previousText, reason) {
  const schema = buildSukuyoCompatibilityJsonSchema(input, calculation);
  const sectionGuide = SUKUYO_SECTION_SPECS
    .map((section, index) => `${index + 1}. ${section.title} / 최소 ${section.minChars.toLocaleString("ko-KR")}자: ${section.guide}`)
    .join("\n");
  return [
    "이전 숙요점 궁합 상담 JSON은 분량 또는 구조 점검을 통과하지 못했습니다.",
    "같은 계산값만 근거로 JSON을 다시 작성하십시오.",
    "반환 JSON의 meta와 sections.*.title은 [반환 JSON 뼈대]와 정확히 같아야 합니다.",
    `sections.*.body 합계는 공백 포함 ${SUKUYO_COMPATIBILITY_TARGET_MIN_CHARS.toLocaleString("ko-KR")}~${SUKUYO_COMPATIBILITY_TARGET_MAX_CHARS.toLocaleString("ko-KR")}자 사이, 각 body는 지정 최소 글자수를 반드시 넘겨야 합니다.`,
    "반복 문장으로 분량을 채우지 말고 구체적 장면, 실제 대사, 행동 지침, 시기별 전망을 보강하십시오.",
    "JSON 외 다른 텍스트를 절대 포함하지 마세요.",
    "",
    "[점검 실패 사유]",
    clean(reason?.message || reason, 800),
    "",
    "[섹션별 최소 분량과 요구]",
    sectionGuide,
    "",
    "[숙요점 계산 context]",
    JSON.stringify(buildSukuyoCompatibilityPromptContext(input, calculation), null, 2),
    "",
    "[반환 JSON 뼈대]",
    JSON.stringify(schema, null, 2),
    "",
    "[이전 출력]",
    clean(previousText, 45000),
  ].join("\n");
}

function sanitizeConsultationText(text) {
  let result = clean(text, 60000);
  for (const pattern of FORBIDDEN_RESULT_PATTERNS) result = result.replace(pattern, "");
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

function parseJsonObjectFromText(text) {
  const normalized = String(text || "").replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(normalized.slice(start, end + 1));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

function normalizeStructuredSukuyoCompatibilityText(text, input, calculation) {
  const parsed = parseJsonObjectFromText(text);
  if (!parsed) {
    throw Object.assign(new Error("숙요점 궁합 상담 JSON을 읽지 못했습니다."), { code: "LLM_FAILED", status: 503 });
  }
  const expected = buildSukuyoCompatibilityJsonSchema(input, calculation);
  const sourceSections = parsed.sections && typeof parsed.sections === "object" ? parsed.sections : {};
  const sections = {};
  let totalChars = 0;
  for (const section of SUKUYO_SECTION_SPECS) {
    const rawBody = cleanRichText(sourceSections[section.key]?.body);
    // 상한 초과 시 문장 중간이 아니라 마지막 문장 경계에서 자른다.
    let body = rawBody;
    if (rawBody.length > 5200) {
      const sliced = rawBody.slice(0, 5200);
      const boundary = Math.max(sliced.lastIndexOf("다."), sliced.lastIndexOf("요."), sliced.lastIndexOf(".\n"), sliced.lastIndexOf("!"), sliced.lastIndexOf("?"));
      body = boundary > section.minChars ? sliced.slice(0, boundary + 2).trim() : sliced;
    }
    // 경량 보장 계약: 짧은 섹션이라도 버리지 않고 그대로 담는다(아래에서 전체 분량만 최종 판정).
    totalChars += body.length;
    sections[section.key] = { title: section.title, body };
  }
  // 전체 본문이 사실상 비어 있을 때만(재시도로 회복 가능) 실패 신호. 그 외에는 다소 짧아도 결과를 전달한다.
  if (totalChars < 600) {
    throw Object.assign(new Error(`숙요점 궁합 상담 전체 본문이 부족합니다.`), { code: "LLM_FAILED", status: 503 });
  }
  return JSON.stringify({
    meta: expected.meta,
    sections,
  }, null, 2);
}

async function createFirstAnswer(env, input, calculation) {
  logSukyoAi("[Sukyo AI LLM Generate Start]", {
    route: "/api/sukuyo-compatibility-ai/generate",
    requestId: input.idempotencyKey,
    consultationType: input.consultationType,
  });
  // 궁합 상담 JSON 요구 분량(body 합계 ~11,300자)이 구 상한을 넘겨 잘리지 않도록 여유를 둔 상한.
  const compatibilityMaxOutputTokens = Number(env.SUKUYO_COMPAT_AI_MAX_OUTPUT_TOKENS || 32000);
  // PREMIUM_GEMINI_TIMEOUT_MS(45s)를 참조하면 truthy 단락으로 기본값이 죽어 대량 JSON 생성이
  // 45초에 타임아웃 → LLM_FAILED 503으로 튕겼다. 궁합 전용 예산을 직접 확보한다.
  // 잘림 재시도 시 토큰 cap이 41,600(32,000×1.3)까지 올라가므로(≈200tok/s ≈ 208s) 150s로 상향.
  const compatibilityTimeoutMs = Number(env.SUKUYO_COMPAT_AI_TIMEOUT_MS) || 150000;
  // 숙요 궁합 초기 상담(자유질문 포함) → 캐시 키가 프롬프트 전체로 잡혀 동일 입력만 히트.
  // 프롬프트 개선 주기를 반영해 TTL 7일. follow-up(handleMessage)은 캐시 대상 아님.
  const sukuyoLlmCache = {
    store: createLlmCacheStore(env),
    deterministic: true,
    ttlSeconds: 7 * 24 * 60 * 60,
    keyExtra: "sukuyo-compat-ai-v1",
  };
  const isCompatibility = input.consultationType === "compatibility";
  const sukuyoCallOptions = {
    systemPrompt: isCompatibility ? COMPATIBILITY_JSON_SYSTEM_PROMPT : SYSTEM_PROMPT,
    taskType: "fortune",
    temperature: 0.74,
    timeoutMs: isCompatibility ? compatibilityTimeoutMs : (Number(env.SUKUYO_COMPAT_AI_TIMEOUT_MS) || 55000),
    // 궁합은 llama가 못 만드는 대형 JSON이라 Workers AI 폴백은 무의미하다. 폴백을 끊어
    // Gemini 실패 시 즉시 실패시켜 선차감 환급을 빠르게 실행한다.
    ...(isCompatibility ? { fallbackToWorkersAI: false } : {}),
    cache: sukuyoLlmCache,
  };
  // 궁합은 대형 구조화 JSON이라 JSON 모드 + 잘림 반응형 재시도로 첫 생성이 잘리지 않게 보장한다.
  const ai = isCompatibility
    ? await callGeminiJsonWithRetry(env, buildFirstPrompt(input, calculation), {
        ...sukuyoCallOptions,
        baseTokens: compatibilityMaxOutputTokens,
        capTokens: Math.round(compatibilityMaxOutputTokens * 1.3),
        responseMimeType: "application/json",
      })
    : await callGeminiText(env, buildFirstPrompt(input, calculation), {
        ...sukuyoCallOptions,
        maxOutputTokens: 4096,
      });
  let provider = clean(ai?.provider || "");
  let model = clean(ai?.model || "");
  const isMock = /mock/i.test(provider) || /mock/i.test(model) || ai?.isMock === true;
  logSukyoAi("[Sukyo AI LLM Provider Selected]", {
    route: "/api/sukuyo-compatibility-ai/generate",
    requestId: input.idempotencyKey,
    consultationType: input.consultationType,
    providerReason: isMock ? "mock_provider_blocked" : provider || model || "gemini",
  });
  let content = sanitizeConsultationText(ai?.text || "");
  let degraded = false;
  if (ai?.ok && !isMock && input.consultationType === "compatibility") {
    const rawContent = content;
    try {
      content = normalizeStructuredSukuyoCompatibilityText(rawContent, input, calculation);
    } catch (normalizeError) {
      logSukyoAi("[Sukyo AI LLM Repair Start]", {
        route: "/api/sukuyo-compatibility-ai/generate",
        requestId: input.idempotencyKey,
        consultationType: input.consultationType,
        errorMessage: clean(normalizeError?.message || normalizeError, 500),
      });
      let repaired = null;
      try {
        const repair = await callGeminiJsonWithRetry(env, buildSukuyoCompatibilityRepairPrompt(input, calculation, rawContent, normalizeError), {
          systemPrompt: COMPATIBILITY_JSON_SYSTEM_PROMPT,
          taskType: "fortune",
          temperature: 0.72,
          baseTokens: compatibilityMaxOutputTokens,
          capTokens: Math.round(compatibilityMaxOutputTokens * 1.3),
          responseMimeType: "application/json",
          timeoutMs: compatibilityTimeoutMs,
          fallbackToWorkersAI: false,
          cache: sukuyoLlmCache,
        });
        const repairProvider = clean(repair?.provider || "");
        const repairModel = clean(repair?.model || "");
        const repairIsMock = /mock/i.test(repairProvider) || /mock/i.test(repairModel) || repair?.isMock === true;
        if (repair?.ok && !repairIsMock) {
          provider = repairProvider || provider;
          model = repairModel || model;
          repaired = normalizeStructuredSukuyoCompatibilityText(sanitizeConsultationText(repair?.text || ""), input, calculation);
        }
      } catch (repairError) {
        logSukyoAi("[Sukyo AI LLM Repair Failed]", {
          route: "/api/sukuyo-compatibility-ai/generate",
          requestId: input.idempotencyKey,
          consultationType: input.consultationType,
          errorMessage: clean(repairError?.message || repairError, 500),
        });
      }
      if (repaired) {
        content = repaired;
      } else if (hasRenderableLlmText(rawContent, { minChars: 400 })) {
        // 경량 보장 계약: 구조화 파싱이 끝내 실패해도 렌더 가능한 원문이 있으면 버리지 않는다.
        // 원문(잘린 JSON 포함)을 그대로 전달하면 프론트가 looksLikeRawJson 복구로 읽어낸다.
        content = rawContent;
        degraded = true;
        logSukyoAi("[Sukyo AI LLM Degraded]", {
          route: "/api/sukuyo-compatibility-ai/generate",
          requestId: input.idempotencyKey,
          consultationType: input.consultationType,
          errorMessage: clean(normalizeError?.message || normalizeError, 300),
        });
      } else {
        throw normalizeError;
      }
    }
  }
  if (!ai?.ok || isMock || content.length < 240) {
    const llmError = Object.assign(new Error(MESSAGES.llmFailed), { code: "LLM_FAILED", status: 503 });
    logSukyoAi("[Sukyo AI LLM Error]", {
      route: "/api/sukuyo-compatibility-ai/generate",
      requestId: input.idempotencyKey,
      consultationType: input.consultationType,
      providerReason: isMock ? "mock_provider_blocked" : provider || model || "llm_failed",
      errorMessage: clean(ai?.error || ai?.message || "LLM_FAILED"),
    }, llmError, env);
    throw llmError;
  }
  logSukyoAi("[Sukyo AI LLM Generate Success]", {
    route: "/api/sukuyo-compatibility-ai/generate",
    requestId: input.idempotencyKey,
    consultationType: input.consultationType,
    providerReason: provider || model || "real_llm_success",
  });
  return { content, provider, model, degraded };
}

function serializeConsultation(doc) {
  const raw = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: String(raw._id || raw.id || ""),
    personA: raw.personA,
    personB: raw.personB,
    sukuyoResult: raw.sukuyoResult,
    relationshipType: raw.relationshipType,
    topic: raw.topic,
    accessType: raw.accessType,
    consultationType: raw.relationshipType === "개인 상담" ? "personal" : "compatibility",
    messages: Array.isArray(raw.messages) ? raw.messages : [],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function executionAccessMethod(accessType) {
  if (accessType === "paid") return "single";
  if (accessType === "subscription") return "monthly";
  return "pass";
}

// 선차감(코인/월정석)된 접근에서 생성이 실패하면 차감을 되돌린다.
// vedic-ai.js의 restorePrepaidAccessOnFailure와 동일한 멱등 환급 규약을 따른다.
async function restorePrepaidAccessOnFailure(env, auth, access, error) {
  const accessType = clean(access?.accessType).toLowerCase();
  // 이용권/월정석 커버(pass/family/license)·관리자·토큰 접근은 차감이 없으므로 환급 대상 아님.
  if (!["paid", "subscription"].includes(accessType)) return false;
  const evidenceId = clean(access?.paymentId, 160);
  if (!isObjectIdLike(evidenceId)) return false; // PG 직접결제(merchantUid 문자열)는 재시도로 자가복구되므로 제외.

  const userId = String(auth?.userId || "");
  const now = new Date();
  const failureMessage = clean(error?.message || error || "sukuyo compatibility generation failed", 500);

  try {
    if (accessType === "subscription") {
      const ledger = await MonthlyCreditLedger.findOne({
        _id: evidenceId,
        userId,
        type: "MONTHLY_CREDIT_SPEND",
        serviceKey: FEATURE_KEY,
        "metadata.refundedForServiceExecution": { $ne: true },
      }).lean();
      if (!ledger) return false;
      const refundCredit = Math.max(0, Math.floor(Number(ledger.amount || 0)));
      const marked = await MonthlyCreditLedger.updateOne(
        { _id: ledger._id, userId, "metadata.refundedForServiceExecution": { $ne: true } },
        { $set: { "metadata.refundedForServiceExecution": true, "metadata.serviceExecutionRefundedAt": now, "metadata.serviceExecutionFailureMessage": failureMessage } },
      );
      if (!marked.modifiedCount) return false;
      if (refundCredit > 0) {
        await User.findByIdAndUpdate(userId, {
          $inc: {
            "profileSubscription.membershipCreditBalance": refundCredit,
            "profileSubscription.membershipCreditUsed": -refundCredit,
          },
        }).catch(() => {});
      }
      return true;
    }

    // accessType === "paid" → 코인 PointHistory 차감 역계산.
    const history = await PointHistory.findOne({
      _id: evidenceId,
      userId,
      kind: "deduct",
      featureKey: FEATURE_KEY,
      "metadata.refundedForServiceExecution": { $ne: true },
    }).lean();
    if (!history) return false;
    const refundCoins = Math.max(0, Math.floor(Math.abs(Number(history.delta || history?.metadata?.chargedCoins || COIN_PRICE || 0))));
    const marked = await PointHistory.updateOne(
      { _id: history._id, userId, "metadata.refundedForServiceExecution": { $ne: true } },
      { $set: { "metadata.refundedForServiceExecution": true, "metadata.serviceExecutionRefundedAt": now, "metadata.serviceExecutionFailureMessage": failureMessage } },
    );
    if (!marked.modifiedCount) return false;
    if (refundCoins > 0) {
      const updated = await User.findByIdAndUpdate(userId, { $inc: { points: refundCoins } }, { new: true, projection: { points: 1 } }).lean();
      await PointHistory.create({
        userId,
        kind: "refund",
        delta: refundCoins,
        balanceAfter: Math.max(0, Math.floor(Number(updated?.points || 0))),
        reason: `${COMPATIBILITY_TITLE} 생성 실패 환급`,
        featureKey: FEATURE_KEY,
        metadata: {
          refundedForServiceExecution: true,
          originalPointHistoryId: String(history._id || ""),
          failureMessage,
        },
      }).catch(() => {});
    }
    return true;
  } catch (restoreError) {
    logSukyoAi("[Sukyo AI LLM Refund Failed]", {
      route: "/api/sukuyo-compatibility-ai/generate",
      accessType,
      evidenceId,
      errorMessage: clean(restoreError?.message || restoreError, 300),
    }, restoreError, env);
    return false;
  }
}

async function recordSuccessfulUsage(auth, idempotencyKey, access, consultation, now) {
  const accessMethod = executionAccessMethod(access.accessType);
  await PaidExecutionRecord.findOneAndUpdate(
    {
      userId: String(auth.userId || ""),
      featureId: FEATURE_KEY,
      profileId: "default",
      requestId: idempotencyKey,
    },
    {
      $setOnInsert: {
        executionId: `${FEATURE_KEY}:${auth.userId}:${idempotencyKey}`.slice(0, 160),
        requestId: idempotencyKey,
        userId: String(auth.userId || ""),
        featureId: FEATURE_KEY,
        profileId: "default",
        accessMode: "per_use",
        accessMethod,
        amountCoins: accessMethod === "single" ? COIN_PRICE : 0,
        amountKRW: accessMethod === "single" ? AMOUNT_KRW : 0,
        monthlyDeductedAmount: accessMethod === "monthly" ? COIN_PRICE : 0,
        paymentId: access.paymentId || "",
        orderId: access.paymentId || idempotencyKey,
        consumedAt: now,
        idempotencyKey: `${FEATURE_KEY}:${auth.userId}:${idempotencyKey}`.slice(0, 180),
      },
      $set: {
        status: "completed",
        completedAt: now,
        resultId: String(consultation._id || ""),
        result: {
          consultationId: String(consultation._id || ""),
          featureKey: FEATURE_KEY,
          accessType: access.accessType,
        },
      },
    },
    { upsert: true },
  );
}

async function handleStart(request, env) {
  let auth = null;
  try {
    auth = await requireAuth(request, env);
  } catch (_) {
    return json({ ok: false, reason: "LOGIN_REQUIRED", message: MESSAGES.login }, { status: 401 });
  }
  const body = await readJson(request);
  const normalized = normalizeInput(body);
  const idempotencyKey = normalizeId(body.idempotencyKey || request.headers.get("idempotency-key") || `sukuyo-ai-${Date.now().toString(36)}`);
  logSukyoAi("[Sukyo AI LLM Generate Start]", {
    route: "/api/sukuyo-compatibility-ai/generate",
    requestId: idempotencyKey,
    consultationType: normalized.consultationType,
  });
  logSukyoAi("[Sukyo AI LLM Payload Validated]", {
    route: "/api/sukuyo-compatibility-ai/generate",
    requestId: idempotencyKey,
    consultationType: normalized.consultationType,
    validation: { ok: normalized.ok, errors: normalized.errors },
    personA: normalized.personA,
    personB: normalized.consultationType === "compatibility" ? normalized.personB : null,
  });
  if (!normalized.ok) return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput, errors: normalized.errors }, { status: 422 });
  const lockKey = `${auth.userId}:${idempotencyKey}`;
  if (startLocks.has(lockKey)) return startLocks.get(lockKey);

  const pending = (async () => {
    await connectDb(env);
    const existing = await SukuyoCompatibilityAiConsultation.findOne({ userId: auth.userId, idempotencyKey }).lean();
    if (existing) return json({ ok: true, consultation: serializeConsultation(existing), reused: true });
    const accessHash = await inputHash(normalized);
    logSukyoAi("[Sukyo AI LLM Access Check Start]", {
      route: "/api/sukuyo-compatibility-ai/generate",
      requestId: idempotencyKey,
      consultationType: normalized.consultationType,
    });
    const access = await resolveStartAccess(request, env, auth, body, normalized, accessHash);
    if (!access.ok) {
      logSukyoAi("[Sukyo AI LLM Access Check Success]", {
        route: "/api/sukuyo-compatibility-ai/generate",
        requestId: idempotencyKey,
        consultationType: normalized.consultationType,
        accessGranted: false,
      });
      return json({ ok: false, reason: "PAYMENT_REQUIRED", paymentPayload: buildPaymentPayload(idempotencyKey), message: MESSAGES.paymentRequired }, { status: 402 });
    }
    logSukyoAi("[Sukyo AI LLM Access Check Success]", {
      route: "/api/sukuyo-compatibility-ai/generate",
      requestId: idempotencyKey,
      consultationType: normalized.consultationType,
      accessGranted: true,
      accessType: access.accessType,
    });
    let calculation;
    let firstAnswer;
    try {
      calculation = calculateSukuyo(normalized);
      firstAnswer = await createFirstAnswer(env, { ...normalized, idempotencyKey }, calculation);
    } catch (genError) {
      // 선차감된 코인/월정석이 있으면 되돌린 뒤 에러를 전파한다.
      const restored = await restorePrepaidAccessOnFailure(env, auth, access, genError).catch(() => false);
      logSukyoAi("[Sukyo AI LLM Refund Or Restore]", {
        route: "/api/sukuyo-compatibility-ai/generate",
        requestId: idempotencyKey,
        consultationType: normalized.consultationType,
        restored,
      }, restored ? null : genError, env);
      throw genError;
    }
    const now = new Date();
    const storedPersonB = normalized.consultationType === "personal" ? {
      name: "",
      gender: "unknown",
      birthDate: normalized.personA.birthDate,
      birthTime: "",
      calendarType: normalized.personA.calendarType,
      isLeapMonth: normalized.personA.isLeapMonth,
      shuku: "개인 상담",
      shukuIndex: null,
    } : {
      name: normalized.personB.name,
      gender: normalized.personB.gender,
      birthDate: normalized.personB.birthDate,
      birthTime: normalized.personB.birthTime,
      calendarType: normalized.personB.calendarType,
      isLeapMonth: normalized.personB.isLeapMonth,
      shuku: calculation.sukuyoResult.personBShuku,
      shukuIndex: calculation.personBSukuyo.index,
    };
    try {
      const created = await SukuyoCompatibilityAiConsultation.create({
        userId: auth.userId,
        idempotencyKey,
        personA: {
          name: normalized.personA.name,
          gender: normalized.personA.gender,
          birthDate: normalized.personA.birthDate,
          birthTime: normalized.personA.birthTime,
          calendarType: normalized.personA.calendarType,
          isLeapMonth: normalized.personA.isLeapMonth,
          shuku: calculation.sukuyoResult.personAShuku,
          shukuIndex: calculation.personASukuyo.index,
        },
        personB: storedPersonB,
        sukuyoResult: calculation.sukuyoResult,
        relationshipType: normalized.relationshipType,
        topic: normalized.topic,
        accessType: access.accessType,
        paymentId: access.paymentId || paymentIdFromBody(body),
        messages: [
          { role: "user", content: normalized.question, createdAt: now },
          { role: "assistant", content: firstAnswer.content, createdAt: now },
        ],
        provider: firstAnswer.provider,
        model: firstAnswer.model,
      });
      await recordSuccessfulUsage(auth, idempotencyKey, access, created, now);
      return json({ ok: true, consultation: serializeConsultation(created) });
    } catch (error) {
      if (Number(error?.code) === 11000) {
        const duplicate = await SukuyoCompatibilityAiConsultation.findOne({ userId: auth.userId, idempotencyKey }).lean();
        if (duplicate) return json({ ok: true, consultation: serializeConsultation(duplicate), reused: true });
      }
      throw error;
    }
  })().catch((error) => {
    const status = Number(error?.status || 500);
    const code = clean(error?.code || "SERVER_ERROR");
    const message = code === "LLM_FAILED"
      ? MESSAGES.llmFailed
      : code === "CALCULATION_FAILED"
        ? MESSAGES.calculationFailed
        : MESSAGES.serverFailed;
    logSukyoAi("[Sukyo AI LLM Error]", {
      route: "/api/sukuyo-compatibility-ai/generate",
      requestId: idempotencyKey,
      consultationType: normalized.consultationType,
      errorMessage: clean(error?.message || ""),
    }, error, env);
    return json({ ok: false, reason: code, message }, { status: status >= 400 && status < 600 ? status : 500 });
  }).finally(() => {
    startLocks.delete(lockKey);
  });
  startLocks.set(lockKey, pending);
  return pending;
}

function buildFollowupPrompt(consultation, userMessage) {
  return [
    "아래 기존 숙요점 궁합 상담 맥락을 이어서 답변하세요.",
    "계산된 27숙과 관계 유형을 바꾸지 마세요.",
    "상대방의 마음을 확정하지 말고, 건강한 관계 선택을 돕는 상담으로 답하세요.",
    "",
    "[숙요점 계산 요약]",
    JSON.stringify({
      personA: consultation.personA,
      personB: consultation.personB,
      sukuyoResult: consultation.sukuyoResult,
      relationshipType: consultation.relationshipType,
      topic: consultation.topic,
    }, null, 2),
    "",
    "[최근 상담 흐름]",
    (consultation.messages || []).slice(-6).map((item) => `${item.role}: ${clean(item.content, 1800)}`).join("\n\n"),
    "",
    `[사용자 추가 질문]\n${userMessage}`,
  ].join("\n");
}

async function handleMessage(request, env) {
  let auth = null;
  try {
    auth = await requireAuth(request, env);
  } catch (_) {
    return json({ ok: false, reason: "LOGIN_REQUIRED", message: MESSAGES.login }, { status: 401 });
  }
  const body = await readJson(request);
  const sessionId = clean(body.sessionId || body.consultationId || body.id);
  const content = clean(body.message || body.content || body.question, 1600);
  if (!/^[0-9a-f]{24}$/i.test(sessionId) || content.length < 2) {
    return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput }, { status: 422 });
  }
  await connectDb(env);
  const consultation = await SukuyoCompatibilityAiConsultation.findOne({ _id: sessionId, userId: auth.userId });
  if (!consultation) return json({ ok: false, reason: "NOT_FOUND", message: "상담 내역을 찾지 못했습니다." }, { status: 404 });
  const ai = await callGeminiText(env, buildFollowupPrompt(consultation, content), {
    systemPrompt: SYSTEM_PROMPT,
    taskType: "fortune",
    temperature: 0.72,
    maxOutputTokens: 2600,
    timeoutMs: Number(env.SUKUYO_COMPAT_AI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 55000),
  });
  const provider = clean(ai?.provider || "");
  const model = clean(ai?.model || "");
  const isMock = /mock/i.test(provider) || /mock/i.test(model) || ai?.isMock === true;
  const answer = sanitizeConsultationText(ai?.text || "");
  if (!ai?.ok || isMock || answer.length < 80) {
    logSukyoAi("[Sukyo AI LLM Error]", {
      route: "/api/sukuyo-compatibility-ai/message",
      requestId: sessionId,
      consultationType: consultation.relationshipType === "개인 상담" ? "personal" : "compatibility",
      providerReason: isMock ? "mock_provider_blocked" : provider || model || "llm_failed",
      errorMessage: clean(ai?.error || ai?.message || "LLM_FAILED"),
    }, null, env);
    return json({ ok: false, reason: "LLM_FAILED", message: MESSAGES.llmFailed }, { status: 503 });
  }
  const now = new Date();
  consultation.messages.push({ role: "user", content, createdAt: now });
  consultation.messages.push({ role: "assistant", content: answer, createdAt: now });
  consultation.provider = provider || consultation.provider;
  consultation.model = model || consultation.model;
  await consultation.save();
  return json({ ok: true, consultation: serializeConsultation(consultation), message: { role: "assistant", content: answer, createdAt: now } });
}

async function handleResult(request, env) {
  let auth = null;
  try {
    auth = await requireAuth(request, env);
  } catch (_) {
    return json({ ok: false, reason: "LOGIN_REQUIRED", message: MESSAGES.login }, { status: 401 });
  }
  const url = new URL(request.url);
  const sessionId = clean(url.searchParams.get("id") || url.searchParams.get("sessionId"), 60);

  await connectDb(env);
  if (!sessionId) {
    const rows = await SukuyoCompatibilityAiConsultation.find({ userId: auth.userId })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select("personA.name personA.shuku personB.name personB.shuku sukuyoResult.relationType relationshipType createdAt updatedAt")
      .lean();
    return json({
      ok: true,
      consultations: rows.map((row) => ({
        id: String(row._id),
        personAName: clean(row.personA?.name, 80) || "나",
        personAShuku: clean(row.personA?.shuku, 20),
        personBName: clean(row.personB?.name, 80) || "상대",
        personBShuku: clean(row.personB?.shuku, 20),
        relationType: clean(row.sukuyoResult?.relationType, 20),
        relationshipType: clean(row.relationshipType, 40),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    });
  }

  if (!/^[0-9a-f]{24}$/i.test(sessionId)) {
    return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput }, { status: 422 });
  }
  const consultation = await SukuyoCompatibilityAiConsultation.findOne({ _id: sessionId, userId: auth.userId }).lean();
  if (!consultation) return json({ ok: false, reason: "NOT_FOUND", message: "상담 내역을 찾지 못했습니다." }, { status: 404 });
  return json({ ok: true, consultation: serializeConsultation(consultation) });
}

export async function handleSukuyoCompatibilityAiRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/sukuyo-compatibility-ai");
  if (method === "GET" && path === "/result") {
    try {
      return await handleResult(request, env);
    } catch (error) {
      logSukyoAi("[Sukyo AI LLM Error]", { route: "/api/sukuyo-compatibility-ai/result", errorMessage: clean(error?.message || error, 500) }, error, env);
      return json({ ok: false, reason: "SERVER_ERROR", message: MESSAGES.serverFailed }, { status: 500 });
    }
  }
  if (method !== "POST") return methodNotAllowed();
  try {
    if (path === "/ensure-access" || path === "/prepare") return await handleEnsureAccess(request, env);
    if (path === "/start" || path === "/generate") return await handleStart(request, env);
    if (path === "/message") return await handleMessage(request, env);
    return notFound();
  } catch (error) {
    logSukyoAi("[Sukyo AI LLM Error]", {
      route: `/api/sukuyo-compatibility-ai${path}`,
      requestId: request.headers.get("idempotency-key") || request.headers.get("x-idempotency-key"),
      errorMessage: clean(error?.message || error, 500),
    }, error, env);
    return json({ ok: false, reason: "SERVER_ERROR", message: MESSAGES.serverFailed }, { status: 500 });
  }
}
