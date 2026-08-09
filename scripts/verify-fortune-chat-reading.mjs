#!/usr/bin/env node
/**
 * 연이 운명 상담(fortune-chat) 결과 계약 검증 — **mock 기본**.
 *
 * 무료 3회 이후 1회 5,000원을 받게 되면서 분량 계약을 800~1,500자에서 1,500~2,500자로
 * 올리고 evidenceLines·followUpQuestions 를 추가했다. 이 스크립트는 프로바이더 응답을
 * 주입해 그 계약이 지켜지는지, 폴백이 하한을 채우는지, 대화 맥락이 프롬프트에 실리는지를
 * 확인한다.
 *
 * 🔴 실제 모델 호출은 하지 않는다. providerCall 을 주입해 가짜 응답만 흘린다
 *    (정본 패턴: scripts/verify-mindscan-reading.mjs 의 fetchImpl 주입).
 *    실호출이 필요하면 사용자 허락을 먼저 받고 별도 플래그를 만들 것.
 *
 * 사용: node scripts/verify-fortune-chat-reading.mjs
 */
import { buildGuardianFortuneContext } from "../worker/lib/guardian-fortune-context.js";
import { buildGuardianFortunePrompt } from "../worker/lib/guardian-fortune-prompt.js";
import { generateGuardianFortuneWithRealLLM } from "../worker/lib/guardian-fortune-llm.js";
import {
  buildFallbackGuardianFortuneResult,
  countGuardianFortuneVisibleTextLength,
  validateAndNormalizeGuardianFortuneResult,
} from "../worker/lib/guardian-fortune-result.js";
import {
  GUARDIAN_FORTUNE_LIST_LIMITS,
  GUARDIAN_FORTUNE_RESULT_LENGTH,
} from "../worker/lib/guardian-fortune-runtime-contract.js";

const TOPICS = ["daily", "love", "money_work", "relationship", "mind", "decision"];
const CATEGORIES = ["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot"];
const MODES = ["yeoni", "neo"];

const failures = [];
function check(label, condition, detail = "") {
  if (condition) return;
  failures.push(detail ? `${label} — ${detail}` : label);
}

/** 실제 계산기를 돌리지 않고 어댑터 결과만 흉내낸다(오프라인·결정론). */
const ADAPTER_STUBS = {
  saju: { dayMaster: "갑목", currentFlowSummary: "정리한 기준을 행동으로 옮기는 흐름", personalityHook: "먼저 말하기보다 상황을 재는 편" },
  ziwei: { lifePalaceSummary: "명궁의 역할을 차분히 정리하는 흐름", topicPalaceSummary: "관록궁의 책임을 조율하는 흐름" },
  vedic: { moonSignSummary: "달의 감정 리듬을 살피는 흐름", nakshatraSummary: "반복되는 회복 습관", innerRhythm: "감정의 속도를 알아차리는 리듬" },
  sukuyo: { birthMansion: "묘숙", relationshipPattern: "관계의 거리를 천천히 맞추는 흐름", distancePattern: "먼저 다가가기보다 기다리는 편" },
  astrology: { sunSummary: "태양의 목표 방향", moonSummary: "달의 정서적 안정", currentMoodSummary: "기준을 먼저 확인하는 흐름" },
  tarot: { spreadType: "one_card", symbolicMessage: "지금 선택의 상징", cards: [{ name: "별", orientation: "upright", positionKey: "today", meaningSummary: "회복과 방향" }] },
};

function adaptersFor(category) {
  return { [category]: async () => ADAPTER_STUBS[category] };
}

const BASE_INPUT = {
  birthDate: "1995-04-18",
  birthTime: "08:30",
  calendarType: "solar",
  gender: "female",
  birthPlace: { city: "서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" },
};

async function contextFor({ topic, category, mode, recentTurns }) {
  const built = await buildGuardianFortuneContext(
    { ...BASE_INPUT, topic, category, mode, recentTurns },
    { adapters: adaptersFor(category), now: new Date("2026-08-07T03:00:00.000Z") },
  );
  if (!built.ok) throw new Error(`context failed: ${topic}/${category} ${built.errorCode}`);
  return built.context;
}

