#!/usr/bin/env node
/**
 * 초융합 운세 **실호출 실검증**(2단계 생성 Phase 4) — 🔴 이 레포에서 초융합 경로로 실제
 * Gemini 를 부르는 유일한 스크립트다.
 *
 * 왜 있는가: 나머지 `verify:fusion-fortune-*` 는 전부 `providerCall` 주입 mock 이라
 * "계약이 지켜지는가"만 본다. mock 은 목표 분량을 항상 채워 주므로 **실제 모델이 그룹당
 * 목표(4,200자 안팎)를 정말 채우는지는 mock 으로 알 수 없다.** 2단계 생성으로 바꾼 뒤
 * 30,000자 배달이 실제로 서는지는 실호출 한 번으로만 확인된다.
 *
 * 🔴 절대 규칙 1: 실호출은 `--live` 뒤에 두고 **사용자의 1회 한정 허락**을 받는다.
 *    플래그 없이 돌리면 호출 0으로 계획만 출력한다(예상 호출 수·모델·키 이름·판정 기준).
 *
 * 판정 기준(2026-09-06 인수인계 문서가 정한 것):
 *   ① 돌린 샘플 전부 최종 분량 ≥ FUSION_FORTUNE_LENGTH.total.min(30,000자)
 *   ② 강등(`qualityTier:"degraded"`) 0건 — 즉 전부 `full`
 *   ③ 단계당 벽시계 ≤ FUSION_GENERATION_DEADLINE_MS(120초)
 *   ④ 물타기 0 — `generationSource` 가 `gemini`(결정론 폴백이 섞이면 `gemini_partial`)
 *
 * 🔴 기본은 **대표 1건**이다(최소 9회 호출). 실호출 비용은 샘플 수에 그대로 비례하므로
 *    조합 전수는 mock 쪽(scripts/verify-fusion-fortune-delivery-floor.mjs 가 `[생시]×[장소]`
 *    4조합을 전개해 판정한다)에 맡기고, 여기서는 "모델이 목표 분량을 실제로 채우는가"만
 *    본다. 조합까지 실호출로 확인해야 할 이유가 생기면 `--samples=5` 로 늘린다(45회).
 *
 * 샘플 목록은 손으로 고른 배열이 아니라 `[생시 유무] × [장소 유무]` 4조합 전개 + 다른 입력축
 * 1건(음력·비KR 출생지·다른 주제)이고, 앞에서부터 `--samples` 개만 쓴다 — 미상 조합이 결제 후
 * 영구 실패했던 2026-09-03 사고가 이 축에서 나왔다.
 *
 * 컨텍스트는 stub 어댑터가 아니라 **실제 6개 계산기**로 세운다. 스위스 천체력 파일은
 * 프로덕션의 정적 자산(`/ephe/`)에서 읽는다(공개 GET, 과금 없음) — `--origin=` 으로 바꾼다.
 *
 * 사용:
 *   node scripts/verify-fusion-fortune-live.mjs                       계획만 출력(호출 0)
 *   node --env-file=.env.local scripts/verify-fusion-fortune-live.mjs --live   🔴 실호출(승인 필수)
 *
 * 🔴 키는 `--env-file` 로 넘긴다. 셸에서 `KEY=$(grep ...)` 로 뽑으면 .env 의 따옴표가 값에
 *    딸려 들어가 인증이 통째로 실패하는데, 그때도 결정론 폴백이 결과를 채워 주므로 화면에는
 *    "36,725자 full" 이 찍힌다 — 실호출이 한 번도 성사되지 않은 채로다(2026-09-06 실사고).
 *    그래서 아래에서 폴백이 섞이면 즉시 중단한다.
 */
import {
  buildFusionFortuneContext,
  callFusionGroupProvider,
  countFusionFortuneVisibleText,
  generateFusionFortuneWithRealLLM,
  FUSION_GENERATION_DEADLINE_MS,
} from "../worker/lib/fusion-fortune.js";
import { FUSION_FORTUNE_LENGTH, FUSION_SECTION_GROUP_SPECS } from "../worker/lib/fusion-fortune-prompt.js";
import { pickGeminiKeys, pickGeminiModels } from "../worker/lib/gemini.js";
import { createFusionLiveDump } from "./lib/fusion-live-dump.mjs";

