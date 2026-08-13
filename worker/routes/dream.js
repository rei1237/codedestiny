import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getOptionalUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { callGeminiText } from "../lib/gemini.js";
import { canAccessPaidFeature, PAID_FEATURE_ACCESS_USER_PROJECTION } from "../lib/paid-feature-access.js";
import { verifyPremiumAccessToken } from "../lib/premium-access-token.js";
import { TAROT_CARDS, buildImageCandidates } from "../../lib/tarot/tarot-cards.mjs";
import { buildCaretaroCardImageUrl } from "../../lib/tarot/caretaro-card-images.mjs";

const DREAM_PSYCHO_FEATURE_KEY = "dream-psycho-analysis";
const DREAM_PSYCHO_FEATURE_REASON = "정신분석 해몽";
const DREAM_PSYCHO_REPORT_TYPE = "dreamPsychoAnalysis";
const DREAM_PSYCHO_GEMINI_MODEL_KEYS = Object.freeze([
  "DREAM_PSYCHO_GEMINI_MODEL",
  "PSYCHO_DREAM_GEMINI_MODEL",
  "GEMINI_MODEL",
]);

/** 첫 번째로 값이 있는 env 키를 고른다. callGeminiText 는 `model`(문자열) 하나만 읽는다. */
function firstDreamPsychoModel(env = {}) {
  for (const key of DREAM_PSYCHO_GEMINI_MODEL_KEYS) {
    const value = typeof env?.[key] === "string" ? env[key].trim() : "";
    if (value) return value;
  }
  return "";
}

let dreamGeminiCaller = callGeminiText;
let dreamPsychoAccessVerifier = verifyPsychoDreamAccess;

export function __setDreamGeminiCallerForTest(fn) {
  dreamGeminiCaller = typeof fn === "function" ? fn : callGeminiText;
}

export function __resetDreamGeminiCallerForTest() {
  dreamGeminiCaller = callGeminiText;
}

export function __setDreamPsychoAccessVerifierForTest(fn) {
  dreamPsychoAccessVerifier = typeof fn === "function" ? fn : verifyPsychoDreamAccess;
}

export function __resetDreamPsychoAccessVerifierForTest() {
  dreamPsychoAccessVerifier = verifyPsychoDreamAccess;
}

