// 애니멀 토템 — '연이 종합 해설' 생성 라우트.
//
// 역할 분담이 이 라우트의 전부다:
//   · 카드 한 장 한 장의 뜻은 **클라이언트 정적 데이터가 정본**이다
//     (js/services/animal-totem-content-engine.js — 17종 × 7레이어).
//   · 여기서는 뽑힌 스프레드를 사용자의 질문 하나로 꿰는 **연결 서사만** 만든다.
//     카드 설명을 다시 쓰지 않는다(이미 화면에 있다).
// 그래서 17종 메타데이터를 서버로 복제하지 않는다. 복제하면 카피를 고칠 때마다 드리프트한다.
// 서버가 가진 유일한 동물 데이터는 id→name_ko 17개 맵이고, 용도는 두 가지뿐이다:
//   ① 입력 화이트리스트(카드 이름을 통한 프롬프트 인젝션 차단)
//   ② 뽑히지 않은 동물이 출력에 등장하면 그 필드를 폐기(선례: worker/lib/fusion-fortune.js 의 invented_tarot_card)
//
// 🔴 결제는 클라이언트가 _cdCoinGatePerUse 로 **이미 마쳤다.** 이 라우트는 증빙만 확인한다.
//    증빙 판정은 저장소 정본 헬퍼(verifyPerUsePayment) 하나로 보고, 판정 보류(proven===null)는
//    402 가 아니라 503 이다 — DB 블립을 미결제로 세탁하면 결제한 사용자가 잠긴다.
//
// 🔴 LLM 이 죽어도 환불하지 않는다. 템플릿 서사로 degrade 한다. 근거 세 가지:
//    ① autoRefundSinglePaymentDeliveryFailure 는 PortOne 카드 환불이라 코인/월정석/이용권
//       결제(이 기능의 대다수)에는 쓸 수 없고, 코인 환불은 billing.js 내부 클로저라 export 가 없다.
//    ② 레포 정책이 명시적으로 degrade 다(worker/lib/llm-result-delivery.js 의 "경량 보장 계약").
//    ③ 카드별 정적 리딩이 이미 완전해서 사용자가 빈손이 되지 않는다.
//    구현은 "템플릿을 먼저 결정론적으로 만들고 LLM 결과를 필드 단위로 병합"이다(oracle.js 선례).
//    어느 쪽이든 HTTP 200 이고, source/degraded/llmFailReason 으로 구분한다.

import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson, HttpError } from "../lib/http.js";
import { isAuthDbInfraError, requireAuth } from "../lib/auth.js";
import { logPerUsePaymentProof, verifyPerUsePayment } from "../lib/nakshatra-paid-access.js";
import { callGeminiJsonWithRetry } from "../lib/structured-consultation.js";
import { clampSyncLlmTimeoutMs } from "../lib/sync-llm-timeout.js";
import { resolveForbiddenPatterns } from "../lib/llm-leak-guard.js";
import { getAmbientAiLocale } from "../lib/ai-locale-context.js";
import { cmsPromptText } from "../lib/cms-prompts.js";

/* ────────────────────────────── 상수 ────────────────────────────── */

const BASIC_FEATURE_KEY = "animal-totem-basic";
const DEEP_FEATURE_KEY = "animal-totem-deep";

// 🔴 fallbackMinChars 는 "그 기능의 최소 분량 × 0.4"(CLAUDE.md 관례). 이걸 빼면 Workers AI 폴백이
//    8% 분량을 뱉어도 정상 결제로 전달된다. 여기서 실패로 돌리면 아래 템플릿 병합이 그대로 받는다.
const MODE_SPEC = Object.freeze({
  one: Object.freeze({
    size: 1,
    slots: Object.freeze(["today_guide"]),
    featureKey: BASIC_FEATURE_KEY,
    coinPrice: 30,
    minBodyChars: 450,
    fallbackMinChars: 360,
    baseTokens: 3000,
  }),
  three: Object.freeze({
    size: 3,
    slots: Object.freeze(["past_wound", "present_energy", "integration_path"]),
    featureKey: BASIC_FEATURE_KEY,
    coinPrice: 30,
    minBodyChars: 450,
    fallbackMinChars: 360,
    baseTokens: 3000,
  }),
  five: Object.freeze({
    size: 5,
    slots: Object.freeze(["mind", "heart", "shadow", "gift", "next_action"]),
    featureKey: DEEP_FEATURE_KEY,
    coinPrice: 50,
    minBodyChars: 800,
    fallbackMinChars: 560,
    baseTokens: 4800,
  }),
});