const args = process.argv.slice(2);
const live = args.includes("--live");
const origin = (args.find((arg) => arg.startsWith("--origin=")) || "--origin=https://code-destiny.com/").slice(9);
const sampleCount = Math.min(5, Math.max(1, Number((args.find((arg) => arg.startsWith("--samples=")) || "--samples=1").slice(10)) || 1));
/**
 * 🔴 탈락 묶음의 **원문**을 남긴다. 실호출은 1회 한정 승인이라, 태운 호출의 응답을 안 남기면
 *    "왜 걸렸는지"(모델이 안 지킨 것인지 임계가 과한 것인지)를 재승인 없이는 다시 못 본다.
 *    덤프는 판정을 바꾸지 않는다 — provider 응답을 그대로 통과시키고 곁에 기록만 한다.
 */
const dumpArg = args.find((arg) => arg === "--dump" || arg.startsWith("--dump="));
const dump = dumpArg ? createFusionLiveDump({ dir: dumpArg.startsWith("--dump=") ? dumpArg.slice(7) : "" }) : null;

const SEOUL = { city: "서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" };
const TOKYO = { city: "도쿄", country: "JP", latitude: 35.6762, longitude: 139.6503, timezone: "Asia/Tokyo" };

const BASE_INPUT = {
  birthDate: "1995-04-18",
  birthTime: "08:30",
  calendarType: "solar",
  gender: "female",
  topic: "삶의 전반적인 흐름",
  concern: "올해 안에 방향을 정하고 싶은데 기준이 흔들립니다.",
  birthPlace: SEOUL,
};

/** 🔴 조합은 손으로 쓰지 않고 전개한다 — 그래야 한 조합도 빠지지 않는다. */
const ALL_SAMPLES = [true, false].flatMap((birthTimeKnown) => [true, false].map((birthPlaceKnown) => {
  const input = { ...BASE_INPUT };
  if (!birthTimeKnown) { input.birthTime = ""; input.birthTimeUnknown = true; }
  if (!birthPlaceKnown) delete input.birthPlace;
  return { label: `생시${birthTimeKnown ? "O" : "X"} 장소${birthPlaceKnown ? "O" : "X"}`, input };
}));
ALL_SAMPLES.push({
  // 다른 입력축 1건 — 음력·비KR 출생지·다른 주제·다른 성별. 프롬프트가 KR/양력 전제에
  // 기대고 있으면 여기서만 분량이 무너진다.
  label: "음력·도쿄·일과 돈",
  input: {
    birthDate: "1988-11-03",
    birthTime: "23:40",
    calendarType: "lunar",
    gender: "male",
    topic: "일과 돈의 흐름",
    concern: "이직과 정산 시점을 함께 보고 싶습니다.",
    birthPlace: TOKYO,
  },
});

const SAMPLES = ALL_SAMPLES.slice(0, sampleCount);