// ── 1. 폴백이 새 하한을 채우는가 ────────────────────────────────────────────
// 폴백은 프로바이더가 죽었을 때 결제한 사용자에게 나가는 결과물이다. 여기가 하한을
// 못 채우면 검증이 통째로 실패해 사용자는 아무것도 못 받는다.
{
  let worst = Number.POSITIVE_INFINITY;
  for (const topic of TOPICS) {
    for (const category of CATEGORIES) {
      for (const mode of MODES) {
        const context = await contextFor({ topic, category, mode });
        const input = { ...BASE_INPUT, topic, category, mode };
        const fallback = buildFallbackGuardianFortuneResult({ input, context, reason: "verify" });
        const validated = validateAndNormalizeGuardianFortuneResult({ parsed: fallback, input, context });
        check(`fallback ${topic}/${category}/${mode}`, validated.ok, (validated.issues || []).join(","));
        if (validated.ok) worst = Math.min(worst, validated.length);
        check(`fallback lists ${topic}/${category}/${mode}`,
          (fallback.followUpQuestions || []).length === GUARDIAN_FORTUNE_LIST_LIMITS.followUpQuestions.min
            && (fallback.evidenceLines || []).length >= GUARDIAN_FORTUNE_LIST_LIMITS.evidenceLines.min);
      }
    }
  }
  console.log(`[fallback] 72 combos · 최소 본문 ${worst}자 (하한 ${GUARDIAN_FORTUNE_RESULT_LENGTH.min})`);
}

// ── 2. 짧은 모델 응답이 하한까지 보강되는가 ─────────────────────────────────
{
  const context = await contextFor({ topic: "love", category: "sukuyo", mode: "yeoni" });
  const input = { ...BASE_INPUT, topic: "love", category: "sukuyo", mode: "yeoni" };
  const short = {
    title: "오늘의 귀인 운세",
    openingLine: "지금 마음이 조금 무거워 보여요.",
    innerState: "기다림이 길어지고 있어요.",
    coreReading: "관계의 거리를 재고 있어요.",
    topicAdvice: "한 문장만 줄여보세요.",
    cautionPattern: "혼자 결론내기.",
    luckyAction: "짧게 안부만 물어보세요.",
    evidenceLines: ["묘숙의 거리 감각이 이번 해석의 중심입니다."],
    followUpQuestions: ["먼저 연락해도 될까요?"],
    premiumCta: { ctaKey: "sukuyo_compatibility", reason: "더 깊게 볼 수 있어요." },
    shareText: "오늘 내 관계 속도를 다시 봤어.",
  };
  const validated = validateAndNormalizeGuardianFortuneResult({ parsed: short, input, context });
  check("short result is enriched to the floor", validated.ok, (validated.issues || []).join(","));
  if (validated.ok) {
    check("enriched length within contract",
      validated.length >= GUARDIAN_FORTUNE_RESULT_LENGTH.min && validated.length <= GUARDIAN_FORTUNE_RESULT_LENGTH.max,
      `length=${validated.length}`);
    check("missing follow-ups are backfilled", (validated.value.followUpQuestions || []).length === 3);
    check("missing evidence is backfilled", (validated.value.evidenceLines || []).length >= 3);
    console.log(`[enrich] 짧은 응답 ${countGuardianFortuneVisibleTextLength(short)}자 → ${validated.length}자`);
  }
}

// ── 3. 과한 응답이 상한으로 잘리는가 ────────────────────────────────────────
{
  const context = await contextFor({ topic: "money_work", category: "saju", mode: "neo" });
  const input = { ...BASE_INPUT, topic: "money_work", category: "saju", mode: "neo" };
  const base = buildFallbackGuardianFortuneResult({ input, context, reason: "verify" });
  const bloated = { ...base, coreReading: `${base.coreReading} ${"오늘의 흐름은 순서를 정리할수록 선명해집니다. ".repeat(60)}` };
  const validated = validateAndNormalizeGuardianFortuneResult({ parsed: bloated, input, context });
  check("long result is trimmed into the contract", validated.ok, (validated.issues || []).join(","));
  if (validated.ok) console.log(`[trim] 과다 응답 → ${validated.length}자 (상한 ${GUARDIAN_FORTUNE_RESULT_LENGTH.max})`);
}