async function verifyPsychoDreamAccess(request, env = {}, body = {}) {
  let auth;
  try {
    // allowDbFallback: true — 유효한 JWT는 Mongo 풀 초기화 등 일시적 DB 오류에도 신뢰하고
    // (authDbFallback 플래그만 붙여) 인증을 통과시킨다. 실제로 로그인이 안 된 요청만 null.
    auth = await getOptionalUserFromRequest(request, env, { allowDbFallback: true, userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
  } catch (error) {
    if (isAuthDbInfraError(error)) {
      return {
        ok: false,
        status: 503,
        code: "AUTH_TEMPORARILY_UNAVAILABLE",
        message: "일시적인 오류로 로그인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      };
    }
    throw error;
  }
  if (!auth) {
    return { ok: false, status: 401, code: "LOGIN_REQUIRED", message: "로그인 후 정신분석 해몽을 이용해 주세요." };
  }

  const decision = await canAccessPaidFeature(auth.userId, DREAM_PSYCHO_FEATURE_KEY, {
    env,
    reason: DREAM_PSYCHO_FEATURE_REASON,
    // 인증 단계에서 이미 읽은 User 문서를 재사용한다(없으면 내부에서 종전대로 조회).
    userDoc: auth.authUserDoc,
  });
  if (decision?.allowed) {
    return {
      ok: true,
      auth,
      accessType: String(decision.licenseType || decision.accessSource || "paid").trim(),
      accessSource: String(decision.accessSource || decision.reason || "").trim(),
    };
  }

  // canAccessPaidFeature는 회당 결제(월정석 차감 등)를 판정하지 않고 항상 PAYMENT_REQUIRED를 준다
  // (지속 엔티틀먼트만 확인하는 설계). 결제 직후 발급된 프리미엄 액세스 토큰으로 그 결제를 인정한다.
  const premiumAccessToken = String(body?.premiumAccessToken || "").trim();
  if (premiumAccessToken) {
    const tokenCheck = await verifyPremiumAccessToken(premiumAccessToken, env, {
      userId: auth.userId,
      reportType: DREAM_PSYCHO_REPORT_TYPE,
    });
    if (tokenCheck.ok && String(tokenCheck.payload?.featureKey || "").trim() === DREAM_PSYCHO_FEATURE_KEY) {
      return {
        ok: true,
        auth,
        accessType: "single_payment",
        accessSource: "premium_access_token",
      };
    }
  }

  return {
    ok: false,
    status: decision?.reason === "LOGIN_REQUIRED" ? 401 : 402,
    code: decision?.reason === "LOGIN_REQUIRED" ? "LOGIN_REQUIRED" : "PAYMENT_REQUIRED",
    message: decision?.reason === "LOGIN_REQUIRED" ? "로그인 후 정신분석 해몽을 이용해 주세요." : "정신분석 해몽 결제 확인이 필요합니다.",
    detail: {
      reason: String(decision?.reason || "PAYMENT_REQUIRED").trim(),
      requiredFeatureKey: DREAM_PSYCHO_FEATURE_KEY,
    },
  };
}

function normalizeDreamText(payload) {
  const text = String(payload?.dreamText || payload?.dreamContent || "").trim();
  if (!text) return { ok: false, message: "꿈의 장면을 입력해 주세요." };
  if (text.length < 8) return { ok: false, message: "꿈의 장면을 조금 더 자세히 적어 주세요. 최소 8자 이상이 필요합니다." };
  if (text.length > 6000) return { ok: false, message: "꿈의 장면이 너무 깁니다. 6000자 이내로 적어 주세요." };
  return { ok: true, text };
}

// 메이저 22장의 꿈 해석 문장은 손으로 쓴 원본을 그대로 보존한다(코드 키로 이관).
// 마이너 56장은 tarot-cards.mjs 의 카드별 psychologicalMeaning 에 슈트 렌즈를 얹어 파생한다.
const DREAM_MEANING_BY_MAJOR_CODE = {
  M00: "익숙한 경계 밖으로 나가려는 마음이 떠오릅니다. 두려움보다 가능성의 문이 먼저 열립니다.",
  M01: "흩어진 재료를 하나의 의식으로 묶으려는 힘이 강하게 떠오릅니다. 마음속 도구가 깨어나는 징조입니다.",
  M02: "겉으로 드러나지 않은 감정과 기억이 물밑에서 움직입니다. 침묵 속의 신호가 선명해지는 때입니다.",
  M03: "몸과 감정이 더 부드러운 안식처를 찾고 있습니다. 관계와 창조성의 온기가 흐릅니다.",
  M04: "흔들리는 상황을 붙들고 싶은 의지가 드러납니다. 경계와 구조를 다시 세우려는 마음입니다.",
  M05: "오래된 믿음과 사회적 약속이 꿈의 배경에 머무릅니다. 배운 것과 진짜 마음 사이의 문턱이 비칩니다.",
  M06: "누군가와의 연결, 혹은 자기 안의 두 갈래 마음이 서로를 부릅니다. 중요한 선택의 온도가 흐릅니다.",
  M07: "움직이고 돌파하려는 힘이 강합니다. 속도와 통제 사이의 균형이 꿈속에서 시험받습니다.",
  M08: "거친 감정과 본능을 부드럽게 다루려는 힘이 떠오릅니다. 억누름보다 다정한 통제가 필요합니다.",
  M09: "혼자만의 길에서 답을 찾으려는 마음이 비칩니다. 외부보다 내면의 등불이 가까워집니다.",
  M10: "반복되던 흐름이 다른 국면으로 돌아서려 합니다. 우연처럼 보이는 변화가 문턱에 머무릅니다.",
  M11: "마음이 어떤 선택의 무게를 재고 있습니다. 공정함과 죄책감의 저울이 꿈속에 놓입니다.",
  M12: "멈춤 속에서 다른 시야가 열립니다. 당장 움직이기보다 거꾸로 바라볼 시간이 다가옵니다.",
  M13: "끝난 것을 놓고 새 껍질로 건너가려는 흐름입니다. 상실보다 변형의 기운이 깊습니다.",
  M14: "서로 다른 감정의 물줄기가 한 그릇 안에서 섞입니다. 치유와 조절의 리듬이 흐릅니다.",
  M15: "끊기 어려운 유혹이나 두려움이 그림자처럼 붙어 있습니다. 묶인 곳을 알아차리는 꿈입니다.",
  M16: "붙들고 있던 구조가 흔들리며 숨은 진실이 드러납니다. 추락과 폭발은 갑작스러운 각성을 가리킵니다.",
  M17: "어두운 장면 속에서도 회복의 빛이 남아 있습니다. 소망과 미래의 감각이 조용히 비칩니다.",
  M18: "모호한 감정과 상징이 깊은 밤의 물결처럼 출렁입니다. 불안은 숨은 직감의 문을 두드립니다.",
  M19: "어둠 뒤에 밝아지는 이해가 떠오릅니다. 몸과 마음이 더 단순한 진실을 향합니다.",
  M20: "과거의 장면이 다시 떠올라 새로운 응답을 요구합니다. 오래 미뤄둔 부름이 선명해집니다.",
  M21: "흩어진 경험이 하나의 원으로 묶이려 합니다. 마침과 시작이 같은 문에서 만납니다.",
};

// 꿈 상징 ↔ 타로 슈트 대응(물→컵, 불→완드, 돈·현실→펜타클, 갈등·생각→소드).
const DREAM_SUIT_LENS = {
  wands: "꿈속의 불·열기·움직임은 아직 쓰이지 않은 의욕이 몸을 두드리는 신호로 읽힙니다.",
  cups: "꿈속의 물·눈물·잔은 말로 옮겨지지 않은 감정이 수위를 올리는 자리로 읽힙니다.",
  swords: "꿈속의 말·칼날·바람은 생각이 감정보다 앞서 달릴 때 나타나는 긴장으로 읽힙니다.",
  pentacles: "꿈속의 땅·돈·몸은 현실의 조건과 안전감이 흔들릴 때 먼저 반응하는 자리로 읽힙니다.",
};

const DREAM_SUIT_LABEL = {
  major: "메이저 아르카나",
  wands: "완드(불)",
  cups: "컵(물)",
  swords: "소드(공기)",
  pentacles: "펜타클(흙)",
};

const DREAM_ELEMENT_LABEL = {
  spirit: "정신",
  fire: "불",
  water: "물",
  air: "공기",
  earth: "흙",
};

// 메이저 22장의 점성술 대응(골든던 표준). 마이너는 슈트 원소가 그 역할을 한다.
const MAJOR_ASTROLOGY_BY_CODE = {
  M00: "천왕성 / 공기",
  M01: "수성",
  M02: "달",
  M03: "금성",
  M04: "양자리",
  M05: "황소자리",
  M06: "쌍둥이자리",
  M07: "게자리",
  M08: "사자자리",
  M09: "처녀자리",
  M10: "목성",
  M11: "천칭자리",
  M12: "해왕성 / 물",
  M13: "전갈자리",
  M14: "사수자리",
  M15: "염소자리",
  M16: "화성",
  M17: "물병자리",
  M18: "물고기자리",
  M19: "태양",
  M20: "명왕성 / 불",
  M21: "토성",
};

function firstText(value, fallback = "") {
  if (Array.isArray(value)) return String(value[0] || "").trim() || fallback;
  return String(value || "").trim() || fallback;
}

function buildDreamMeaning(card) {
  const preserved = DREAM_MEANING_BY_MAJOR_CODE[card.code];
  if (preserved) return preserved;
  const psychological = firstText(card.upright?.psychologicalMeaning) || firstText(card.upright?.coreMeaning);
  const lens = DREAM_SUIT_LENS[card.suit] || "";
  return [psychological, lens].filter(Boolean).join(" ");
}

// 라이더-웨이트 78장 전체를 꿈 상담용 뷰로 변환한다(메이저 22 + 마이너 56).
const DREAM_TAROT_CARDS = TAROT_CARDS.map((card) => ({
  id: card.code,
  code: card.code,
  name: card.nameEn,
  nameKo: card.nameKo,
  arcana: card.arcana,
  suit: card.suit,
  suitLabel: DREAM_SUIT_LABEL[card.suit] || card.suit,
  element: card.element,
  elementLabel: DREAM_ELEMENT_LABEL[card.element] || card.element,
  number: card.number,
  astrology: MAJOR_ASTROLOGY_BY_CODE[card.code] || "",
  keywords: (card.keywords || []).slice(0, 3),
  uprightKeywords: (card.upright?.keywords || card.keywords || []).slice(0, 5),
  reversedKeywords: (card.reversed?.keywords || []).slice(0, 5),
  dreamMeaning: buildDreamMeaning(card),
  uprightMeaning: firstText(card.upright?.coreMeaning),
  reversedMeaning: firstText(card.reversed?.coreMeaning),
}));

const DREAM_TAROT_CARD_BY_CODE = new Map(DREAM_TAROT_CARDS.map((card) => [card.code, card]));

// suitWeight: 그 슈트가 주제 자체인 규칙(물→컵, 돈→펜타클, 갈등→소드)일수록 높게 준다.
// 지목한 메이저 점수(12/10/8)와 겨룰 수 있어야 마이너 56장이 실제로 뽑힌다.
const DREAM_THEME_RULES = [
  { pattern: /(떨어|추락|낙하|무너|붕괴|폭발|지진)/i, cards: ["M16", "M18", "M12"], suits: ["swords"], suitWeight: 8, themes: ["추락", "통제 상실", "각성"] },
  { pattern: /(날|비행|하늘|구름|새|공중)/i, cards: ["M00", "M17", "M19"], suits: ["wands", "swords"], suitWeight: 8, themes: ["자유", "도약", "가능성"] },
  { pattern: /(물|바다|강|호수|비|홍수|파도|잠수)/i, cards: ["M18", "M14", "M02"], suits: ["cups"], suitWeight: 14, themes: ["감정", "무의식", "정화"] },
  { pattern: /(쫓|도망|괴물|귀신|공포|위협|숨)/i, cards: ["M15", "M18", "M07"], suits: ["swords"], suitWeight: 10, themes: ["두려움", "그림자", "회피"] },
  { pattern: /(죽|장례|무덤|끝|헤어|이별|사라)/i, cards: ["M13", "M20", "M10"], suits: ["cups", "swords"], suitWeight: 8, themes: ["종결", "변형", "재탄생"] },
  { pattern: /(집|방|문|계단|학교|회사|사무실|건물)/i, cards: ["M04", "M05", "M09"], suits: ["pentacles"], suitWeight: 10, themes: ["구조", "역할", "내면의 방"] },
  { pattern: /(가족|엄마|아빠|아이|아기|연인|친구|결혼)/i, cards: ["M06", "M03", "M11"], suits: ["cups"], suitWeight: 14, themes: ["관계", "애착", "선택"] },
  { pattern: /(시험|지각|실패|점수|판단|혼남)/i, cards: ["M11", "M05", "M09"], suits: ["swords", "pentacles"], suitWeight: 10, themes: ["평가", "책임", "불안"] },
  { pattern: /(차|기차|버스|길|여행|운전|역|공항)/i, cards: ["M07", "M10", "M00"], suits: ["wands"], suitWeight: 8, themes: ["이동", "전환", "진로"] },
  // '말'은 한국어에서 speech 로 쓰이는 경우가 압도적이라 동물 패턴에서 뺀다(말다툼 오탐).
  { pattern: /(동물|개|고양이|뱀|사자|호랑이|새)/i, cards: ["M08", "M18", "M15"], suits: ["wands"], suitWeight: 8, themes: ["본능", "감각", "그림자"] },
  { pattern: /(거울|얼굴|알몸|몸|피부|머리|눈)/i, cards: ["M02", "M11", "M18"], suits: ["cups", "pentacles"], suitWeight: 8, themes: ["자기상", "비밀", "민감함"] },
  { pattern: /(불|화재|태양|빛|번개|뜨거)/i, cards: ["M19", "M16", "M01"], suits: ["wands"], suitWeight: 14, themes: ["열망", "폭로", "활력"] },
  { pattern: /(돈|월급|빚|집값|계약|투자|가난|부자)/i, cards: ["M10", "M04"], suits: ["pentacles"], suitWeight: 16, themes: ["현실 조건", "안전감", "생계"] },
  { pattern: /(싸우|다투|화가|욕|소리|말다툼|배신|거짓)/i, cards: ["M11", "M16"], suits: ["swords"], suitWeight: 16, themes: ["갈등", "언어", "경계"] },
];

function clampDreamCardCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 3;
  return Math.max(1, Math.min(5, parsed));
}

function compactDreamText(text, limit = 260) {
  const compact = String(text || "").replace(/\s+/g, " ").trim();
  return compact.length > limit ? `${compact.slice(0, limit - 1)}…` : compact;
}

function uniqueList(items, limit = 8) {
  const seen = new Set();
  const out = [];
  for (const item of items || []) {
    const value = String(item || "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= limit) break;
  }
  return out;
}

function seededIndex(text, offset, modulo) {
  let hash = 17 + offset * 31;
  const source = String(text || "");
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 33 + source.charCodeAt(i) + offset) >>> 0;
  }
  return modulo > 0 ? hash % modulo : 0;
}

function inferDreamThemes(dreamText) {
  const themes = [];
  for (const rule of DREAM_THEME_RULES) {
    if (rule.pattern.test(dreamText)) themes.push(...rule.themes);
  }
  return uniqueList(themes.length ? themes : ["무의식", "감정의 잔향", "내면의 전환"], 5);
}

// 정/역방향은 서버에서 꿈 원문 시드로 확정한다. 클라이언트가 따로 뽑으면
// 화면의 역방향 배지와 서버가 만든 프롬프트 문구가 어긋난다.
function decideOrientation(dreamText, code, position) {
  return seededIndex(`${dreamText}|${code}`, position + 7, 10) < 3;
}

function decorateDreamCard(card, { dreamText, position, env }) {
  const localFallback = (buildImageCandidates(card.code)[0] || "").replace(/\.jpe?g$/iu, ".webp");
  return {
    ...card,
    isReversed: decideOrientation(dreamText, card.code, position),
    imageUrl: buildCaretaroCardImageUrl(card.code, { env, width: 360 }),
    imageOriginalUrl: buildCaretaroCardImageUrl(card.code, { env }),
    imageFallbackUrl: localFallback,
  };
}

function chooseFallbackDreamCards(dreamText, requestedCount = 3, env = null) {
  const cardCount = clampDreamCardCount(requestedCount);
  const scores = new Map(DREAM_TAROT_CARDS.map((card) => [card.code, 0]));
  const suitBoost = new Map();
  const themes = [];

  const bump = (code, amount) => scores.set(code, (scores.get(code) || 0) + amount);

  for (const rule of DREAM_THEME_RULES) {
    if (!rule.pattern.test(dreamText)) continue;
    themes.push(...rule.themes);
    rule.cards.forEach((code, idx) => bump(code, 12 - idx * 2));
    // 꿈 상징 ↔ 슈트 연결: 해당 슈트 마이너 전체를 함께 후보로 올린다.
    // 규칙이 지목한 메이저와 겨룰 수 있는 무게를 줘야 마이너 56장이 실제로 뽑힌다.
    const weight = Number.isFinite(rule.suitWeight) ? rule.suitWeight : 8;
    (rule.suits || []).forEach((suit) => suitBoost.set(suit, (suitBoost.get(suit) || 0) + weight));
  }

  for (const card of DREAM_TAROT_CARDS) {
    const boost = suitBoost.get(card.suit);
    if (boost) bump(card.code, boost);
  }

  if (/(불안|무서|두려|긴장|혼란|이상)/i.test(dreamText)) bump("M18", 8);
  if (/(기쁨|편안|따뜻|행복|웃)/i.test(dreamText)) bump("M19", 8);
  if (/(선택|갈림|고민|결정)/i.test(dreamText)) bump("M06", 8);
  if (/(반복|계속|또|다시)/i.test(dreamText)) bump("M10", 8);

  const ranked = DREAM_TAROT_CARDS
    .map((card, idx) => ({
      code: card.code,
      // 점수가 같은 후보는 꿈 원문 시드로 흔들어 같은 슈트에서 같은 장만 나오지 않게 한다.
      score: (scores.get(card.code) || 0) * 1000 + seededIndex(dreamText, idx, 997),
      raw: scores.get(card.code) || 0,
      order: idx,
    }))
    .sort((a, b) => b.score - a.score || a.order - b.order);

  const selected = [];
  for (const entry of ranked) {
    if (entry.raw <= 0) break;
    selected.push(entry.code);
    if (selected.length >= cardCount) break;
  }

  const fallbackCodes = ["M18", "M02", "M16", "M17", "M10", "M13", "M06", "M07", "M14", "M21", "M00", "M11", "C02", "S03", "P07", "W08"];
  let offset = 0;
  while (selected.length < cardCount && offset < 64) {
    const code = fallbackCodes[seededIndex(dreamText, offset, fallbackCodes.length)];
    if (!selected.includes(code)) selected.push(code);
    offset += 1;
  }

  const selectedCardIds = selected.slice(0, cardCount);
  return {
    cardCount,
    selectedCardIds,
    dreamThemes: uniqueList(themes.length ? themes : inferDreamThemes(dreamText), 5),
    analysisNote: buildDreamAnalysisNote(dreamText, selectedCardIds),
    cards: selectedCardIds
      .map((code, idx) => {
        const card = DREAM_TAROT_CARD_BY_CODE.get(code);
        return card ? decorateDreamCard(card, { dreamText, position: idx, env }) : null;
      })
      .filter(Boolean),
  };
}

function buildDreamAnalysisNote(dreamText, selectedCardIds) {
  const names = selectedCardIds
    .map((code) => DREAM_TAROT_CARD_BY_CODE.get(code)?.nameKo)
    .filter(Boolean)
    .join(", ");
  if (/(떨어|추락|무너)/i.test(dreamText)) return `${names}의 조합은 흔들리는 통제감과 새롭게 열리는 각성의 문을 가리킵니다.`;
  if (/(물|바다|비|강|파도)/i.test(dreamText)) return `${names}의 조합은 깊은 감정의 물결과 무의식의 응답을 비춥니다.`;
  if (/(쫓|도망|공포|괴물)/i.test(dreamText)) return `${names}의 조합은 피하고 싶은 그림자와 마주할 힘을 가리킵니다.`;
  return `${names}의 조합은 꿈속 상징이 남긴 정서와 전환의 흐름을 비춥니다.`;
}

function normalizeDreamPromptCards(cards) {
  if (!Array.isArray(cards)) return [];
  return cards.slice(0, 5).map((entry, idx) => {
    const code = String(entry?.code || entry?.id || "").toUpperCase();
    const base = DREAM_TAROT_CARD_BY_CODE.get(code)
      || DREAM_TAROT_CARDS.find((card) => card.nameKo === entry?.nameKo)
      || DREAM_TAROT_CARDS[idx % DREAM_TAROT_CARDS.length];
    return {
      ...base,
      nameKo: String(entry?.nameKo || base.nameKo).trim(),
      isReversed: Boolean(entry?.isReversed || entry?.reversed || entry?.orientation === "reversed"),
      keywords: uniqueList(Array.isArray(entry?.keywords) && entry.keywords.length ? entry.keywords : base.keywords, 4),
      dreamMeaning: String(entry?.dreamMeaning || base.dreamMeaning).trim(),
    };
  });
}

function buildDreamCardBriefLines(cards) {
  const lines = [];
  cards.forEach((card, idx) => {
    const orientation = card.isReversed ? "역방향" : "정방향";
    const facets = card.arcana === "major"
      ? [`메이저 아르카나 ${card.number}`, `점성술 ${card.astrology || "-"}`, `수비학 ${card.number}`]
      : [`${card.suitLabel || card.suit} ${card.number}`, `원소 ${card.elementLabel || card.element}`, `수비학 ${card.number}`];
    lines.push(`${idx + 1}. ${card.nameKo} (${card.name}) · ${orientation} · ${facets.join(" · ")}`);
    const upright = uniqueList(card.uprightKeywords || card.keywords, 5).join(", ");
    const reversed = uniqueList(card.reversedKeywords, 5).join(", ");
    if (upright) lines.push(`   정방향 키워드: ${upright}`);
    if (reversed) lines.push(`   역방향 키워드: ${reversed}`);
    if (card.dreamMeaning) lines.push(`   꿈에서의 결: ${card.dreamMeaning}`);
  });
  return lines;
}

// 이 기능은 해몽 결과를 만들지 않는다. 사용자가 ChatGPT·Claude·Gemini에 그대로 붙여넣을
// "꿈 + 타로 상담 프롬프트"만 생성한다. 따라서 선(先)해석 문장을 넣지 않는다.
function buildDreamTarotConsultPrompt({ dreamText, dreamThemes, cards }) {
  const compact = compactDreamText(dreamText, 1200);
  const themeLine = uniqueList(dreamThemes, 5).join(", ") || "무의식, 감정의 잔향";
  const cardCount = cards.length;

  return [
    "# 역할",
    "당신은 30년 이상 실전 경험을 가진 세계 최고 수준의 타로 마스터이자 꿈 해몽 전문가입니다.",
    "Rider-Waite 78장을 기준 덱으로 삼되 Marseille·Thoth의 상징 체계를 함께 이해하고 있으며,",
    "Carl Jung의 상징심리학을 해석의 뼈대로 사용합니다.",
    "지금부터 아래 자료를 바탕으로, 실제 전문 타로 상담사가 진행하는 수준의 꿈 상담을 해 주세요.",
    "",
    "# 상담 자료",
    "[꿈 원문]",
    compact,
    "",
    `[감지된 중심 주제] ${themeLine}`,
    `[뽑힌 카드] ${cardCount}장`,
    ...buildDreamCardBriefLines(cards),
    "",
    "# 분석 순서 (반드시 이 순서를 지켜 주세요)",
    "① 꿈의 핵심 상징 분석 — 아래 항목으로 체계적으로 분류하되, 꿈에 실제로 등장한 것만 다룹니다.",
    "   인물 / 장소 / 동물 / 자연물 / 물 / 불 / 하늘 / 색 / 숫자 / 방향 / 날씨 / 건물 / 탈것 /",
    "   문 / 열쇠 / 음식 / 죽음 / 탄생 / 추락 / 비행 / 시험 / 학교 / 직장",
    "② 가장 중요한 감정 분석 — 꿈은 사건보다 감정이 중요합니다.",
    "   두려움 / 기쁨 / 안도 / 분노 / 슬픔 / 후회 / 죄책감 / 기대 / 설렘 중 어떤 감정이",
    "   꿈에서 어떤 역할을 했는지, 깨어난 뒤 어떤 여운으로 남았는지 먼저 짚습니다.",
    "③ 반복되는 상징 확인 — 같은 이미지·장면·감정이 되풀이되는지 살핍니다.",
    "④ 현재 현실과 연결 — 상징의 사전 뜻보다 이 사람의 개인 맥락이 우선입니다.",
    "⑤ 무의식의 메시지 추론",
    "⑥ 가장 적합한 타로 스프레드 선택 — 아래에서 고르고 선택 이유를 반드시 설명합니다.",
    "   불안한 꿈 → 3 Card Shadow Spread / 재회 꿈 → Relationship Spread /",
    "   돈 꿈 → Prosperity Spread / 직장 꿈 → Career Spread /",
    "   반복되는 꿈 → Cross Spread / 인생 전환 → Celtic Cross",
    `   뽑힌 카드가 ${cardCount}장이므로 ${cardCount}장으로 운용 가능한 스프레드를 고르거나,`,
    `   ${cardCount}개의 자리 의미를 직접 정의하고 그 근거를 밝혀 주세요.`,
    "⑦ 카드별 질문 설계 — 카드를 읽기 전에 물어야 할 질문을 먼저 세웁니다.",
    "   이 꿈은 무엇을 알려주려 하는가 / 내가 지금 놓치고 있는 것은 무엇인가 /",
    "   현재 가장 중요한 선택은 무엇인가 / 무의식이 경고하는 부분은 어디인가 /",
    "   앞으로 어떤 행동이 필요한가",
    "⑧ 카드 의미를 꿈과 연결",
    "⑨ 실질적인 조언",
    "⑩ 종합 메시지",
    "",
    "# 카드 해석 원칙",
    "각 카드마다 반드시 이 순서를 따릅니다. 단순한 카드 설명 나열은 금지합니다.",
    "  카드의 기본 상징 → 꿈속 상징과 연결 → 현재 상황과 연결 → 심리적 의미 → 행동 조언 → 주의사항",
    "정방향과 역방향을 정확히 구분합니다. 역방향은 '나쁨'이 아니라 방향·강도·내향화의 차이입니다.",
    "카드 이름만 보고 단편적으로 해석하지 말고, 상징·슈트·원소·수비학·점성술 대응·색채·",
    "인물이 향한 방향·배경 요소를 종합해 읽어 주세요.",
    "꿈속 상징과 슈트를 적극적으로 연결합니다.",
    "  물·감정 → Cups / 불·열정 → Wands / 돈·현실 → Pentacles / 갈등·생각 → Swords",
    "",
    "# 꿈 유형 분류",
    "먼저 이 꿈이 어떤 유형인지 분류하고, 유형에 따라 상담 방향을 달리합니다.",
    "  예지성 / 심리적 / 불안 / 희망 / 소망 / 스트레스 / 무의식 / 트라우마 / 성장 / 관계 / 치유",
    "",
    "# 융 심리학 관점",
    "가능한 경우 그림자, 아니마·아니무스, 개성화, 집단무의식, 원형(archetype)의 관점을 함께 참고합니다.",
    "단, 단정하지 말고 가능성으로 설명해 주세요.",
    "",
    "# 금지 사항",
    "- 카드 의미만 나열하기",
    "- 꿈 의미만 설명하고 카드와 연결하지 않기",
    "- 긍정적인 말만 반복하기",
    "- 모든 꿈을 길몽으로 해석하기",
    "- 모든 역방향을 나쁘게 해석하기",
    "- 근거 없는 예언, 단정적인 미래 예측",
    "",
    "# 출력 형식",
    "1. 꿈 유형 분류와 그 근거",
    "2. 상징 분석 (분류 / 등장한 것 / 상징적 의미 / 개인 맥락을 확인할 질문)",
    "3. 감정 지도 (감정 / 꿈에서의 역할 / 현실에서의 대응)",
    "4. 선택한 스프레드와 선택 이유, 각 자리의 의미",
    "5. 카드별 해석 (위 6단계 순서를 그대로 지킬 것)",
    "6. 카드 조합이 만드는 하나의 서사",
    "7. 융의 관점에서 본 무의식의 메시지 (단정 없이 가능성으로)",
    "8. 지금 붙잡아야 할 한 문장",
    "9. 앞으로 48시간 안에 실행할 수 있는 구체적인 행동 1가지",
    "10. 스스로에게 던질 질문 3가지",
    "",
    "읽는 사람이 \"정말 상담을 받은 것 같다\"고 느끼도록, 실제 프리미엄 타로 상담의 깊이와 일관성으로 작성해 주세요.",
  ].join("\n");
}

async function handleDreamTarotSelection(request, env) {
  const body = await readJson(request);
  const normalized = normalizeDreamText(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }

  const selection = chooseFallbackDreamCards(normalized.text, body?.cardCount || body?.count || 3, env);
  return json({
    ok: true,
    cached: false,
    ...selection,
    source: "local",
    model: "local-symbol-matcher",
    message: "ok",
  });
}

async function handleDreamPrompt(request, env) {
  const body = await readJson(request);
  const normalized = normalizeDreamText(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }

  let cards = normalizeDreamPromptCards(body?.cards);
  if (!cards.length) {
    cards = chooseFallbackDreamCards(normalized.text, body?.cardCount || 3, env).cards;
  }
  const dreamThemes = uniqueList(body?.dreamThemes || inferDreamThemes(normalized.text), 5);
  const dreamPrompt = buildDreamTarotConsultPrompt({ dreamText: normalized.text, dreamThemes, cards });

  return json({
    ok: true,
    cached: false,
    dreamPrompt,
    promptText: dreamPrompt,
    source: "local",
    model: "local-prompt-weaver",
    message: "ok",
  });
}


function fallbackMarkdown(dreamText) {
  const compact = dreamText.replace(/\s+/g, " ").trim();
  return [
    "## 핵심 상징",
    `꿈의 반복 소재를 보면 "${compact.slice(0, 160)}" 구간에서 가장 강한 상징이 드러납니다. 이 상징은 현재 삶에서 자주 미루는 문제를 우회적으로 비추는 신호일 가능성이 큽니다.`,
    "상징이 불안하게 느껴졌다면 회피가 아니라 경계 신호로 받아들이는 편이 유리합니다. 지금은 해석보다 기록을 우선해 상징이 어떤 상황에서 재등장하는지 패턴을 모으는 것이 핵심입니다.",
    "특히 사람·장소·시간대가 반복된다면 그 조합이 현재 갈등의 트리거일 수 있습니다. 같은 소재가 다시 나오면 당시 감정 강도를 1~10으로 기록해 변화를 추적해 보세요.",
    "",
    "## 무의식의 갈등",
    "이 꿈은 '원하는 방향'과 '안전하게 머무르려는 본능'의 충돌을 비춥니다. 의식은 전진을 원하지만 무의식은 실패 비용을 크게 계산하는 상태입니다.",
    "갈등이 길어질수록 행동은 느려지고 자기비판이 늘어납니다. 이때 중요한 것은 완벽한 결론이 아니라 작은 실험을 통해 불확실성을 줄이는 방식입니다.",
    "오늘 할 수 있는 가장 작은 행동 하나를 정하고, 그 행동 후의 감정 변화를 기록하면 무의식의 저항이 실제보다 과장되었는지 확인할 수 있습니다.",
    "",
    "## 감정 패턴",
    "감정의 핵심은 불안 그 자체보다 '불안을 통제하지 못할 것 같은 두려움'에 가깝습니다. 그래서 꿈에서 장면이 급변하거나 논리가 끊기는 체감이 생깁니다.",
    "이 패턴은 낮 시간의 과부하와 연결되기 쉽습니다. 할 일을 줄이지 않은 상태에서 회복 시간을 생략하면 꿈에서 감정이 폭주하는 형태로 보상됩니다.",
    "잠들기 30분 전 자극(뉴스, 메시지, 업무)을 줄이고, 메모 5줄로 감정을 외부화하면 꿈의 긴장도가 완만해지는 경우가 많습니다.",
    "",
    "## 현재 삶과 연결",
    "현실에서는 관계·일·자기평가 중 하나에서 경계 설정이 흐려졌을 가능성이 큽니다. 꿈은 그 경계 붕괴를 과장된 이미지로 보여줘 우선순위 재정렬을 요구합니다.",
    "이번 주에는 모든 결정을 한 번에 바꾸기보다, 에너지 소모가 큰 한 지점만 선택해 정리하는 전략이 효과적입니다. 선택과 집중이 불안을 낮춥니다.",
    "특히 반복해서 마음을 빼앗는 주제가 있다면 그것이 현재 무의식의 1순위 과제입니다. 회피하지 말고 일정표에 공식적으로 배치해 '관리 가능한 과제'로 바꾸세요.",
    "",
    "## 7일 실천 가이드",
    "- 1일차: 꿈에서 가장 강한 장면 1개를 문장 3줄로 요약",
    "- 2일차: 그 장면과 닮은 현실 상황 1개를 찾고 감정 점수 기록",
    "- 3일차: 회피 중인 행동을 10분짜리 작업으로 쪼개 실행",
    "- 4일차: 불필요한 약속/업무 1개 취소 또는 위임",
    "- 5일차: 잠들기 전 5분 호흡 + 메모 5줄",
    "- 6일차: 한 주간 감정 점수 변화를 비교",
    "- 7일차: 다음 주에 유지할 습관 1개 확정",
  ].join("\n");
}

function normalizeConsultTone(value) {
  const tone = String(value || "comfort").trim().toLowerCase();
  if (tone === "motivation" || tone === "coaching") return tone;
  return "comfort";
}

function normalizeConsultCards(cards) {
  const list = Array.isArray(cards) ? cards : [];
  const normalized = list
    .slice(0, 3)
    .map((item, idx) => {
      const name = String(item?.name || item?.card_name || `카드 ${idx + 1}`).trim();
      const orientation = String(item?.orientation || "upright").toLowerCase() === "reversed" ? "reversed" : "upright";
      const keywords = Array.isArray(item?.keywords)
        ? item.keywords.map((v) => String(v || "").trim()).filter(Boolean).slice(0, 5)
        : [];
      return { name, orientation, keywords };
    })
    .filter((item) => item.name);

  if (!normalized.length) {
    return { ok: false, message: "카드 정보가 필요합니다." };
  }

  return { ok: true, cards: normalized };
}

function consultToneGuide(tone) {
  if (tone === "motivation") {
    return "따뜻하지만 추진력 있는 꿈 상징 해석가처럼 말하고, 꿈이 남긴 에너지를 오늘 움직일 수 있는 작고 선명한 선택으로 내려놓으세요.";
  }
  if (tone === "coaching") {
    return "질문형 리딩 톤으로 말하고, 꿈의 장면, 감정의 잔향, 오늘의 선택을 차례로 짚어 주는 체크포인트를 제시하세요.";
  }
  return "정서적 안정감을 주는 꿈 상징 해석가의 톤으로 말하고, 불안을 키우지 않으면서 마음을 정리하는 작은 회복 행동을 제시하세요.";
}


function fallbackTarotConsultMarkdown({ dreamText, cards }) {
  const compact = String(dreamText || "").replace(/\s+/g, " ").trim().slice(0, 180);
  const cardLine = cards.map((card) => card.name).join(" · ");
  return [
    "## 꿈의 문을 여는 카드",
    `${cardLine || "오늘의 카드"} 조합은 꿈속 장면("${compact}")이 단순한 잔상이 아니라, 지금 마음이 붙잡고 있는 문을 비추고 있음을 드러냅니다. 이 문은 불안을 키우기 위한 것이 아니라, 아직 이름 붙이지 못한 감정과 필요를 조용히 드러내는 통로에 가깝습니다.`,
    "당장 결론을 내리기보다, 오늘 다룰 수 있는 한 장면만 골라 현실의 작은 행동으로 옮길 때 꿈의 파장이 안정됩니다.",
    "",
    "## 마음 아래 흐르는 감정",
    "지금 감정의 중심에는 두려움 자체보다, 내가 놓치고 싶지 않은 안정과 확인받고 싶은 마음이 함께 흐릅니다. 그래서 생각은 많아지지만, 실제 행동은 늦어지는 패턴이 나타날 수 있습니다.",
    "지금 필요한 것은 완벽한 해답이 아니라, 깨어난 뒤 남은 감정을 사실과 분리해 적어보는 짧은 정리입니다. 감정의 이름을 붙이는 순간 꿈은 막연한 예감이 아니라 나를 돌보는 언어가 됩니다.",
    "",
    "## 오늘의 작은 선택 3가지",
    "- 꿈에서 가장 선명했던 장면 하나를 적고, 그때의 감정을 한 단어로 봉인하기",
    "- 관계나 일에서 미뤄 둔 확인 하나를 오늘 가능한 가장 작은 방식으로 정리하기",
    "- 잠들기 전 5분 동안 조명을 낮추고, 오늘의 감정을 세 문장으로 내려놓기",
    "",
    "## 관계/일/회복의 길",
    "- 관계: 상대의 마음을 단정하기보다, 내가 바라는 안정과 거리감을 먼저 한 문장으로 정리하세요.",
    "- 일/돈: 큰 결정보다 이번 주 부담을 줄이는 작은 실행을 우선하면 흐름이 맑아집니다.",
    "- 회복: 회복 루틴은 길이보다 반복이 중요합니다. 짧은 기록과 호흡만으로도 밤의 파장이 낮아집니다.",
    "",
    "## 봉인 문장",
    "나는 꿈이 남긴 잔향을 오늘의 작고 안전한 선택으로 봉인한다.",
  ].join("\n");
}

function sectionText(markdown, heading) {
  const source = String(markdown || "");
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`##\\s*${escaped}\\n([\\s\\S]*?)(?=\\n##\\s|$)`, "i");
  const found = source.match(pattern);
  return found ? String(found[1] || "").trim() : "";
}

