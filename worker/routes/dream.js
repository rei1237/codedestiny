import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { callGeminiText } from "../lib/gemini.js";
import { canAccessPaidFeature } from "../lib/paid-feature-access.js";

const DREAM_PSYCHO_FEATURE_KEY = "dream-psycho-analysis";
const DREAM_PSYCHO_FEATURE_REASON = "정신분석 해몽";
const DREAM_PSYCHO_GEMINI_MODEL_KEYS = Object.freeze([
  "DREAM_PSYCHO_GEMINI_MODEL",
  "PSYCHO_DREAM_GEMINI_MODEL",
  "GEMINI_MODEL",
]);

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

async function verifyPsychoDreamAccess(request, env = {}) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return { ok: false, status: 401, code: "LOGIN_REQUIRED", message: "로그인 후 정신분석 해몽을 이용해 주세요." };
    }
    throw error;
  }

  const decision = await canAccessPaidFeature(auth.userId, DREAM_PSYCHO_FEATURE_KEY, {
    env,
    reason: DREAM_PSYCHO_FEATURE_REASON,
  });
  if (decision?.allowed) {
    return {
      ok: true,
      auth,
      accessType: String(decision.licenseType || decision.accessSource || "paid").trim(),
      accessSource: String(decision.accessSource || decision.reason || "").trim(),
    };
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

const DREAM_TAROT_CARDS = [
  { id: 0, name: "The Fool", nameKo: "바보", arcana: "major", keywords: ["시작", "자유", "도약"], dreamMeaning: "익숙한 경계 밖으로 나가려는 마음이 떠오릅니다. 두려움보다 가능성의 문이 먼저 열립니다.", uprightMeaning: "새 출발, 모험, 순수한 가능성", reversedMeaning: "충동, 준비 부족, 방향 상실" },
  { id: 1, name: "The Magician", nameKo: "마법사", arcana: "major", keywords: ["의지", "창조", "실행"], dreamMeaning: "흩어진 재료를 하나의 의식으로 묶으려는 힘이 강하게 떠오릅니다. 마음속 도구가 깨어나는 징조입니다.", uprightMeaning: "능력 발현, 집중, 구현", reversedMeaning: "분산, 속임수, 잠재력 지연" },
  { id: 2, name: "The High Priestess", nameKo: "여사제", arcana: "major", keywords: ["직감", "비밀", "무의식"], dreamMeaning: "겉으로 드러나지 않은 감정과 기억이 물밑에서 움직입니다. 침묵 속의 신호가 선명해지는 때입니다.", uprightMeaning: "직관, 내면의 지혜, 은밀한 진실", reversedMeaning: "억눌린 직감, 혼란, 닫힌 내면" },
  { id: 3, name: "The Empress", nameKo: "여황제", arcana: "major", keywords: ["돌봄", "풍요", "감각"], dreamMeaning: "몸과 감정이 더 부드러운 안식처를 찾고 있습니다. 관계와 창조성의 온기가 흐릅니다.", uprightMeaning: "풍요, 양육, 창조적 성장", reversedMeaning: "과잉보호, 결핍감, 돌봄의 고갈" },
  { id: 4, name: "The Emperor", nameKo: "황제", arcana: "major", keywords: ["질서", "통제", "책임"], dreamMeaning: "흔들리는 상황을 붙들고 싶은 의지가 드러납니다. 경계와 구조를 다시 세우려는 마음입니다.", uprightMeaning: "안정, 권위, 책임 있는 결정", reversedMeaning: "경직, 통제 불안, 권위와의 긴장" },
  { id: 5, name: "The Hierophant", nameKo: "교황", arcana: "major", keywords: ["규범", "가르침", "의식"], dreamMeaning: "오래된 믿음과 사회적 약속이 꿈의 배경에 머무릅니다. 배운 것과 진짜 마음 사이의 문턱이 비칩니다.", uprightMeaning: "전통, 조언, 제도적 지혜", reversedMeaning: "관습 저항, 내면의 신념 재정립" },
  { id: 6, name: "The Lovers", nameKo: "연인", arcana: "major", keywords: ["선택", "결합", "관계"], dreamMeaning: "누군가와의 연결, 혹은 자기 안의 두 갈래 마음이 서로를 부릅니다. 중요한 선택의 온도가 흐릅니다.", uprightMeaning: "사랑, 조화, 가치 선택", reversedMeaning: "불일치, 망설임, 관계의 균열" },
  { id: 7, name: "The Chariot", nameKo: "전차", arcana: "major", keywords: ["전진", "의지", "방향"], dreamMeaning: "움직이고 돌파하려는 힘이 강합니다. 속도와 통제 사이의 균형이 꿈속에서 시험받습니다.", uprightMeaning: "승리, 추진력, 자기 통제", reversedMeaning: "폭주, 지연, 방향 혼선" },
  { id: 8, name: "Strength", nameKo: "힘", arcana: "major", keywords: ["용기", "절제", "내면"], dreamMeaning: "거친 감정과 본능을 부드럽게 다루려는 힘이 떠오릅니다. 억누름보다 다정한 통제가 필요합니다.", uprightMeaning: "용기, 인내, 따뜻한 통제", reversedMeaning: "위축, 분노, 자신감 저하" },
  { id: 9, name: "The Hermit", nameKo: "은둔자", arcana: "major", keywords: ["탐색", "고독", "성찰"], dreamMeaning: "혼자만의 길에서 답을 찾으려는 마음이 비칩니다. 외부보다 내면의 등불이 가까워집니다.", uprightMeaning: "내면 탐구, 신중함, 지혜", reversedMeaning: "고립, 회피, 닫힌 사유" },
  { id: 10, name: "Wheel of Fortune", nameKo: "운명의 수레바퀴", arcana: "major", keywords: ["전환", "흐름", "반복"], dreamMeaning: "반복되던 흐름이 다른 국면으로 돌아서려 합니다. 우연처럼 보이는 변화가 문턱에 머무릅니다.", uprightMeaning: "변화, 기회, 순환의 전환", reversedMeaning: "정체, 반복, 흐름 저항" },
  { id: 11, name: "Justice", nameKo: "정의", arcana: "major", keywords: ["균형", "판단", "책임"], dreamMeaning: "마음이 어떤 선택의 무게를 재고 있습니다. 공정함과 죄책감의 저울이 꿈속에 놓입니다.", uprightMeaning: "균형, 진실, 책임 있는 판단", reversedMeaning: "불균형, 회피, 억울함" },
  { id: 12, name: "The Hanged Man", nameKo: "매달린 사람", arcana: "major", keywords: ["정지", "희생", "관점"], dreamMeaning: "멈춤 속에서 다른 시야가 열립니다. 당장 움직이기보다 거꾸로 바라볼 시간이 다가옵니다.", uprightMeaning: "관점 전환, 수용, 기다림", reversedMeaning: "무기력, 지연, 억지 희생" },
  { id: 13, name: "Death", nameKo: "죽음", arcana: "major", keywords: ["종결", "변화", "탈피"], dreamMeaning: "끝난 것을 놓고 새 껍질로 건너가려는 흐름입니다. 상실보다 변형의 기운이 깊습니다.", uprightMeaning: "종료, 전환, 재생", reversedMeaning: "미련, 변화 거부, 오래된 집착" },
  { id: 14, name: "Temperance", nameKo: "절제", arcana: "major", keywords: ["조율", "회복", "균형"], dreamMeaning: "서로 다른 감정의 물줄기가 한 그릇 안에서 섞입니다. 치유와 조절의 리듬이 흐릅니다.", uprightMeaning: "조화, 절제, 회복", reversedMeaning: "과잉, 불균형, 조급함" },
  { id: 15, name: "The Devil", nameKo: "악마", arcana: "major", keywords: ["집착", "욕망", "속박"], dreamMeaning: "끊기 어려운 유혹이나 두려움이 그림자처럼 붙어 있습니다. 묶인 곳을 알아차리는 꿈입니다.", uprightMeaning: "집착, 욕망, 얽매임", reversedMeaning: "해방의 시작, 속박 인식, 유혹에서 벗어남" },
  { id: 16, name: "The Tower", nameKo: "탑", arcana: "major", keywords: ["붕괴", "충격", "각성"], dreamMeaning: "붙들고 있던 구조가 흔들리며 숨은 진실이 드러납니다. 추락과 폭발은 갑작스러운 각성을 가리킵니다.", uprightMeaning: "급변, 붕괴, 깨달음", reversedMeaning: "변화 지연, 내부 균열, 충격 회피" },
  { id: 17, name: "The Star", nameKo: "별", arcana: "major", keywords: ["희망", "회복", "영감"], dreamMeaning: "어두운 장면 속에서도 회복의 빛이 남아 있습니다. 소망과 미래의 감각이 조용히 비칩니다.", uprightMeaning: "희망, 치유, 영감", reversedMeaning: "낙담, 믿음 약화, 회복 지연" },
  { id: 18, name: "The Moon", nameKo: "달", arcana: "major", keywords: ["무의식", "환상", "불안"], dreamMeaning: "모호한 감정과 상징이 깊은 밤의 물결처럼 출렁입니다. 불안은 숨은 직감의 문을 두드립니다.", uprightMeaning: "무의식, 꿈, 직관, 불확실성", reversedMeaning: "혼란의 해소, 두려움 직면, 진실의 윤곽" },
  { id: 19, name: "The Sun", nameKo: "태양", arcana: "major", keywords: ["명료함", "활력", "기쁨"], dreamMeaning: "어둠 뒤에 밝아지는 이해가 떠오릅니다. 몸과 마음이 더 단순한 진실을 향합니다.", uprightMeaning: "기쁨, 성공, 명료함", reversedMeaning: "활력 저하, 과한 낙관, 흐린 확신" },
  { id: 20, name: "Judgement", nameKo: "심판", arcana: "major", keywords: ["각성", "부름", "재평가"], dreamMeaning: "과거의 장면이 다시 떠올라 새로운 응답을 요구합니다. 오래 미뤄둔 부름이 선명해집니다.", uprightMeaning: "각성, 소명, 재탄생", reversedMeaning: "자기비판, 회피, 부름을 미룸" },
  { id: 21, name: "The World", nameKo: "세계", arcana: "major", keywords: ["완성", "통합", "순환"], dreamMeaning: "흩어진 경험이 하나의 원으로 묶이려 합니다. 마침과 시작이 같은 문에서 만납니다.", uprightMeaning: "완성, 성취, 통합", reversedMeaning: "미완성, 지연, 마무리 부족" },
];

const DREAM_THEME_RULES = [
  { pattern: /(떨어|추락|낙하|무너|붕괴|폭발|지진)/i, cards: [16, 18, 12], themes: ["추락", "통제 상실", "각성"] },
  { pattern: /(날|비행|하늘|구름|새|공중)/i, cards: [0, 17, 19], themes: ["자유", "도약", "가능성"] },
  { pattern: /(물|바다|강|호수|비|홍수|파도|잠수)/i, cards: [18, 14, 2], themes: ["감정", "무의식", "정화"] },
  { pattern: /(쫓|도망|괴물|귀신|공포|위협|숨)/i, cards: [15, 18, 7], themes: ["두려움", "그림자", "회피"] },
  { pattern: /(죽|장례|무덤|끝|헤어|이별|사라)/i, cards: [13, 20, 10], themes: ["종결", "변형", "재탄생"] },
  { pattern: /(집|방|문|계단|학교|회사|사무실|건물)/i, cards: [4, 5, 9], themes: ["구조", "역할", "내면의 방"] },
  { pattern: /(가족|엄마|아빠|아이|아기|연인|친구|결혼)/i, cards: [6, 3, 11], themes: ["관계", "애착", "선택"] },
  { pattern: /(시험|지각|실패|점수|판단|혼남)/i, cards: [11, 5, 9], themes: ["평가", "책임", "불안"] },
  { pattern: /(차|기차|버스|길|여행|운전|역|공항)/i, cards: [7, 10, 0], themes: ["이동", "전환", "진로"] },
  { pattern: /(동물|개|고양이|뱀|사자|말|새)/i, cards: [8, 18, 15], themes: ["본능", "감각", "그림자"] },
  { pattern: /(거울|얼굴|알몸|몸|피부|머리|눈)/i, cards: [2, 11, 18], themes: ["자기상", "비밀", "민감함"] },
  { pattern: /(불|화재|태양|빛|번개|뜨거)/i, cards: [19, 16, 1], themes: ["열망", "폭로", "활력"] },
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

function chooseFallbackDreamCards(dreamText, requestedCount = 3) {
  const cardCount = clampDreamCardCount(requestedCount);
  const scores = new Map(DREAM_TAROT_CARDS.map((card) => [card.id, 0]));
  const themes = [];

  for (const rule of DREAM_THEME_RULES) {
    if (!rule.pattern.test(dreamText)) continue;
    themes.push(...rule.themes);
    rule.cards.forEach((id, idx) => scores.set(id, (scores.get(id) || 0) + 12 - idx * 2));
  }

  if (/(불안|무서|두려|긴장|혼란|이상)/i.test(dreamText)) scores.set(18, (scores.get(18) || 0) + 8);
  if (/(기쁨|편안|따뜻|행복|웃)/i.test(dreamText)) scores.set(19, (scores.get(19) || 0) + 8);
  if (/(선택|갈림|고민|결정)/i.test(dreamText)) scores.set(6, (scores.get(6) || 0) + 8);
  if (/(반복|계속|또|다시)/i.test(dreamText)) scores.set(10, (scores.get(10) || 0) + 8);

  const ranked = DREAM_TAROT_CARDS
    .map((card) => ({ id: card.id, score: scores.get(card.id) || 0 }))
    .sort((a, b) => b.score - a.score || a.id - b.id)
    .map((entry) => entry.id);

  const selected = [];
  for (const id of ranked) {
    if ((scores.get(id) || 0) <= 0) break;
    selected.push(id);
    if (selected.length >= cardCount) break;
  }

  const fallbackIds = [18, 2, 16, 17, 10, 13, 6, 7, 14, 21, 0, 11];
  let offset = 0;
  while (selected.length < cardCount) {
    const id = fallbackIds[seededIndex(dreamText, offset, fallbackIds.length)];
    if (!selected.includes(id)) selected.push(id);
    offset += 1;
  }

  const selectedCardIds = selected.slice(0, cardCount);
  return {
    cardCount,
    selectedCardIds,
    dreamThemes: uniqueList(themes.length ? themes : inferDreamThemes(dreamText), 5),
    analysisNote: buildDreamAnalysisNote(dreamText, selectedCardIds),
    cards: selectedCardIds.map((id) => DREAM_TAROT_CARDS.find((card) => card.id === id)).filter(Boolean),
  };
}

function buildDreamAnalysisNote(dreamText, selectedCardIds) {
  const names = selectedCardIds
    .map((id) => DREAM_TAROT_CARDS.find((card) => card.id === id)?.nameKo)
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
    const id = Number.parseInt(entry?.id, 10);
    const base = DREAM_TAROT_CARDS.find((card) => card.id === id)
      || DREAM_TAROT_CARDS.find((card) => card.nameKo === entry?.nameKo)
      || DREAM_TAROT_CARDS[idx % DREAM_TAROT_CARDS.length];
    return {
      id: base.id,
      name: base.name,
      nameKo: String(entry?.nameKo || base.nameKo).trim(),
      isReversed: Boolean(entry?.isReversed || entry?.reversed || entry?.orientation === "reversed"),
      keywords: uniqueList(Array.isArray(entry?.keywords) && entry.keywords.length ? entry.keywords : base.keywords, 4),
      dreamMeaning: String(entry?.dreamMeaning || base.dreamMeaning).trim(),
      uprightMeaning: base.uprightMeaning,
      reversedMeaning: base.reversedMeaning,
    };
  });
}