// ── 4. 대화 맥락이 프롬프트에 실리는가 / 민감정보 턴이 걸러지는가 ───────────
{
  const recentTurns = [
    { speaker: "user", text: "요즘 이직을 고민 중이에요." },
    { speaker: "assistant", text: "지금은 조건을 먼저 정리할 때예요." },
    { speaker: "user", text: "제 주민등록번호는 900101-1234567 이에요." },
  ];
  const context = await contextFor({ topic: "money_work", category: "saju", mode: "neo", recentTurns });
  const prompt = buildGuardianFortunePrompt({ input: { ...BASE_INPUT, topic: "money_work", category: "saju", mode: "neo" }, context });
  check("recent turns reach the prompt", prompt.userPrompt.includes("이직을 고민"));
  check("assistant turns are labelled", prompt.userPrompt.includes("상담자:"));
  check("a turn holding sensitive data is dropped", !prompt.userPrompt.includes("900101"));
  console.log(`[context] 최근 턴 ${context.recentTurns.length}개 반영, 민감정보 턴 제외`);
}

// ── 5. 두 페르소나가 서로 다른 구성 지시를 받는가 ──────────────────────────
{
  const context = await contextFor({ topic: "decision", category: "ziwei", mode: "yeoni" });
  const yeoni = buildGuardianFortunePrompt({ input: { ...BASE_INPUT, topic: "decision", category: "ziwei", mode: "yeoni" }, context });
  const neo = buildGuardianFortunePrompt({ input: { ...BASE_INPUT, topic: "decision", category: "ziwei", mode: "neo" }, context: { ...context, inputSummary: { ...context.inputSummary, mode: "neo" } } });
  check("yeoni leads with feelings", yeoni.systemPrompt.includes("마음을 먼저"));
  check("neo leads with the conclusion", neo.systemPrompt.includes("결론을 첫 문장에 먼저"));
  check("the two personas differ", yeoni.systemPrompt !== neo.systemPrompt);
  console.log("[persona] 연이=마음→흐름→행동 / 네오=결론→근거→수순");
}

// ── 6. 프로바이더가 죽어도 결제한 사용자가 결과를 받는가 ───────────────────
// providerCall 을 주입해 실패를 흉내낸다. 실제 Gemini 는 호출하지 않는다.
{
  const context = await contextFor({ topic: "mind", category: "astrology", mode: "yeoni" });
  const input = { ...BASE_INPUT, topic: "mind", category: "astrology", mode: "yeoni" };
  const env = {
    ENABLE_GUARDIAN_FORTUNE_REAL_LLM: "true",
    ALLOW_REAL_GUARDIAN_FORTUNE_LLM: "true",
    ENABLE_GUARDIAN_FORTUNE_API: "true",
    GUARDIAN_FORTUNE_LLM_PROVIDER: "gemini",
    NODE_ENV: "staging",
  };
  let calls = 0;
  const generated = await generateGuardianFortuneWithRealLLM({
    input,
    context,
    env,
    requestId: "verify-fortune-chat",
    providerCall: async () => { calls += 1; return { ok: false, error: "timeout", status: 504 }; },
    metricSink: () => {},
  });
  check("no real provider was contacted beyond the injected stub", calls >= 1);
  check("a dead provider still delivers a reading", generated.deliverable === true && Boolean(generated.result));
  check("the fallback reading meets the length floor",
    countGuardianFortuneVisibleTextLength(generated.result || {}) >= GUARDIAN_FORTUNE_RESULT_LENGTH.min);
  console.log(`[fallback-path] provider 실패 → 폴백 ${countGuardianFortuneVisibleTextLength(generated.result || {})}자 전달`);
}