const SLOT_MEANING = Object.freeze({
  today_guide: "오늘 한 장의 안내",
  past_wound: "지나온 상처",
  present_energy: "지금 흐르는 기운",
  integration_path: "통합의 길",
  mind: "머리가 붙잡은 것",
  heart: "마음이 원하는 것",
  shadow: "아직 보지 않은 그늘",
  gift: "이미 지닌 선물",
  next_action: "다음 한 걸음",
});

// 입력 화이트리스트 + 환각 동물 탐지용. 카드 서술(essence/shadow/actions)은 클라가 보낸다.
const ANIMAL_NAME_BY_ID = Object.freeze({
  cat: "고양이",
  squirrel: "다람쥐",
  bluebird: "파랑새",
  puppy: "강아지",
  rabbit: "토끼",
  wolf: "늑대",
  bear: "곰",
  deer: "사슴",
  tiger: "호랑이",
  owl: "올빼미",
  eagle: "독수리",
  butterfly: "나비",
  crow: "까마귀",
  dolphin: "돌고래",
  turtle: "거북이",
  snake: "뱀",
  fox: "여우",
});

const ALL_ANIMAL_NAMES = Object.freeze(Object.values(ANIMAL_NAME_BY_ID));
const ZODIAC_ANIMALS = Object.freeze(["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"]);

// 다른 체계 용어 + 위험 소재. destiny-compass.js:126 의 FORBIDDEN 과 같은 성격이다.
const KO_FORBIDDEN = [
  /사주|명식|신살|십성|대운|세운|용신|정관|편재|편관|상관|비겁|식신/,
  /진단|처방|복용|투약|소송|고소|고발|변호사|판결/,
  /투자|주식|코인|매수|매도|수익률|원금/,
  /반드시\s*(성공|실패|이별|합격|불합격)|틀림없이|100%\s*확실/,
];

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const requestBuckets = new Map();

/* ────────────────────────────── 유틸 ────────────────────────────── */