function buildDreamPromptFallback({ dreamText, dreamThemes, cards }) {
  const compact = compactDreamText(dreamText, 260);
  const themeLine = uniqueList(dreamThemes, 5).join(", ") || "무의식, 감정의 잔향";
  const cardLine = cards.map((card) => {
    const orientation = card.isReversed ? "역방향" : "정방향";
    const keywords = uniqueList(card.keywords, 3).join(", ");
    return `${card.nameKo}(${orientation}: ${keywords})`;
  }).join(" / ");

  return [
    `다음 꿈을 타로와 꿈 심리학의 관점으로 깊이 해석해 주세요. 꿈의 원문은 "${compact}"입니다.`,
    `중심 주제는 ${themeLine}이며, 뽑힌 카드는 ${cardLine}입니다.`,
    "각 카드가 꿈의 장면, 감정, 인물, 장소와 어떻게 맞물리는지 살피고, 정방향과 역방향의 결을 구분해 주세요.",
    "융의 무의식, 그림자, 상징 원형의 관점을 자연스럽게 엮어 현재 내면에서 강하게 떠오르는 메시지를 짚어 주세요.",
    "마지막에는 제가 오늘 붙들어야 할 한 문장, 현실에서 실천할 작은 의식, 그리고 스스로에게 던질 질문 3가지를 남겨 주세요.",
  ].join(" ");
}