// ── 폴백 사다리: Gemini → Workers AI 체인 → 결정론 템플릿 ────────────────────────
// 예전에는 fallbackToWorkersAI:false 라 Gemini 가 죽으면 곧바로 템플릿이었다. 유료 상담이
// 같은 골격의 문구로 나가는 셈이라 실제 리딩 한 겹을 사이에 넣었고, 그 계약을 여기 고정한다.
{
  const input = { ...BASE_INPUT, category: "saju", topic: "money_work", mode: "yeoni" };
  const context = await contextFor({ topic: "money_work", category: "saju", mode: "yeoni" });
  const env = {
    ENABLE_GUARDIAN_FORTUNE_REAL_LLM: "true",
    ALLOW_REAL_GUARDIAN_FORTUNE_LLM: "true",
    ENABLE_GUARDIAN_FORTUNE_API: "true",
    GUARDIAN_FORTUNE_LLM_PROVIDER: "gemini",
    NODE_ENV: "staging",
  };

  let seenOptions = null;
  await generateGuardianFortuneWithRealLLM({
    input,
    context,
    env,
    providerCall: async (_env, _prompt, options) => { seenOptions = options; return { ok: false, error: "probe" }; },
    metricSink: () => {},
  });

  check("Workers AI 폴백이 꺼져 있지 않다", seenOptions?.fallbackToWorkersAI !== false,
    `fallbackToWorkersAI=${String(seenOptions?.fallbackToWorkersAI)}`);
  // 🔴 유료 라우트에 폴백을 켜면 fallbackMinChars 가 필수다(CLAUDE.md). 관례는 최소 분량 × 0.4.
  const expectedFloor = Math.round(GUARDIAN_FORTUNE_RESULT_LENGTH.min * 0.4);
  check("짧은 폴백 차단 문턱이 관례값(min × 0.4)으로 걸려 있다", seenOptions?.fallbackMinChars === expectedFloor,
    `fallbackMinChars=${seenOptions?.fallbackMinChars} (기대 ${expectedFloor})`);

  // Workers AI 는 JSON 을 코드펜스로 감싸 보내는 일이 잦다. 그걸 못 읽으면 폴백을 켠 의미가 없다.
  const body = {
    title: "지금의 일과 돈",
    openingLine: "가".repeat(200),
    innerState: "나".repeat(250),
    coreReading: "다".repeat(450),
    topicAdvice: "라".repeat(400),
    cautionPattern: "마".repeat(200),
    luckyAction: "바".repeat(160),
    evidenceLines: ["근거 하나", "근거 둘", "근거 셋"],
    followUpQuestions: ["다음 질문 하나?", "다음 질문 둘?", "다음 질문 셋?"],
  };
  const fenced = await generateGuardianFortuneWithRealLLM({
    input,
    context,
    env,
    providerCall: async () => ({ ok: true, text: "```json\n" + JSON.stringify(body) + "\n```", provider: "workers-ai", model: "@cf/zai-org/glm-4.7-flash" }),
    metricSink: () => {},
  });
  check("코드펜스로 감싼 Workers AI JSON 을 읽어 낸다", fenced.deliverable === true && fenced.usedFallback !== true,
    `deliverable=${fenced.deliverable} usedFallback=${fenced.usedFallback}`);
  check("Workers AI 응답도 분량 계약을 채운다",
    countGuardianFortuneVisibleTextLength(fenced.result || {}) >= GUARDIAN_FORTUNE_RESULT_LENGTH.min);
  console.log(`[fallback-ladder] Workers AI 허용 · 문턱 ${expectedFloor}자 · 코드펜스 응답 ${countGuardianFortuneVisibleTextLength(fenced.result || {})}자 전달`);
}

if (failures.length) {
  console.error(`\n[verify-fortune-chat-reading] FAIL (${failures.length})`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("\n[verify-fortune-chat-reading] PASS (mock only — 실제 모델 호출 없음)");