function firstMeaningfulLine(text) {
  return String(text || "")
    .split(/\n+/)
    .map((line) => String(line || "").replace(/^[-*]\s*/, "").trim())
    .find(Boolean) || "";
}

function extractActionPlan(markdown) {
  const section = sectionText(markdown, "오늘의 작은 선택 3가지");
  const lines = section
    .split(/\n+/)
    .map((line) => String(line || "").trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);
  return lines.slice(0, 3);
}

function cleanPromptText(value, fallback = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function uniquePromptItems(items, limit = 8) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(items) ? items : []) {
    const text = cleanPromptText(item);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function normalizeDreamPromptContext(context) {
  return (Array.isArray(context) ? context : [])
    .slice(0, 5)
    .map((entry) => {
      const keyword = cleanPromptText(entry?.keyword || entry?.title || entry?.name);
      const meaning = cleanPromptText(entry?.meaning || entry?.summary || entry?.tip || entry?.text);
      if (!keyword && !meaning) return "";
      return keyword && meaning ? `${keyword}: ${meaning}` : (keyword || meaning);
    })
    .filter(Boolean);
}

function collectDreamPromptKeywords(dreamText, localReading, dreamLibraryContext) {
  const localKeywords = Array.isArray(localReading?.keywords) ? localReading.keywords : [];
  const cardKeywords = Array.isArray(localReading?.cards)
    ? localReading.cards.map((card) => card?.keyword || card?.energy_keyword || card?.card_name)
    : [];
  const contextKeywords = normalizeDreamPromptContext(dreamLibraryContext).map((line) => line.split(":")[0]);
  const dreamTokens = cleanPromptText(dreamText)
    .split(/\s+/)
    .filter((token) => token.length >= 2)
    .slice(0, 5);
  return uniquePromptItems([...localKeywords, ...cardKeywords, ...contextKeywords, ...dreamTokens], 10);
}

function dreamPromptToneLine(tone) {
  if (tone === "motivation") return "문체는 따뜻하지만 힘 있게 흐르고, 사용자가 오늘 바로 붙잡을 수 있는 질문을 남깁니다.";
  if (tone === "coaching") return "문체는 질문을 선명하게 짚는 상담 톤으로 흐르고, 감정과 현실 행동의 경계를 차분히 나눕니다.";
  return "문체는 차분하고 안전하게 흐르며, 불안을 키우는 단정 대신 마음을 정돈하는 문장을 남깁니다.";
}

function buildDreamPromptCards(keywords) {
  return [
    { card_name: "장면 카드", symbol: "🌙", energy_keyword: keywords[0] || "꿈 원문" },
    { card_name: "상징 카드", symbol: "✦", energy_keyword: keywords[1] || "상징 단서" },
    { card_name: "질문 카드", symbol: "🪄", energy_keyword: keywords[2] || "상담 질문" },
  ];
}

function buildDreamPromptText({ dreamText, tone, keywords, dreamLibraryContext }) {
  const keywordLine = keywords.length ? keywords.slice(0, 8).join(" · ") : "꿈 장면 · 감정 잔향 · 다음 질문";
  const contextLines = normalizeDreamPromptContext(dreamLibraryContext);
  const contextBlock = contextLines.length
    ? contextLines.map((line) => `- ${line}`).join("\n")
    : "- 꿈 원문 안에서 반복되는 장면과 감정의 결을 우선 살핍니다.";

  return [
    "당신은 꿈 상징 해석가입니다.",
    "아래 꿈을 확정 예언으로 몰아가지 말고, 꿈속 장면과 깨어난 뒤의 감정이 어디에 머무는지 전문적인 상담 문장으로 풀어 주세요.",
    dreamPromptToneLine(tone),
    "",
    "[꿈 원문]",
    dreamText,
    "",
    "[핵심 단서]",
    keywordLine,
    "",
    "[상징 참고]",
    contextBlock,
    "",
    "[응답의 그릇]",
    "1. 꿈의 첫빛: 가장 선명한 장면 하나를 고르고, 그 장면이 마음 안에서 어떤 문을 열었는지 드러내 주세요.",
    "2. 감정의 잔향: 깨어난 뒤 남은 감정을 이름 붙이고, 그 감정이 관계·일·회복 중 어디에 기울어 있는지 비춰 주세요.",
    "3. 숨은 상징: 반복되는 존재, 장소, 사물의 상징을 하나의 흐름으로 엮어 주세요.",
    "4. 오늘의 질문: 사용자가 스스로에게 던질 질문 3가지를 부드럽게 남겨 주세요.",
    "5. 작은 의식: 잠들기 전 5분 안에 할 수 있는 기록·호흡·정리 루틴을 제안해 주세요.",
    "6. 봉인 문장: 꿈이 남긴 빛을 오늘의 선택으로 옮기는 한 문장으로 마무리해 주세요.",
    "",
    "[봉인할 경계]",
    "- 죽음, 질병, 임신, 합격, 투자, 이별 여부를 확정하지 마세요.",
    "- 공포를 키우는 경고문이나 운명 단정은 피하세요.",
    "- 제작 과정과 도구 이름은 장막 뒤에 두세요.",
  ].join("\n");
}

function buildDreamPromptRecord({ dreamText, tone, localReading, dreamLibraryContext }) {
  const keywords = collectDreamPromptKeywords(dreamText, localReading, dreamLibraryContext);
  const cards = buildDreamPromptCards(keywords);
  const promptText = buildDreamPromptText({ dreamText, tone, keywords, dreamLibraryContext });
  return {
    id: `dream-prompt-${Date.now()}`,
    kind: "dream_prompt",
    title: "꿈 프롬프트 생성서",
    summary: "꿈의 장면과 감정의 잔향이 ?? ??에게 건넬 질문의 중심으로 모였습니다.",
    stageReadings: {
      scene: "꿈 원문에서 가장 선명한 장면을 먼저 붙잡습니다. 이 장면은 프롬프트의 첫 문을 열고, 상담이 막연한 해몽으로 흩어지지 않도록 중심을 잡습니다.",
      symbol: "반복되는 존재와 감정의 잔향을 함께 묶습니다. 상징은 단독으로 고정되지 않고, 깨어난 뒤 남은 느낌과 함께 프롬프트 안에서 살아납니다.",
      echo: "마지막 장은 ?? ??에게 건넬 질문의 문을 가리킵니다. 관계, 일, 회복 중 어느 문을 열지 정하면 꿈의 언어가 더 또렷하게 흐릅니다.",
    },
    goldenAdvice: "봉인 카드 아래 완성된 프롬프트를 그대로 옮기면, 꿈의 잔향이 상담 가능한 질문으로 열립니다.",
    actionPlan: [
      "꿈 원문을 줄이지 않고 그대로 붙여 넣기",
      "깨어난 뒤 남은 감정을 한 단어로 덧붙이기",
      "관계·일·회복 중 가장 알고 싶은 문 하나 고르기",
    ],
    cards,
    keywords,
    promptText,
    consultingText: promptText,
    usedDreamText: dreamText,
    goldenCardName: "최종 프롬프트",
    goldenCardSymbol: "✶",
    source: "worker/local",
    model: "prompt-maker/local",
    createdAt: new Date().toISOString(),
  };
}

async function handleDreamPromptMaker(request) {
  const body = await readJson(request);
  const normalized = normalizeDreamText(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }
  const tone = normalizeConsultTone(body?.tone);
  const record = buildDreamPromptRecord({
    dreamText: normalized.text,
    tone,
    localReading: body?.localReading || {},
    dreamLibraryContext: body?.dreamLibraryContext || [],
  });
  return json({
    ok: true,
    cached: false,
    record,
    message: "ok",
  });
}

async function handleTarotConsult(request) {
  const body = await readJson(request);
  const normalized = normalizeDreamText(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }

  const cards = normalizeConsultCards(body?.cards);
  if (!cards.ok) {
    return json({ ok: false, message: cards.message }, { status: 400 });
  }

  const markdown = fallbackTarotConsultMarkdown({ dreamText: normalized.text, cards: cards.cards });
  const formatWarning = true;

  const summary = firstMeaningfulLine(sectionText(markdown, "꿈의 문을 여는 카드"));
  const goldenAdvice = firstMeaningfulLine(sectionText(markdown, "마음 아래 흐르는 감정"));
  const actionPlan = extractActionPlan(markdown);

  return json({
    ok: true,
    cached: false,
    formatWarning,
    record: {
      id: `dream-tarot-consult-${Date.now()}`,
      consultingText: markdown,
      summary,
      goldenAdvice,
      actionPlan,
      source: "local",
      model: "fallback/local",
      createdAt: new Date().toISOString(),
    },
    message: "ok",
  });
}

const PSYCHO_DREAM_REQUIRED_HEADERS = Object.freeze([
  "Chapter 1. 꿈의 장면과 핵심 상징",
  "Chapter 2. 정신분석적 해석 — 무의식의 소망과 갈등",
  "Chapter 3. 융 심리학적 해석 — 내면의 원형과 통합",
  "Chapter 4. 영적 상징 해몽 — 꿈이 전하는 신비한 메시지",
  "Chapter 5. 현실 조언과 치유의 방향",
]);

const PSYCHO_DREAM_REQUIRED_PHRASES = Object.freeze([
  "꿈의 핵심 장면 요약",
  "프로이트식 소망 충족 관점",
  "그림자와 아니마/아니무스의 작용",
  "이 꿈이 건네는 신비로운 문장",
  "오늘 할 수 있는 작은 행동",
]);

const PSYCHO_DREAM_POSITIVE_MARKERS = Object.freeze([
  "행복",
  "기쁨",
  "축복",
  "사랑",
  "안도",
  "평온",
  "편안",
  "따뜻",
  "회복",
  "치유",
  "안정",
  "희망",
  "화해",
  "기대",
]);

const PSYCHO_DREAM_HEALING_MARKERS = Object.freeze([
  "위로",
  "돌봄",
  "다정",
  "포근",
  "휴식",
  "숨",
  "정리",
  "부드럽",
  "안식",
  "조율",
]);

const PSYCHO_DREAM_ANXIOUS_MARKERS = Object.freeze([
  "불안",
  "공포",
  "도망",
  "추락",
  "죽음",
  "상실",
  "분노",
  "죄책감",
  "압박",
  "위기",
  "혼란",
  "붕괴",
  "파국",
  "경고",
  "악몽",
]);

const PSYCHO_DREAM_LEAK_MARKERS = Object.freeze([
  /fallback/i,
  /payload/i,
  /json/i,
  /llm/i,
  /api/i,
]);

function cleanPsychoText(value, fallback = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function parseJsonCandidate(text) {
  const source = cleanPsychoText(text);
  if (!source) return null;

  const candidates = [source];
  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(cleanPsychoText(fenced[1]));

  const firstBrace = source.indexOf("{");
  const lastBrace = source.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(source.slice(firstBrace, lastBrace + 1));
  }

  const firstBracket = source.indexOf("[");
  const lastBracket = source.lastIndexOf("]");
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    candidates.push(source.slice(firstBracket, lastBracket + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (_) {}
  }

  return null;
}

function firstPsychoText(values) {
  for (const value of Array.isArray(values) ? values : []) {
    const text = cleanPsychoText(value);
    if (text) return text;
  }
  return "";
}

function countPsychoMarkerHits(text, markers) {
  const source = String(text || "");
  return (Array.isArray(markers) ? markers : []).reduce((count, marker) => {
    if (!marker) return count;
    return count + (source.includes(marker) ? 1 : 0);
  }, 0);
}

function normalizePsychoTone(body, dreamText) {
  const intake = body?.intake && typeof body.intake === "object" ? body.intake : {};
  const source = [
    dreamText,
    body?.emotion,
    body?.relationshipContext,
    body?.recurringConcern,
    body?.recentStressContext,
    body?.desiredOutcome,
    intake?.emotionalState,
    intake?.relationshipContext,
    intake?.recurringConcern,
    intake?.recentStressContext,
    intake?.desiredOutcome,
    Array.isArray(body?.peopleInDream) ? body.peopleInDream.join(" ") : body?.peopleInDream,
  ].map((value) => cleanPsychoText(value)).join(" ");

  const happyScore = countPsychoMarkerHits(source, PSYCHO_DREAM_POSITIVE_MARKERS);
  const healingScore = countPsychoMarkerHits(source, PSYCHO_DREAM_HEALING_MARKERS);
  const anxiousScore = countPsychoMarkerHits(source, PSYCHO_DREAM_ANXIOUS_MARKERS);

  let primary = "neutral";
  if (happyScore > 0 || healingScore > 0) {
    if (anxiousScore === 0) {
      primary = happyScore >= healingScore ? "happy" : "healing";
    } else if (anxiousScore > happyScore + healingScore) {
      primary = "anxious";
    } else {
      primary = "mixed";
    }
  } else if (anxiousScore > 0) {
    primary = "anxious";
  }

  const signals = uniqueList([
    ...PSYCHO_DREAM_POSITIVE_MARKERS.filter((marker) => source.includes(marker)),
    ...PSYCHO_DREAM_HEALING_MARKERS.filter((marker) => source.includes(marker)),
    ...PSYCHO_DREAM_ANXIOUS_MARKERS.filter((marker) => source.includes(marker)),
  ], 8);

  return {
    primary,
    signals,
    scores: {
      happy: happyScore,
      healing: healingScore,
      anxious: anxiousScore,
    },
  };
}

/* 정신분석 해몽의 시스템 프롬프트. 예전에는 핸들러 안 인라인이라 관리자 화면이 읽을 수 없었다.
   문자열은 그대로이고 선언 위치만 밖으로 옮겼다(동작 불변). */
const DREAM_PSYCHO_SYSTEM_PROMPT = [
  "당신은 정신분석 해몽가입니다.",
  "말투는 전문적이되 지나치게 기술적이지 않게 유지하고, 꿈의 정서를 먼저 읽으세요.",
  "행복한 꿈은 불안 템플릿으로 밀어 넣지 말고, 긴장된 꿈은 소망과 방어를 균형 있게 다루세요.",
  "출력은 5장 구조의 Markdown으로 자연스럽게 정리하세요.",
].join(" ");

/** 관리자 CMS 가 기본값을 보여줄 때 읽어 간다(worker/lib/cms-prompt-defaults.js). */
export function getDefaultSystemPrompt() {
  return DREAM_PSYCHO_SYSTEM_PROMPT;
}

/* 관리자 프롬프트 랩 전용(lib/admin/prompt-lab-registry.mjs 참고).
   꿈 내용만 있으면 프로덕션과 똑같은 프롬프트가 그대로 조립된다 — 생년 정보가 필요 없다. */
export function buildAdminLabPrompt(body = {}) {
  const normalized = normalizeDreamText(body);
  if (!normalized.ok) {
    throw new Error(normalized.message || "꿈 내용을 입력해 주세요.");
  }

  const tone = normalizePsychoTone(body, normalized.text);

  return {
    systemPrompt: DREAM_PSYCHO_SYSTEM_PROMPT,
    prompt: buildPsychoPrompt(body, normalized.text, tone),
  };
}

function buildPsychoPrompt(body, dreamText, tone) {
  const intake = body?.intake && typeof body.intake === "object" ? body.intake : {};
  const people = Array.isArray(body?.peopleInDream)
    ? uniqueList(body.peopleInDream, 8).join(", ")
    : cleanPsychoText(body?.peopleInDream);
  const places = Array.isArray(body?.placesInDream)
    ? uniqueList(body.placesInDream, 8).join(", ")
    : cleanPsychoText(body?.placesInDream);
  const symbols = Array.isArray(body?.symbolsInDream)
    ? uniqueList(body.symbolsInDream, 8).join(", ")
    : cleanPsychoText(body?.symbolsInDream);

  return [
    "프로이트와 융의 시선을 함께 살려, 꿈의 장면을 다정하고 정밀하게 읽어주세요.",
    "행복한 꿈이라면 불안과 경고를 억지로 덧씌우지 말고, 긴장된 꿈이라면 무의식의 소망과 방어를 균형 있게 비추세요.",
    "",
    "[상담 메타]",
    "- 서비스: 정신분석 해몽",
    "- 출력 형식: Markdown 5장 구조",
    `- 핵심 톤: ${tone.primary}`,
    "- 해석 원칙: 상징을 억지로 과장하지 말고, 꿈이 주는 정서의 결을 먼저 존중하세요.",
    "",
    "[꿈 감정 추정]",
    `- primary: ${tone.primary}`,
    `- signals: ${tone.signals.length ? tone.signals.join(", ") : "없음"}`,
    "",
    "[입력 정보]",
    `- dreamText: ${dreamText}`,
    `- emotion: ${firstPsychoText([body?.emotion, intake.emotionalState])}`,
    `- recurringConcern: ${firstPsychoText([body?.recurringConcern, intake.recurringConcern])}`,
    `- recentStressContext: ${firstPsychoText([body?.recentStressContext, intake.recentStressContext])}`,
    `- desiredOutcome: ${firstPsychoText([body?.desiredOutcome, intake.desiredOutcome])}`,
    `- relationshipContext: ${firstPsychoText([body?.relationshipContext, intake.relationshipContext])}`,
    `- peopleInDream: ${people}`,
    `- placesInDream: ${places}`,
    `- symbolsInDream: ${symbols}`,
    "",
    "[출력 규칙]",
    "- 반드시 아래 다섯 장 제목을 순서대로, 글자 하나도 바꾸지 말고 정확히 그대로 사용하세요:",
    "  ## Chapter 1. 꿈의 장면과 핵심 상징",
    "  ## Chapter 2. 정신분석적 해석 — 무의식의 소망과 갈등",
    "  ## Chapter 3. 융 심리학적 해석 — 내면의 원형과 통합",
    "  ## Chapter 4. 영적 상징 해몽 — 꿈이 전하는 신비한 메시지",
    "  ## Chapter 5. 현실 조언과 치유의 방향",
    "- 각 장 안에는 아래 소제목 문구를 정확히 그대로(글자 변경 없이) 한 번씩 포함하고, 그 앞뒤로 자연스러운 해석 문장을 충분히 덧붙이세요:",
    "  · Chapter 1 안에: \"꿈의 핵심 장면 요약\"",
    "  · Chapter 2 안에: \"프로이트식 소망 충족 관점\"",
    "  · Chapter 3 안에: \"그림자와 아니마/아니무스의 작용\"",
    "  · Chapter 4 안에: \"이 꿈이 건네는 신비로운 문장\"",
    "  · Chapter 5 안에: \"오늘 할 수 있는 작은 행동\"",
    "- 다섯 장을 고르게, 공백 제외 500자 이상 충분한 분량으로 채우세요.",
    "- 결과에는 시스템 메시지, JSON, API, LLM, payload, fallback 같은 말이 섞이지 않게 하세요.",
  ].join("\n");
}

function buildPsychoFallbackMarkdown({ dreamText, tone, body }) {
  const intake = body?.intake && typeof body.intake === "object" ? body.intake : {};
  const snippet = cleanPsychoText(dreamText).slice(0, 180);
  const relationContext = firstPsychoText([body?.relationshipContext, intake.relationshipContext]);
  const peopleText = firstPsychoText([Array.isArray(body?.peopleInDream) ? body.peopleInDream.join(", ") : body?.peopleInDream]);
  const desireText = firstPsychoText([body?.desiredOutcome, intake.desiredOutcome]);
  const toneLabelMap = {
    happy: "밝은 확신",
    healing: "회복의 흐름",
    mixed: "겹쳐 있는 감정",
    anxious: "불안과 경계",
    neutral: "조용한 관찰",
  };
  const openingMap = {
    happy: "이 꿈은 기쁨과 관계의 확신이 부드럽게 떠오르는 장면입니다.",
    healing: "이 꿈은 지친 마음이 스스로를 돌보려는 회복의 흐름을 품고 있습니다.",
    mixed: "이 꿈은 끌림과 망설임이 함께 얽혀 있는 혼합된 감정의 장면입니다.",
    anxious: "이 꿈은 불안과 경계가 먼저 올라오지만, 그 아래에는 지키고 싶은 마음이 함께 있습니다.",
    neutral: "이 꿈은 아직 말로 다 닿지 않은 상징이 조용히 움직이고 있습니다.",
  };
  const closingMap = {
    happy: "이 꿈은 마음이 이미 알고 있는 사랑과 기쁨을 다시 확인하려는 흐름으로 읽힙니다.",
    healing: "이 꿈은 마음이 자신을 다시 품고, 천천히 회복의 숨을 고르려는 신호로 읽힙니다.",
    mixed: "이 꿈은 끌림과 주저함이 함께 있어, 둘 사이의 균형을 다시 맞추라는 뜻으로 읽힙니다.",
    anxious: "이 꿈은 불안을 밀어내기보다, 그 아래의 필요를 조용히 들어보라는 신호로 읽힙니다.",
    neutral: "이 꿈은 상징을 조금 더 지켜보면, 내면의 방향이 서서히 드러날 흐름입니다.",
  };
  const toneLabel = toneLabelMap[tone?.primary] || toneLabelMap.neutral;
  const opening = openingMap[tone?.primary] || openingMap.neutral;
  const closing = closingMap[tone?.primary] || closingMap.neutral;

  return [
    "# 정신분석 해몽 보고서",
    "",
    `당신의 꿈은 ${toneLabel}의 결로 흘러갑니다. ${snippet ? `적어주신 "${snippet}" 장면을 따라` : "꿈의 결을 따라"} 무의식이 건네는 메시지를 조용히 정리합니다.`,
    "무의식은 지금, 말보다 먼저 마음의 온도와 관계의 거리를 조심스럽게 비추고 있습니다.",
    "",
    "## Chapter 1. 꿈의 장면과 핵심 상징",
    "### 1. 꿈의 핵심 장면 요약",
    `${snippet || "꿈의 장면이 또렷이 남아 있습니다."} ${opening}`,
    "### 2. 반복되는 이미지",
    "반복되는 장면, 사람, 공간, 감정은 지금 마음이 가장 오래 붙들고 있는 주제를 가리킵니다. 같은 소재가 되풀이되면 그것은 우연보다 더 진한 신호일 수 있습니다.",
    "### 3. 상징의 첫 인상",
    `첫 인상은 대개 무의식이 가장 먼저 건네는 문장입니다. ${toneLabel}의 결이 강하다면 그 상징은 지키고 싶은 것, 다시 닿고 싶은 것, 혹은 아직 정리되지 않은 감정을 함께 담고 있을 가능성이 큽니다.`,
    "",
    "## Chapter 2. 정신분석적 해석 — 무의식의 소망과 갈등",
    "### 1. 프로이트식 소망 충족 관점",
    "프로이트식 소망 충족 관점에서는, 꿈이 겉으로 드러난 장면보다 더 깊은 바람을 대신 말해줍니다. 사랑, 인정, 안전, 통제, 해방 같은 욕구가 상징의 옷을 입고 나타납니다.",
    "### 2. 억눌린 감정의 결",
    relationContext
      ? `억눌린 감정은 대개 서툰 문장으로 꿈속에 남습니다. 관계 맥락이 "${relationContext}"이라면, 그 감정은 더 안전하게 닿고 싶은 마음과 아직 말하지 못한 두려움 사이에서 흔들리고 있을 수 있습니다.`
      : "억눌린 감정은 대개 서툰 문장으로 꿈속에 남습니다. 말하지 못한 욕구와 망설임이 함께 있을수록, 꿈은 더 진한 장면으로 감정을 대신 보여줍니다.",
    "### 3. 반복 강박과 방어",
    "반복 강박과 방어는 같은 장면을 다시 불러와, 아직 끝내지 못한 질문을 붙잡게 만듭니다. 그 방어가 서 있다고 해도, 마음이 안전을 찾으려는 방식이라고 이해하면 해석이 훨씬 부드러워집니다.",
    "",
    "## Chapter 3. 융 심리학적 해석 — 내면의 원형과 통합",
    "### 1. 그림자와 아니마/아니무스의 작용",
    peopleText
      ? `그림자와 아니마/아니무스의 작용은 내가 아직 충분히 받아들이지 못한 내면의 얼굴을 드러냅니다. "${peopleText}" 같은 존재가 나온다면, 그 인물은 관계의 거리뿐 아니라 내 안의 미처 말하지 못한 감정도 함께 비추고 있을 수 있습니다.`
      : "그림자와 아니마/아니무스의 작용은 내가 아직 충분히 받아들이지 못한 내면의 얼굴을 드러냅니다. 관계의 꿈일수록 이 작용은 더 분명해져, 끌림과 거리, 이상화와 두려움이 함께 떠오릅니다.",
    "### 2. 자아와 전체성",
    "자아와 전체성의 관점에서 보면, 꿈은 하나의 결론보다 통합의 방향을 보여줍니다. 내가 밀어낸 부분과 소중히 여기는 부분이 다시 만나야 비로소 마음이 넓게 숨을 쉽니다.",
    "### 3. 내면의 대화",
    "내면의 대화는 서로 다른 목소리가 싸우는 자리가 아니라, 각자의 필요를 알아듣는 자리입니다. 이 꿈은 지금 당신 안의 여러 층이 조용히 합의점을 찾으려는 순간일 수 있습니다.",
    "",
    "## Chapter 4. 영적 상징 해몽 — 꿈이 전하는 신비한 메시지",
    "### 1. 이 꿈이 건네는 신비로운 문장",
    `이 꿈이 건네는 신비로운 문장은 "${closing}"에 가깝습니다. 상징은 늘 정답을 외치기보다, 마음이 놓을 수 있는 방향을 조용히 가리킵니다.`,
    "### 2. 관계와 운의 결",
    "관계와 운의 결은 지금의 꿈이 누군가와의 거리, 혹은 나와 내 감정 사이의 간격을 다시 재고 있음을 보여줍니다. 가까워지고 싶은 마음이 있다면 서두르지 말고, 숨을 고르며 간격을 살펴보세요.",
    "### 3. 상징이 가리키는 방향",
    "상징이 가리키는 방향은 대개 단 하나의 결론이 아니라, 지금 손에 쥘 수 있는 다음 걸음입니다. 꿈이 밝게 흐를수록 그 방향은 더 다정하고 명료하게 열립니다.",
    "",
    "## Chapter 5. 현실 조언과 치유의 방향",
    "### 1. 오늘 할 수 있는 작은 행동",
    "- 꿈에서 가장 또렷했던 장면을 3줄로 적어 두세요.",
    "- 그 장면에서 가장 강했던 감정을 한 단어로 붙여 보세요.",
    "- 오늘 한 사람에게만, 너무 무겁지 않은 말로 마음을 건네세요.",
    "### 2. 지금의 마음에 건넬 문장",
    desireText
      ? `${toneLabel}의 꿈은 나를 몰아붙이기보다, ${desireText}에 가까운 마음을 다시 만지게 합니다. 나는 서두르지 않아도 되고, 지금의 결을 그대로 바라볼 수 있습니다.`
      : `${toneLabel}의 꿈은 나를 몰아붙이기보다, 내가 이미 알고 있던 마음을 다시 만지게 합니다. 나는 서두르지 않아도 되고, 지금의 결을 그대로 바라볼 수 있습니다.`,
    "### 3. 다음 3일의 흐름",
    "다음 3일은 결론을 서둘기보다, 반복되는 장면과 감정의 변화를 가볍게 기록하는 데 쓰세요. 기록은 무의식의 문장을 현실로 옮겨 오는 가장 부드러운 다리입니다.",
    "",
    `당신의 꿈은 ${opening} ${closing}`,
  ].join("\n");
}

function evaluatePsychoMarkdownQuality(markdown, tone) {
  const text = String(markdown || "").trim();
  const warnings = [];

  if (!text) warnings.push("empty_output");
  if ((text.match(/Chapter\s+\d+\./g) || []).length < 5) warnings.push("chapter_count");

  const missingHeaders = PSYCHO_DREAM_REQUIRED_HEADERS.filter((header) => !text.includes(header));
  if (missingHeaders.length) warnings.push("missing_headers");

  const missingPhrases = PSYCHO_DREAM_REQUIRED_PHRASES.filter((phrase) => !text.includes(phrase));
  if (missingPhrases.length) warnings.push("missing_phrases");

  if (PSYCHO_DREAM_LEAK_MARKERS.some((pattern) => pattern.test(text))) warnings.push("system_leak");
  if (text.replace(/\s+/g, " ").length < 450) warnings.push("too_short");

  const positiveHits = countPsychoMarkerHits(text, PSYCHO_DREAM_POSITIVE_MARKERS);
  const healingHits = countPsychoMarkerHits(text, PSYCHO_DREAM_HEALING_MARKERS);
  const anxiousHits = countPsychoMarkerHits(text, PSYCHO_DREAM_ANXIOUS_MARKERS);
  if ((tone?.primary === "happy" || tone?.primary === "healing" || tone?.primary === "mixed") && anxiousHits >= 2 && positiveHits + healingHits < 2) {
    warnings.push("tone_mismatch");
  }

  return {
    ok: warnings.length === 0,
    warnings,
    positiveHits,
    healingHits,
    anxiousHits,
  };
}

function extractPsychoMarkdownCandidate(aiResult) {
  if (!aiResult || !aiResult.ok) return "";
  const direct = cleanPsychoText(aiResult.text);
  if (!direct) return "";

  const parsed = parseJsonCandidate(direct);
  if (!parsed) return direct;

  const candidate = firstPsychoText([
    parsed.markdown,
    parsed.report,
    parsed.analysis,
    parsed.content,
    parsed.text,
    parsed.result,
    parsed.message,
  ]);
  return candidate || direct;
}

async function handlePsychoAnalysis(request, env = {}) {
  const body = await readJson(request);
  const normalized = normalizeDreamText(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }

  const access = await dreamPsychoAccessVerifier(request, env, body);
  if (!access?.ok) {
    const status = Number(access?.status || 402);
    return json({
      ok: false,
      code: access?.code || (status === 401 ? "LOGIN_REQUIRED" : "PAYMENT_REQUIRED"),
      message: access?.message || (status === 401 ? "로그인 후 정신분석 해몽을 이용해 주세요." : "정신분석 해몽 결제 확인이 필요합니다."),
      detail: {
        ...(access?.detail && typeof access.detail === "object" ? access.detail : {}),
        requiredFeatureKey: DREAM_PSYCHO_FEATURE_KEY,
      },
    }, { status });
  }

  const tone = normalizePsychoTone(body, normalized.text);
  const prompt = buildPsychoPrompt(body, normalized.text, tone);
  const systemPrompt = DREAM_PSYCHO_SYSTEM_PROMPT;

  const aiResult = await dreamGeminiCaller(env, prompt, {
    systemPrompt,
    // modelEnvKeys 는 callGeminiText 가 읽지 않는 옵션이라 모델 오버라이드가 적용된 적이 없었다.
    model: firstDreamPsychoModel(env),
    temperature: 0.72,
    maxOutputTokens: 6144,
    // thinking 예산을 끄지 않으면 긴 마크다운 출력이 thinking 토큰에 밀려 잘려 나가
    // 뒷장(Chapter 5 등)이 누락되고 품질 게이트에서 탈락해 폴백으로 새는 경우가 있었다.
    thinkingBudget: 0,
    timeoutMs: Number(env.DREAM_PSYCHO_PROVIDER_TIMEOUT_MS || env.DREAM_PROVIDER_TIMEOUT_MS || 55000),
    // fallbackMinChars 를 두지 않는다 — 아래 evaluatePsychoMarkdownQuality 가 이미
    // 5장 구조·필수 헤더·450자 하한을 검사해 짧은 폴백을 로컬 마크다운으로 강등시킨다.
    // 게이트를 겹쳐 걸면 같은 판정을 두 곳에서 하게 된다(CLAUDE.md 중첩 사전검사).
  });

  let markdown = extractPsychoMarkdownCandidate(aiResult);
  const aiUsed = Boolean(aiResult?.ok && cleanPsychoText(aiResult?.text));
  const aiSource = aiUsed ? "gemini" : "fallback";
  const aiMessage = cleanPsychoText(aiResult?.message || aiResult?.error || "");
  const qualityBeforeRepair = aiUsed ? evaluatePsychoMarkdownQuality(markdown, tone) : { ok: false, warnings: ["llm_unavailable"] };
  const fallbackUsed = !aiUsed || !qualityBeforeRepair.ok;

  if (fallbackUsed) {
    markdown = buildPsychoFallbackMarkdown({
      dreamText: normalized.text,
      tone,
      body,
    });
  }

  const finalQuality = evaluatePsychoMarkdownQuality(markdown, tone);

  return json({
    ok: true,
    cached: false,
    formatWarning: fallbackUsed,
    llm: {
      used: aiUsed,
      source: aiSource,
      model: cleanPsychoText(aiResult?.model) || null,
      error: aiUsed ? "" : (aiMessage || "gemini_unavailable"),
    },
    tone,
    quality: {
      ok: true,
      originalOk: qualityBeforeRepair.ok,
      fallbackUsed,
      warnings: fallbackUsed ? qualityBeforeRepair.warnings : finalQuality.warnings,
    },
    record: {
      id: `psycho-${Date.now()}`,
      markdown,
      source: aiUsed ? "gemini" : "fallback",
      model: cleanPsychoText(aiResult?.model) || (aiUsed ? "gemini" : "fallback/local"),
      createdAt: new Date().toISOString(),
    },
    message: aiUsed ? "ok" : "해몽 결과를 완성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  });
}

export async function handleDreamRoutes(request, env) {
  try {
    if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
    const path = getRoutePath(request, "/api/dream");
    if (path === "/psycho-analysis") {
      return await handlePsychoAnalysis(request, env);
    }
    if (path === "/dream-tarot") {
      return await handleDreamTarotSelection(request, env);
    }
    if (path === "/dream-prompt") {
      return await handleDreamPrompt(request, env);
    }
    if (path === "/prompt-maker") {
      return await handleDreamPromptMaker(request);
    }
    if (path === "/tarot-consult") {
      return await handleTarotConsult(request, env);
    }
    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}