function text(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

// 프롬프트에 들어갈 클라이언트 문자열은 제어문자·줄바꿈·백틱·대괄호를 무력화한다.
// \p{C} 는 제어·포맷 문자, \p{Zl}/\p{Zp} 는 JS 줄바꿈으로 취급되는 U+2028/U+2029 를 덮는다.
//
// 🔴 대괄호를 괄호로 바꾸는 것이 핵심이다. 이 프롬프트의 구획은 "[뽑힌 카드]" 같은 대괄호
//    머리표로 나뉘는데, 사용자가 질문에 그 문자열을 그대로 적으면 가짜 구획이 하나 더 생겨
//    모델이 뽑히지도 않은 카드 목록을 진짜로 읽는다(verify-animal-totem-reading.mjs 가 잡았다).
//    줄바꿈만 지우는 것으로는 막히지 않는다 — 이 프롬프트는 한 줄짜리 머리표로도 구획이 열린다.
function promptSafe(value, max) {
  return String(value ?? "")
    .replace(/[\p{C}\p{Zl}\p{Zp}]+/gu, " ")
    .replace(/`/g, "'")
    .replace(/\[/g, "(")
    .replace(/\]/g, ")")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function denseLength(value) {
  return String(value ?? "").replace(/\s+/g, "").length;
}

function invalidInput(message) {
  return new HttpError(400, message, { code: "INVALID_INPUT", error: "INVALID_INPUT" });
}

function checkRateLimit(userId) {
  const key = text(userId, 64) || "anon";
  const now = Date.now();
  const current = requestBuckets.get(key);
  if (!current || current.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    // 버킷이 무한히 자라지 않게 만료분을 함께 청소한다(워커 인스턴스 수명 동안만 사는 맵이다).
    if (requestBuckets.size > 512) {
      for (const [bucketKey, bucket] of requestBuckets) {
        if (bucket.resetAt <= now) requestBuckets.delete(bucketKey);
      }
    }
    return true;
  }
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}

/* ────────────────────────── 입력 정규화 ────────────────────────── */

function normalizeReadingInput(body) {
  const mode = text(body?.mode, 8);
  const spec = MODE_SPEC[mode];
  if (!spec) throw invalidInput("지원하지 않는 리딩 모드입니다.");

  const rawCards = Array.isArray(body?.cards) ? body.cards : null;
  if (!rawCards || rawCards.length !== spec.size) {
    throw invalidInput("뽑은 카드 정보가 리딩 모드와 맞지 않습니다.");
  }

  const seenIds = new Set();
  const cards = rawCards.map((raw, idx) => {
    const animalId = text(raw?.animalId, 24);
    const canonicalName = ANIMAL_NAME_BY_ID[animalId];
    if (!canonicalName) throw invalidInput("알 수 없는 동물 카드입니다.");
    if (seenIds.has(animalId)) throw invalidInput("같은 동물이 중복으로 전달됐습니다.");
    seenIds.add(animalId);

    const slot = text(raw?.slot, 24);
    if (slot !== spec.slots[idx]) throw invalidInput("카드 자리 정보가 올바르지 않습니다.");

    const actions = Array.isArray(raw?.actions)
      ? raw.actions.map((v) => promptSafe(v, 120)).filter(Boolean).slice(0, 3)
      : [];

    return {
      order: idx + 1,
      slot,
      animalId,
      // 🔴 클라가 보낸 이름을 쓰지 않고 서버 맵의 정본 이름을 쓴다(이름을 통한 인젝션 차단).
      animalName: canonicalName,
      category: promptSafe(raw?.category, 12),
      essence: promptSafe(raw?.essence, 200),
      shadow: promptSafe(raw?.shadow, 160),
      actions,
    };
  });

  return {
    mode,
    spec,
    cards,
    question: promptSafe(body?.question, 300),
    requestId: text(body?.requestId || body?.idempotencyKey || body?.transactionId || body?.purchaseId, 180),
    background: reduceBirthSeed(body?.birth),
  };
}

// 🔴 출생 PII 를 프롬프트에 넣지 않는다(destiny-compass.js:38 선례).
//    말투와 예시의 결을 고르는 데만 쓰는 3개 토큰으로 축약한다.
//    띠는 (year-4)%12 — 애니멀 토템에는 주제적으로도 맞는 배경이다.
function reduceBirthSeed(birth) {
  if (!birth || typeof birth !== "object") return null;
  const birthDate = text(birth.birthDate, 32);
  const year = Number(String(birthDate).slice(0, 4));
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return null;

  const zodiac = ZODIAC_ANIMALS[(((year - 4) % 12) + 12) % 12];
  const age = new Date().getFullYear() - year;
  const ageBand = age >= 10 && age < 100 ? `${Math.floor(age / 10) * 10}대` : "";
  const genderRaw = text(birth.gender, 12).toLowerCase();
  const gender = genderRaw === "female" || genderRaw === "여" || genderRaw === "여성"
    ? "여성"
    : genderRaw === "male" || genderRaw === "남" || genderRaw === "남성"
      ? "남성"
      : "";

  if (!zodiac && !ageBand && !gender) return null;
  return { zodiac: zodiac ? `${zodiac}띠` : "", ageBand, gender };
}

/* ─────────────────── 템플릿 서사 (항상 성공, 결정론) ─────────────────── */

function joinNames(cards) {
  return cards.map((c) => c.animalName).join(" · ");
}

function composeTemplateNarrative(input) {
  const { cards, question, mode } = input;
  const isOne = mode === "one";

  const opening = question
    ? `"${question}" — 그 마음을 안고 오셨군요. 오늘 그 질문 앞에 ${joinNames(cards)}${isOne ? "가" : "가 함께"} 찾아왔어요. 서두르지 말고 한 자리씩 천천히 짚어 볼게요.`
    : `무엇을 물어야 할지 아직 정리되지 않은 날도 있어요. 그런 마음 그대로 괜찮습니다. 오늘은 ${joinNames(cards)}${isOne ? "가" : "가 함께"} 지금의 결을 비춰 줄 거예요.`;

  const bodyParts = cards.map((card) => {
    const meaning = SLOT_MEANING[card.slot] || card.slot;
    const essence = card.essence || `${card.animalName}가 지금의 당신 곁에 머무르고 있어요.`;
    return `[${meaning}] ${card.animalName} — ${essence}`;
  });

  const tail = question
    ? `이 흐름을 하나로 모으면, "${question}"에 대한 답은 지금 당장 무엇을 더 해내는 쪽이 아니라 ${cards[cards.length - 1].animalName}가 가리키는 방향으로 한 걸음만 옮기는 쪽에 있어요.`
    : `이 흐름을 하나로 모으면, 지금 필요한 것은 더 큰 결심이 아니라 ${cards[cards.length - 1].animalName}가 가리키는 방향으로 한 걸음만 옮기는 일이에요.`;

  const questionAnswer = [...bodyParts, tail].join("\n\n");

  const cardBridges = cards.map((card) => ({
    slot: card.slot,
    animalId: card.animalId,
    line: `${SLOT_MEANING[card.slot] || card.slot} 자리의 ${card.animalName}는 지금의 질문에 대해 "${card.essence || "먼저 나의 결을 살피라"}"고 말하고 있어요.`,
  }));

  const closing = `오늘 받은 말 중 마음에 가장 오래 남는 한 줄만 붙잡아 보세요. 전부 실천하지 않아도 괜찮아요. ${cards[0].animalName}가 건넨 그 한 마디가 내일의 결을 조금 바꿔 놓을 거예요.`;

  // 카드가 이미 갖고 있는 실천안을 앞에서부터 모아 3개로 맞춘다(중복 제거).
  const pooled = [];
  const maxPerCard = Math.max(1, Math.ceil(3 / cards.length));
  cards.forEach((card) => {
    card.actions.slice(0, maxPerCard).forEach((action) => {
      if (action && !pooled.includes(action)) pooled.push(action);
    });
  });
  cards.forEach((card) => {
    card.actions.forEach((action) => {
      if (pooled.length < 3 && action && !pooled.includes(action)) pooled.push(action);
    });
  });
  while (pooled.length < 3) {
    const card = cards[pooled.length % cards.length];
    pooled.push(`${card.animalName}가 건넨 말을 오늘 하루 한 번 떠올려 보세요.`);
  }
  const actionPlan = pooled.slice(0, 3);

  let shadowGift = "";
  if (mode === "five") {
    const shadowCard = cards.find((c) => c.slot === "shadow");
    const giftCard = cards.find((c) => c.slot === "gift");
    if (shadowCard && giftCard) {
      shadowGift = `아직 보지 않은 그늘에는 ${shadowCard.animalName}가, 이미 지닌 선물에는 ${giftCard.animalName}가 앉아 있어요. `
        + `${shadowCard.shadow || `${shadowCard.animalName}의 결이 과하게 기울 때 생기는 피로`}—이건 결함이 아니라 ${giftCard.animalName}가 가진 힘의 뒷면이에요. `
        + `그늘을 없애려 애쓰기보다, 그것이 어느 힘의 그림자인지 알아보는 것만으로 균형은 이미 조금 돌아옵니다.`;
    }
  }

  return {
    opening,
    question_answer: questionAnswer,
    card_bridges: cardBridges,
    closing,
    action_plan: actionPlan,
    shadow_gift_synthesis: shadowGift,
  };
}

/* ────────────────────────────── 프롬프트 ────────────────────────────── */

/** 관리자 CMS 가 기본값을 보여줄 때 읽어 간다(worker/lib/cms-prompt-defaults.js). */
export function getDefaultSystemPrompt() {
  return buildSystemPrompt();
}

/* 관리자 프롬프트 랩 전용(lib/admin/prompt-lab-registry.mjs 참고).
   실제 상담은 사용자가 뽑은 카드를 받아야 하므로, 랩에서는 모드별 슬롯 수에 맞춰
   앞에서부터 동물을 채운 '샘플 뽑기'로 프롬프트를 조립한다. 프롬프트 구조는 프로덕션과 같고
   카드 내용만 표본이다. */
export function buildAdminLabPrompt(body = {}, options = {}) {
  const modes = Object.keys(MODE_SPEC);
  const mode = modes.includes(options.variant) ? options.variant : modes[0];
  const spec = MODE_SPEC[mode];

  const animalIds = Object.keys(ANIMAL_NAME_BY_ID).slice(0, spec.size);
  const cards = spec.slots.map((slot, index) => ({
    order: index + 1,
    slot,
    animalId: animalIds[index],
    animalName: ANIMAL_NAME_BY_ID[animalIds[index]],
    category: "샘플",
    essence: "샘플 카드입니다. 실제 상담에서는 사용자가 뽑은 카드의 본질 문장이 들어갑니다.",
    shadow: "샘플 카드의 그림자 문장입니다.",
    actions: [],
  }));

  return {
    systemPrompt: buildSystemPrompt(),
    prompt: buildUserPrompt({
      mode,
      spec,
      cards,
      question: String(body?.question || "지금 제 상황이 어떤가요?"),
      background: "",
    }),
    variantKey: mode,
    variants: modes.map((key) => ({ key, label: `${key} (${MODE_SPEC[key].size}장)` })),
    notes: ["카드 내용은 샘플입니다 — 실제 상담에서는 사용자가 뽑은 카드가 들어갑니다."],
  };
}

function resolveSystemPrompt(env) {
  return cmsPromptText(env, "animal-totem", buildSystemPrompt());
}

function buildSystemPrompt() {
  return [
    "너는 '연이의 숲'을 지키는 애니멀 토템 해설가다.",
    "",
    "뽑힌 동물 카드 하나하나의 뜻은 이미 사용자 화면에 적혀 있다. 너의 유일한 일은",
    "그 카드들을 사용자의 질문 하나로 꿰어 '연이 종합 해설'을 쓰는 것이다.",
    "카드 설명을 다시 쓰는 것이 아니라, 카드와 질문 사이의 '연결'을 쓴다.",
    "",
    "말투: 따뜻한 존댓말. 오래 봐 온 사람에게 곁에서 직접 말해 주듯 다정하고 구체적으로.",
    "      뭉뚱그린 추상어('긍정적인 에너지', '좋은 흐름', '노력하면 됩니다')와",
    "      상투적 예언투('~할 것이다', '~하게 될 것입니다')는 쓰지 않는다.",
    "",
    "좋은 해설의 흐름:",
    "· ① 질문을 안고 온 마음을 먼저 알아준다(짧게, 그 질문에 맞게 — 뻔한 위로 금지).",
    "· ② 카드가 놓인 순서대로 질문에 대한 답이 쌓이게 쓴다. 각 자리(slot)의 뜻을 반드시 살린다.",
    "· ③ 오늘·이번 주에 실제로 해볼 수 있는 '손에 잡히는 한 걸음'을 준다.",
    "",
    "엄격한 규칙:",
    "1) 아래 [뽑힌 카드]에 있는 동물만 언급한다. 목록에 없는 동물·카드·상징을 새로 만들어 내지 않는다.",
    "2) 각 동물은 정해진 '자리'가 있다. 자리의 뜻을 바꾸거나 서로 뒤섞지 않는다.",
    "3) 카드의 개별 설명을 그대로 옮겨 적지 않는다. 그건 이미 화면에 있다.",
    "4) 질문을 회피하지 않는다. 카드가 가리키는 방향을 분명히 말하되,",
    "   단정적 예언·확률·구체적 날짜 확정은 하지 않는다.",
    "5) 금지: 의료·법률·투자 판단, 질병·소송·사망 언급, 공포 조성, 제3자의 마음 단정,",
    "   그리고 사주·신살·십성·대운·용신 같은 다른 체계의 전문 용어.",
    "6) 사용자가 질문을 적지 않았으면 '지금의 마음 상태'를 질문으로 삼아 같은 구조로 쓴다.",
    "7) 출력은 JSON 객체 하나뿐이다. 코드블록·머리말·설명문을 절대 섞지 않는다.",
  ].join("\n");
}

function buildUserPrompt(input) {
  const { cards, question, background, mode, spec } = input;
  const isFive = mode === "five";
  const isKo = (getAmbientAiLocale() || "ko") === "ko";

  const slotLegend = spec.slots.map((slot) => `${slot} = ${SLOT_MEANING[slot]}`).join(" / ");

  const cardJson = JSON.stringify(
    cards.map((c) => ({
      order: c.order,
      slot: c.slot,
      animal: c.animalName,
      category: c.category,
      essence: c.essence,
      shadow: c.shadow,
    })),
    null,
    2,
  );

  return [
    "[사용자 질문]",
    question ? `"${question}"` : "(적지 않음 — '지금 이 사람의 마음 상태'를 질문으로 삼는다)",
    "",
    ...(background
      ? [
        "[사용자 배경]",
        [background.zodiac, background.ageBand, background.gender].filter(Boolean).join(" / "),
        "※ 이 배경은 말투와 예시의 결을 고르는 데만 쓴다. 운세 용어로 해석하거나 배경 자체를 화제로 삼지 않는다.",
        "",
      ]
      : []),
    "[자리의 뜻]",
    slotLegend,
    "",
    "[뽑힌 카드]",
    cardJson,
    "",
    "[출력 형식] — 아래 키 이름을 그대로 유지한다",
    '{"opening":"","question_answer":"","card_bridges":[{"slot":"","line":""}],"closing":"","action_plan":["","",""],"shadow_gift_synthesis":""}',
    "",
    "[분량 규칙]",
    "- opening: 2~3문장. 질문을 받아 안는 인사. 카드 이름은 여기서 나열하지 않는다.",
    `- question_answer: 공백 제외 ${spec.minBodyChars}자 이상. 카드 순서대로 답이 쌓이게 쓰고, 마지막에 질문에 대한 방향을 한 문장으로 못 박는다.`,
    `- card_bridges: 정확히 ${cards.length}개. slot 은 위 순서 그대로. 각 line 은 1~2문장으로, "그 카드가 이 질문에 대해 무엇을 말하는가"만 쓴다.`,
    "- closing: 2~3문장. 위로로 끝내되 다음 한 걸음을 가리킨다.",
    "- action_plan: 정확히 3개. 각 한 문장. 오늘 또는 이번 주에 실제로 끝낼 수 있는 크기로(10~20분짜리).",
    isFive
      ? "- shadow_gift_synthesis: 3~4문장. 'shadow' 자리와 'gift' 자리를 한 흐름으로 이어, 아직 보지 않은 그늘이 어떻게 이미 지닌 선물의 뒷면인지 보여준다."
      : '- shadow_gift_synthesis: "" (빈 문자열).',
    // 비-ko 는 lib/llm-client.ts 의 applyOutputLocale 이 지시를 주입한다(oracle.js:146 선례).
    ...(isKo ? ["- 한국어만 사용"] : []),
  ].filter((line) => line !== null && line !== undefined).join("\n");
}

/* ────────────────────────── 병합 · 가드 ────────────────────────── */

function safeParse(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    // callGeminiJsonWithRetry 가 폴백 코드펜스를 이미 정화하지만, 앞뒤 잡음이 남는 경우가 있다.
    const start = value.indexOf("{");
    const end = value.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      const parsed = JSON.parse(value.slice(start, end + 1));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}

// 뽑히지 않은 동물이 등장하면 그 필드는 버린다(fusion-fortune.js 의 invented_tarot_card 와 같은 성격).
function mentionsInventedAnimal(value, drawnNames) {
  const body = String(value ?? "");
  return ALL_ANIMAL_NAMES.some((name) => !drawnNames.has(name) && body.includes(name));
}

function makeFieldGuard(drawnNames) {
  const forbidden = resolveForbiddenPatterns(KO_FORBIDDEN);
  return function accept(value, minChars) {
    const body = String(value ?? "").trim();
    if (denseLength(body) < minChars) return "";
    if (forbidden.some((pattern) => pattern.test(body))) return "";
    if (mentionsInventedAnimal(body, drawnNames)) return "";
    return body;
  };
}

function mergeNarrative(template, parsed, input) {
  if (!parsed) return { narrative: template, adopted: 0 };

  const drawnNames = new Set(input.cards.map((c) => c.animalName));
  const accept = makeFieldGuard(drawnNames);
  const narrative = { ...template };
  let adopted = 0;

  const opening = accept(parsed.opening, 40);
  if (opening) { narrative.opening = opening; adopted += 1; }

  const body = accept(parsed.question_answer, input.spec.minBodyChars);
  if (body) { narrative.question_answer = body; adopted += 1; }

  const closing = accept(parsed.closing, 40);
  if (closing) { narrative.closing = closing; adopted += 1; }

  // card_bridges 는 순서·개수가 스프레드와 정확히 맞아야 카드에 붙일 수 있다.
  const bridges = Array.isArray(parsed.card_bridges) ? parsed.card_bridges : null;
  if (bridges && bridges.length === input.cards.length) {
    const merged = input.cards.map((card, idx) => {
      const line = accept(bridges[idx]?.line, 15);
      return line
        // 🔴 animalId 는 LLM 출력이 아니라 요청값을 서버가 되돌려 넣는다.
        //    클라가 문자열 매칭 없이 카드에 붙일 수 있게 하려는 것이다.
        ? { slot: card.slot, animalId: card.animalId, line }
        : null;
    });
    if (merged.every(Boolean)) { narrative.card_bridges = merged; adopted += 1; }
  }

  const plan = Array.isArray(parsed.action_plan)
    ? parsed.action_plan.map((v) => accept(v, 8)).filter(Boolean)
    : [];
  if (plan.length === 3) { narrative.action_plan = plan; adopted += 1; }

  if (input.mode === "five") {
    const synthesis = accept(parsed.shadow_gift_synthesis, 60);
    if (synthesis) { narrative.shadow_gift_synthesis = synthesis; adopted += 1; }
  }

  return { narrative, adopted };
}

/* ────────────────────────── 접근 판정 ────────────────────────── */

// 구조는 worker/routes/tarot.js 의 verifyNumerologyReadingAccess 를 그대로 따른다.
// 🔴 canAccessPaidFeature 는 부르지 않는다 — 회당결제 키에는 언제나 PAYMENT_REQUIRED 를 돌려준다
//    (worker/lib/nakshatra-paid-access.js 상단 주석). 증빙은 verifyPerUsePayment 하나로 본다.
async function verifyAnimalTotemAccess(request, env, input) {
  let auth = null;
  let authError = null;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    authError = error;
  }

  if (!auth?.userId) {
    const authStatus = Number(authError?.status) || 0;
    if (authStatus === 401 || authStatus === 403) {
      return { ok: false, status: authStatus, code: "ANIMAL_TOTEM_AUTH_REQUIRED", message: "로그인 후 리딩을 받을 수 있습니다." };
    }
    // 🔴 인증이 DB 장애로 실패한 경우를 401 로 세탁하지 않는다.
    //    결제한 사용자에게 "로그인하세요"를 띄우는 것이 이 레포의 알려진 사고 경로다.
    if (authStatus > 0 || isAuthDbInfraError(authError)) {
      return {
        ok: false,
        status: 503,
        code: "ANIMAL_TOTEM_VERIFY_UNAVAILABLE",
        message: "일시적인 서버 문제로 결제 확인이 지연되고 있습니다. 잠시 후 추가 결제 없이 다시 시도해 주세요.",
      };
    }
    return { ok: false, status: 401, code: "ANIMAL_TOTEM_AUTH_REQUIRED", message: "로그인 후 리딩을 받을 수 있습니다." };
  }

  if (!checkRateLimit(auth.userId)) {
    return { ok: false, status: 429, code: "ANIMAL_TOTEM_RATE_LIMITED", message: "요청이 몰리고 있어요. 잠시 후 다시 시도해 주세요." };
  }

  // 단건결제(Payment) → 코인/월정석(PointHistory) → 월정석 원장 → 이용권 → admin 순.
  // 🔴 이용권 커버는 차감 기록을 남기지 않는 정상 경로다. 기록 조회만으로 판정하면 보유자가 전원 막힌다.
  const proof = await verifyPerUsePayment(env, {
    userId: auth.userId,
    featureKey: input.spec.featureKey,
    coinPrice: input.spec.coinPrice,
    requestId: input.requestId,
  });
  logPerUsePaymentProof(input.spec.featureKey, proof);

  if (proof.proven === true) {
    return { ok: true, auth, accessSource: proof.source || "per_use_payment" };
  }
  // 🔴 판단 보류는 402 가 아니라 503 이다.
  if (proof.proven === null) {
    return {
      ok: false,
      status: 503,
      code: "ANIMAL_TOTEM_VERIFY_UNAVAILABLE",
      message: "일시적인 서버 문제로 결제 확인이 지연되고 있습니다. 잠시 후 추가 결제 없이 다시 시도해 주세요.",
    };
  }
  return {
    ok: false,
    status: 402,
    code: "ANIMAL_TOTEM_PAYMENT_NOT_VERIFIED",
    reason: proof.reason || "NO_RECORD",
    message: "결제 완료 내역을 확인할 수 없습니다. 카드를 다시 소환해 주세요.",
  };
}

/* ────────────────────────────── 핸들러 ────────────────────────────── */

async function handleReading(request, env) {
  const body = await readJson(request);
  // 입력 검증을 인증보다 먼저 — 잘못된 본문이 Mongo 왕복을 쓰지 않게 한다.
  const input = normalizeReadingInput(body || {});

  const access = await verifyAnimalTotemAccess(request, env, input);
  if (!access.ok) {
    return json(
      { ok: false, code: access.code, message: access.message, ...(access.reason ? { reason: access.reason } : {}) },
      { status: access.status },
    );
  }

  // 템플릿을 먼저 만든다. 이후 어떤 실패가 나도 사용자는 완결된 서사를 받는다.
  const template = composeTemplateNarrative(input);

  let ai = null;
  try {
    ai = await callGeminiJsonWithRetry(env, buildUserPrompt(input), {
      systemPrompt: await resolveSystemPrompt(env),
      taskType: "fortune",
      temperature: 0.72,
      // 🔴 timeoutMs 는 Gemini 재시도 + Workers AI 체인이 공유하는 하나의 시계다.
      //    attempts 는 그 시계를 새로 배정하므로 최악 벽시계는 attempts × timeoutMs 다.
      //    사용자가 카드를 뒤집는 10~20초 예산 안에 들도록 2×13s 로 묶는다.
      timeoutMs: clampSyncLlmTimeoutMs(Number(env?.ANIMAL_TOTEM_LLM_TIMEOUT_MS) || 13000),
      attempts: 2,
      baseTokens: input.spec.baseTokens,
      capTokens: Math.round(input.spec.baseTokens * 1.3),
      responseMimeType: "application/json",
      // 🔴 폴백을 켠 유료 라우트는 fallbackMinChars 를 반드시 함께 준다(CLAUDE.md).
      //    문턱 미달이면 호출이 실패로 돌아 아래 템플릿 병합이 그대로 받는다.
      fallbackMinChars: input.spec.fallbackMinChars,
      logContext: { requestId: input.requestId.slice(0, 120), featureKey: input.spec.featureKey },
    });
  } catch (error) {
    console.warn("[animal-totem] llm threw", String(error?.message || error).slice(0, 300));
    ai = null;
  }

  let llmFailReason = "";
  if (!ai?.ok) {
    // 🔴 ai.message 에 "LLM request failed. Gemini: …; Cloudflare Workers AI: …" 가 들어 있다.
    //    이걸 버리면 프로바이더가 죽어도 "그냥 품질 미달"로만 보인다(destiny-compass.js:188 선례).
    llmFailReason = String(ai?.error || "llm_failed");
    console.warn("[animal-totem] llm_failed", JSON.stringify({
      mode: input.mode,
      error: ai?.error || "",
      status: ai?.status ?? null,
      message: String(ai?.message || "").slice(0, 300),
    }));
  }

  const parsed = ai?.ok ? safeParse(ai.text) : null;
  if (ai?.ok && !parsed) llmFailReason = "unparseable_json";

  const { narrative, adopted } = mergeNarrative(template, parsed, input);
  const usedLlm = adopted > 0;
  if (parsed && !usedLlm) llmFailReason = llmFailReason || "all_fields_rejected";

  return json({
    ok: true,
    source: usedLlm ? "llm" : "template",
    degraded: !usedLlm,
    mode: input.mode,
    narrative,
    provider: usedLlm ? String(ai?.provider || "gemini") : "",
    model: usedLlm ? String(ai?.model || "") : "",
    llmFailReason,
    accessSource: access.accessSource || "",
  });
}

export async function handleAnimalTotemRoutes(request, env) {
  try {
    const path = getRoutePath(request, "/api/animal-totem");
    const method = String(request.method || "").toUpperCase();
    if (method === "OPTIONS") return new Response(null, { status: 204 });

    if (path === "/reading") {
      if (method !== "POST") return methodNotAllowed();
      return await handleReading(request, env);
    }
    return notFound();
  } catch (error) {
    // 🔴 context 를 넘겨야 requestId 가 응답에 실린다(tarot.js:1686 이 문서화한 버그).
    return handleRouteError(error, {
      request,
      env,
      trace: { route: "api/animal-totem", method: String(request?.method || "") },
    });
  }
}

export const __animalTotemTestUtils = {
  normalizeReadingInput,
  composeTemplateNarrative,
  mergeNarrative,
  reduceBirthSeed,
  buildUserPrompt,
  MODE_SPEC,
  ANIMAL_NAME_BY_ID,
};