async function handleDreamTarotSelection(request) {
  const body = await readJson(request);
  const normalized = normalizeDreamText(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }

  const selection = chooseFallbackDreamCards(normalized.text, body?.cardCount || body?.count || 3);
  return json({
    ok: true,
    cached: false,
    ...selection,
    source: "local",
    model: "local-symbol-matcher",
    message: "ok",
  });
}

async function handleDreamPrompt(request) {
  const body = await readJson(request);
  const normalized = normalizeDreamText(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }

  let cards = normalizeDreamPromptCards(body?.cards);
  if (!cards.length) {
    cards = chooseFallbackDreamCards(normalized.text, body?.cardCount || 3).cards.map((card) => ({
      ...card,
      isReversed: false,
    }));
  }
  const dreamThemes = uniqueList(body?.dreamThemes || inferDreamThemes(normalized.text), 5);
  const dreamPrompt = buildDreamPromptFallback({ dreamText: normalized.text, dreamThemes, cards });

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
    "- 반드시 다섯 장으로 나누어 쓰세요.",
    "- Chapter 1부터 Chapter 5까지 순서와 제목을 지키세요.",
    "- 각 장에는 짧은 소제목과 자연스러운 해석 문장을 함께 적으세요.",
    "- 마지막 장에는 오늘 바로 할 수 있는 작은 행동을 반드시 넣으세요.",
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
  const systemPrompt = [
    "당신은 정신분석 해몽가입니다.",
    "말투는 전문적이되 지나치게 기술적이지 않게 유지하고, 꿈의 정서를 먼저 읽으세요.",
    "행복한 꿈은 불안 템플릿으로 밀어 넣지 말고, 긴장된 꿈은 소망과 방어를 균형 있게 다루세요.",
    "출력은 5장 구조의 Markdown으로 자연스럽게 정리하세요.",
  ].join(" ");

  const aiResult = await dreamGeminiCaller(env, prompt, {
    systemPrompt,
    modelEnvKeys: DREAM_PSYCHO_GEMINI_MODEL_KEYS,
    temperature: 0.72,
    maxOutputTokens: 6144,
    timeoutMs: Number(env.DREAM_PSYCHO_PROVIDER_TIMEOUT_MS || env.DREAM_PROVIDER_TIMEOUT_MS || 55000),
    totalTimeoutMs: Number(env.DREAM_PSYCHO_TOTAL_TIMEOUT_MS || 30000),
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
      return await handleDreamTarotSelection(request);
    }
    if (path === "/dream-prompt") {
      return await handleDreamPrompt(request);
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