const STAGE_ONE_GROUPS = FUSION_SECTION_GROUP_SPECS.filter((group) => group.stage === 1);
const STAGE_TWO_GROUPS = FUSION_SECTION_GROUP_SPECS.filter((group) => group.stage === 2);
const KEY_NAME = pickGeminiKeys().find((name) => String(process.env[name] || "").trim());
/** 🔴 .env 를 셸에서 뽑아 넘기면 따옴표가 값에 남는다 — 그대로 보내면 401 이고, 폴백이 그걸 가린다. */
const KEY_VALUE = String(process.env[KEY_NAME] || "").trim().replace(/^["']|["']$/g, "");

const won = (value) => Number(value).toLocaleString("ko-KR");
/**
 * 그룹이 실제로 쓴 본문 분량. worker/lib/fusion-fortune.js 의 countFusionGroupChars 와 같은 셈이다.
 * 🔴 finalVerdict 의 본문은 `content` 가 아니라 `rationale` 이다 — 여기서 빠뜨리면 실호출 보고서가
 *    verdict 묶음을 실제보다 1,000자 넘게 짧게 적어, 워커가 왜 보완 물결을 돌렸는지 오독하게 된다.
 */
function groupChars(result, group) {
  return group.keys.reduce((sum, key) => {
    if (key === "finalVerdict") return sum + (typeof result?.finalVerdict?.rationale === "string" ? result.finalVerdict.rationale.length : 0);
    const value = result?.[key];
    if (typeof value === "string") return sum + value.length;
    if (value && typeof value === "object" && typeof value.content === "string") return sum + value.content.length;
    return sum;
  }, 0);
}

function printPlan() {
  const calls = SAMPLES.length * FUSION_SECTION_GROUP_SPECS.length;
  console.log("[fusion-live] 계획 (실호출 없음)");
  console.log(`  샘플 ${SAMPLES.length}건: ${SAMPLES.map((sample) => sample.label).join(" · ")}`);
  console.log(`  단계 1: ${STAGE_ONE_GROUPS.length}묶음 · 단계 2: ${STAGE_TWO_GROUPS.length}묶음 → 샘플당 최소 ${FUSION_SECTION_GROUP_SPECS.length}회 호출`);
  console.log(`  최소 실호출 ${calls}회 (미달·중복 그룹의 보완 물결이 붙으면 최대 ${calls * 2}회) — 전체 조합은 --samples=5`);
  console.log(`  모델: ${process.env.FUSION_FORTUNE_LLM_MODEL || pickGeminiModels()[0]} · 키: ${KEY_NAME || "🔴 없음 (GEMINIF_API_KEY 등)"}`);
  console.log(`  천체력 원본: ${origin}`);
  console.log(`  탈락 묶음 원문 덤프: ${dump ? dump.dir : "꺼짐 (--dump 로 켠다)"}`);
  console.log(`  판정: ${SAMPLES.length}건 모두 ≥${won(FUSION_FORTUNE_LENGTH.total.min)}자 · degraded 0 · 단계당 ≤${FUSION_GENERATION_DEADLINE_MS / 1000}초 · generationSource=gemini`);
  console.log("  실행하려면 --live 를 붙인다 — 🔴 사용자 승인이 먼저다(절대 규칙 1).");
}

if (!live) {
  printPlan();
  process.exit(0);
}

if (!KEY_NAME) {
  console.error(`[fusion-live] Gemini 키가 없습니다. ${pickGeminiKeys().join(" 또는 ")} 중 하나를 환경변수로 넘기세요.`);
  process.exit(2);
}

const ENV = {
  NODE_ENV: "staging",
  ENABLE_FUSION_FORTUNE_REAL_LLM: "true",
  ALLOW_FUSION_FORTUNE_REAL_LLM: "true",
  [KEY_NAME]: KEY_VALUE,
  ...(process.env.FUSION_FORTUNE_LLM_MODEL ? { FUSION_FORTUNE_LLM_MODEL: process.env.FUSION_FORTUNE_LLM_MODEL } : {}),
};

printPlan();
console.log(`\n[fusion-live] 시작 ${new Date().toISOString()}`);

const failures = [];
const rows = [];
let aborted = "";

for (const [index, sample] of SAMPLES.entries()) {
  const built = await buildFusionFortuneContext(sample.input, { requestUrl: origin });
  if (!built.ok) {
    failures.push(`[${sample.label}] 컨텍스트 실패 — ${built.errorCode}(${built.failedSystem})`);
    continue;
  }
  const context = built.context;
  const events = [];
  const common = {
    input: sample.input,
    context,
    env: ENV,
    requestId: `fusion-live-${index + 1}`,
    onStage: (event) => { events.push({ ...event, at: Date.now() }); },
    ...(dump ? { providerCall: dump.wrap(callFusionGroupProvider) } : {}),
  };
  dump?.beginSample({ index: index + 1, label: sample.label, context, input: sample.input });

  console.log(`\n[${index + 1}/${SAMPLES.length}] ${sample.label}`);
  const stageResults = [];
  let prior = null;
  let priorSource = "";
  for (const stage of [1, 2]) {
    const startedAt = Date.now();
    const groups = stage === 1 ? STAGE_ONE_GROUPS : STAGE_TWO_GROUPS;
    let outcome;
    try {
      outcome = await generateFusionFortuneWithRealLLM({ ...common, stage, priorResult: prior, priorGenerationSource: priorSource });
    } catch (error) {
      failures.push(`[${sample.label}] ${stage}단계 예외 — ${error?.code || error?.message || error}`);
      break;
    }
    const elapsedMs = Date.now() - startedAt;
    const repaired = events.filter((event) => event.phase === "repair" && event.stage === stage).map((event) => event.group);
    const chars = countFusionFortuneVisibleText(outcome.result);
    stageResults.push({ stage, outcome, elapsedMs, repaired, chars });
    prior = outcome.result;
    priorSource = outcome.generationSource;

    const detail = groups.map((group) => `${group.id} ${won(groupChars(outcome.result, group))}/${won(group.targetChars)}`).join(" · ");
    console.log(`  ${stage}단계 ${groups.length}묶음 · ${(elapsedMs / 1000).toFixed(1)}초 · 호출 ${outcome.providerCalls}회 · 보완 ${repaired.length}회 · ${outcome.generationSource} · 누적 ${won(chars)}자`);
    console.log(`    ${detail}`);
    if (elapsedMs > FUSION_GENERATION_DEADLINE_MS) failures.push(`[${sample.label}] ${stage}단계 ${(elapsedMs / 1000).toFixed(1)}초 — 예산 ${FUSION_GENERATION_DEADLINE_MS / 1000}초 초과`);
    if (outcome.generationSource !== "gemini") {
      failures.push(`[${sample.label}] ${stage}단계 물타기 — generationSource=${outcome.generationSource}`);
      // 🔴 폴백이 섞인 시점에서 이 스크립트가 답하려던 질문("모델이 목표 분량을 채우는가")은
      //    이미 답할 수 없다. 나머지 샘플까지 돌리면 실패한 호출만 더 태운다.
      // 🔴 두 원인을 섞지 말 것 — context_fallback 은 "호출 자체가 안 됐다"(키·모델 설정),
      //    gemini_partial 은 "호출은 됐는데 묶음이 검증에 걸렸다"(프롬프트 준수)로 다음 행동이 다르다.
      aborted = outcome.generationSource === "context_fallback"
        ? "실호출이 한 묶음도 성사되지 않았습니다 — 키·모델 설정을 먼저 확인하세요(폴백이 결과를 채워 화면상 분량은 정상으로 보입니다)."
        : "실호출은 됐지만 일부 묶음이 검증에 걸려 결정론 폴백으로 대체됐습니다 — 위 [fusion-fortune-llm-metric] 의 fallbackGroups 와 [fusion-fortune-group-failed] 의 issue 를 보세요.";
      break;
    }
  }
  if (aborted) break;

  const last = stageResults[stageResults.length - 1];
  if (!last || last.stage !== 2) continue;
  const tier = last.outcome.qualityTier;
  const issues = last.outcome.qualityIssues || [];
  console.log(`  최종 ${won(last.chars)}자 · 등급 ${tier}${issues.length ? ` · 사유 ${issues.join(",")}` : ""}`);
  if (last.chars < FUSION_FORTUNE_LENGTH.total.min) failures.push(`[${sample.label}] 최종 ${won(last.chars)}자 — 하한 ${won(FUSION_FORTUNE_LENGTH.total.min)}자 미달`);
  if (tier !== "full") failures.push(`[${sample.label}] 등급 ${tier} — 강등 사유 ${issues.join(",") || "(없음)"}`);
  rows.push({ label: sample.label, chars: last.chars, tier, seconds: stageResults.map((row) => (row.elapsedMs / 1000).toFixed(1)).join("+") });
}

console.log("\n[fusion-live] 요약");
for (const row of rows) console.log(`  ${row.label} — ${won(row.chars)}자 · ${row.tier} · ${row.seconds}초`);
console.log(`  측정일 ${new Date().toISOString().slice(0, 10)} · 재현: node scripts/verify-fusion-fortune-live.mjs --live`);

if (dump) {
  const dumped = await dump.finish({ command: `node --env-file=.env.local scripts/verify-fusion-fortune-live.mjs --live --dump` });
  console.log(`\n[fusion-live] 덤프 ${dumped.records.length}회 → ${dumped.dir}`);
  for (const record of dumped.failed || []) {
    const worst = record.keys.filter((key) => key.minChars !== null).sort((a, b) => (a.shortfall ?? 0) - (b.shortfall ?? 0))[0];
    console.log(`  탈락 ${record.group} ${record.waveLabel} — ${record.verdict?.detail ? `${record.verdict.issue}(${record.verdict.detail})` : record.verdict?.issue}${worst ? ` · ${worst.key} ${worst.chars}/${worst.minChars}자 kp${worst.keyPoints ?? "-"}` : ""} → ${record.name}.txt`);
  }
}

if (failures.length) {
  console.error("\n[fusion-live] FAIL");
  if (aborted) console.error(`  🔴 중단 — ${aborted}`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`\nPASS verify:fusion-fortune-live — ${rows.length}건 모두 ≥${won(FUSION_FORTUNE_LENGTH.total.min)}자 · 강등 0 · 단계당 ${FUSION_GENERATION_DEADLINE_MS / 1000}초 안 · 물타기 0`);
